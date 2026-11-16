/**
 * Real backend: talks to the TunnelWeb host (server/hub.js) over a WebSocket.
 * The host keeps a user directory and call membership, routes JSON events between
 * users, and relays binary call media. Files go over HTTP (/api/files/:id).
 * Guests reach the host through the p2p-tunnel, so every URL here is same-origin.
 */
import { media } from '$lib/media/engine.svelte';
import type { Call, Conversation, ConversationMeta, FileTransfer, User } from '$lib/types';
import { emit } from './bus';
import type { Backend } from './types';

/** Routed event shapes; the host adds `from`. */
type Routed =
  | { type: 'message'; conversation: ConversationMeta; message: import('$lib/types').Message }
  | { type: 'typing'; conversationId: string; typing: boolean }
  | { type: 'conversation'; conversation: ConversationMeta }
  | { type: 'left'; conversationId: string }
  | { type: 'fileOffer'; conversation: ConversationMeta; transfer: FileTransfer }
  | { type: 'fileResponse'; transferId: string; accepted: boolean }
  | { type: 'callInvite'; callId: string; media: 'audio' | 'video'; conversation: ConversationMeta }
  | { type: 'callDecline'; callId: string }
  | { type: 'speaking'; callId: string; speaking: boolean };

type ServerMsg =
  | { type: 'welcome'; users: User[] }
  | { type: 'presence'; user: User }
  | { type: 'callMembers'; callId: string; members: string[] }
  | (Routed & { from: string });

const decoder = new TextDecoder();

export function createLiveBackend(): Backend {
  let me: User | null = null;
  let ws: WebSocket | null = null;
  let retry = 0;
  let currentCall: string | null = null;
  const queue: string[] = [];
  const aborts = new Map<string, () => void>();

  const meta = (c: Conversation): ConversationMeta => ({
    id: c.id,
    kind: c.kind,
    name: c.name,
    memberIds: [me!.id, ...c.participantIds],
  });

  function raw(obj: unknown) {
    const text = JSON.stringify(obj);
    if (ws?.readyState === WebSocket.OPEN) ws.send(text);
    else queue.push(text);
  }
  const route = (to: string[], event: Routed) => to.length && raw({ type: 'route', to, event });

  function open() {
    emit('connection', { state: 'connecting' });
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.binaryType = 'arraybuffer';

    ws.onopen = () => {
      retry = 0;
      ws!.send(JSON.stringify({ type: 'hello', user: me }));
      if (currentCall) ws!.send(JSON.stringify({ type: 'call', action: 'join', callId: currentCall }));
      queue.splice(0).forEach((t) => ws!.send(t));
      emit('connection', { state: 'online' });
    };
    ws.onclose = () => {
      emit('connection', { state: 'offline' });
      setTimeout(open, Math.min(10_000, 500 * 2 ** retry++));
    };
    ws.onmessage = (e) => {
      if (typeof e.data !== 'string') {
        // [idLen][senderId][media frame]
        const b = new Uint8Array(e.data as ArrayBuffer);
        const from = decoder.decode(b.subarray(1, 1 + b[0]));
        media.receive(from, b.subarray(1 + b[0]));
        return;
      }
      handle(JSON.parse(e.data) as ServerMsg);
    };
  }

  function handle(msg: ServerMsg) {
    switch (msg.type) {
      case 'welcome':
        return emit('users', { users: msg.users.filter((u) => u.id !== me?.id) });
      case 'presence':
        if (msg.user.id !== me?.id) emit('presence', { user: msg.user });
        return;
      case 'callMembers':
        media.refresh(); // someone joined/left: make sure everyone has a fresh keyframe
        return emit('callMembers', { callId: msg.callId, members: msg.members });
      case 'message':
        // Never trust the claimed sender; the host stamps `from`.
        return emit('message', { conversation: msg.conversation, message: { ...msg.message, senderId: msg.from } });
      case 'typing':
        return emit('typing', { conversationId: msg.conversationId, userId: msg.from, typing: msg.typing });
      case 'conversation':
        return emit('conversation', { conversation: msg.conversation, by: msg.from });
      case 'left':
        return emit('left', { conversationId: msg.conversationId, userId: msg.from });
      case 'fileOffer':
        return emit('fileOffer', {
          conversation: msg.conversation,
          transfer: { ...msg.transfer, senderId: msg.from, state: 'pending', progress: 0, url: undefined },
        });
      case 'fileResponse':
        return emit('fileResponse', { transferId: msg.transferId, userId: msg.from, accepted: msg.accepted });
      case 'callInvite':
        return emit('incomingCall', {
          callId: msg.callId,
          conversationId: msg.conversation.id,
          conversation: msg.conversation,
          fromId: msg.from,
          media: msg.media,
        });
      case 'callDecline':
        return emit('callDeclined', { callId: msg.callId, userId: msg.from });
      case 'speaking':
        return emit('speaking', { callId: msg.callId, userId: msg.from, speaking: msg.speaking });
    }
  }

  media.setTransport((bytes) => {
    // Drop frames rather than queue them when the link is congested.
    if (ws?.readyState === WebSocket.OPEN && ws.bufferedAmount < 1_000_000) ws.send(bytes);
  });

  function upload(t: FileTransfer, file: File) {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/files/${encodeURIComponent(t.id)}`);
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    xhr.upload.onprogress = (e) =>
      e.lengthComputable && emit('fileProgress', { id: t.id, progress: e.loaded / e.total, state: 'transferring' });
    xhr.onload = () =>
      emit('fileProgress', xhr.status < 300 ? { id: t.id, progress: 1, state: 'done' } : { id: t.id, progress: 0, state: 'cancelled' });
    xhr.onerror = () => emit('fileProgress', { id: t.id, progress: 0, state: 'cancelled' });
    xhr.send(file);
    aborts.set(t.id, () => xhr.abort());
  }

  async function download(t: FileTransfer) {
    const ctrl = new AbortController();
    aborts.set(t.id, () => ctrl.abort());
    emit('fileProgress', { id: t.id, progress: 0, state: 'transferring' });
    try {
      // The sender may still be uploading; wait for the host to have it.
      let res: Response;
      for (let i = 0; ; i++) {
        res = await fetch(`/api/files/${encodeURIComponent(t.id)}`, { signal: ctrl.signal });
        if (res.ok || i > 120) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader();
      const parts: Uint8Array[] = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parts.push(value);
        got += value.byteLength;
        emit('fileProgress', { id: t.id, progress: t.size ? got / t.size : 0, state: 'transferring' });
      }
      const url = URL.createObjectURL(new Blob(parts as BlobPart[]));
      emit('fileProgress', { id: t.id, progress: 1, state: 'done', url });
    } catch {
      emit('fileProgress', { id: t.id, progress: 0, state: 'cancelled' });
    } finally {
      aborts.delete(t.id);
    }
  }

  return {
    async invite() {
      const info = await fetch('/api/info').then((r) => r.json()).catch(() => null);
      return info?.invite ?? null;
    },

    connect(user) {
      me = { ...user };
      if (!ws) open();
    },

    updateProfile(user) {
      me = { ...user };
      raw({ type: 'profile', user: me });
    },

    sendMessage(conversation, message) {
      route(conversation.participantIds, { type: 'message', conversation: meta(conversation), message });
    },

    sendTyping(conversation, typing) {
      route(conversation.participantIds, { type: 'typing', conversationId: conversation.id, typing });
    },

    syncConversation(conversation) {
      route(conversation.participantIds, { type: 'conversation', conversation: meta(conversation) });
    },

    leaveConversation(conversation) {
      route(conversation.participantIds, { type: 'left', conversationId: conversation.id });
    },

    sendFile(conversation, transfer, file) {
      const { url: _url, ...offer } = transfer;
      route(conversation.participantIds, { type: 'fileOffer', conversation: meta(conversation), transfer: offer });
      upload(transfer, file);
    },

    acceptFile(transfer) {
      route([transfer.senderId], { type: 'fileResponse', transferId: transfer.id, accepted: true });
      download(transfer);
    },

    declineFile(transfer) {
      route([transfer.senderId], { type: 'fileResponse', transferId: transfer.id, accepted: false });
    },

    cancelFile(transfer) {
      aborts.get(transfer.id)?.();
      aborts.delete(transfer.id);
    },

    placeCall(call, conversation) {
      currentCall = call.id;
      raw({ type: 'call', action: 'join', callId: call.id });
      route(conversation.participantIds, {
        type: 'callInvite',
        callId: call.id,
        media: call.media,
        conversation: meta(conversation),
      });
    },

    joinCall(call) {
      currentCall = call.id;
      raw({ type: 'call', action: 'join', callId: call.id });
    },

    leaveCall(call) {
      if (currentCall === call.id) currentCall = null;
      raw({ type: 'call', action: 'leave', callId: call.id });
    },

    declineCall(incoming) {
      route([incoming.fromId], { type: 'callDecline', callId: incoming.callId });
    },

    inviteToCall(call, conversation, userIds) {
      route(userIds, { type: 'callInvite', callId: call.id, media: call.media, conversation: meta(conversation) });
    },

    sendSpeaking(call, speaking) {
      route(call.participantIds, { type: 'speaking', callId: call.id, speaking });
    },
  };
}
