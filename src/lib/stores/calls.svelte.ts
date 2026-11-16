import { backend } from '$lib/backend';
import { on } from '$lib/backend/bus';
import { media } from '$lib/media/engine.svelte';
import { formatDuration, uid } from '$lib/format';
import type { Call, CallMedia, IncomingCall } from '$lib/types';
import { contacts } from './contacts.svelte';
import { conversations } from './conversations.svelte';
import { session } from './session.svelte';
import { windows } from './windows.svelte';

const RING_TIMEOUT_MS = 30_000;

class CallStore {
  active = $state<Call | null>(null);
  incoming = $state<IncomingCall | null>(null);
  #ringTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // The host tells everyone in a call who's in it.
    on('callMembers', ({ callId, members }) => {
      const call = this.active;
      if (call?.id !== callId) return;
      const others = members.filter((m) => m !== session.me.id);
      if (call.state === 'active' && others.length === 0) return this.hangup('Everyone else left the call.');
      call.participantIds = others;
      if (call.state === 'outgoing' && others.length) this.#connected();
    });

    on('speaking', ({ callId, userId, speaking }) => {
      const call = this.active;
      if (call?.id !== callId) return;
      if (speaking) call.speakingId = userId === session.me.id && call.muted ? null : userId;
      else if (call.speakingId === userId) call.speakingId = null;
    });

    on('incomingCall', (inc) => {
      if (this.active?.id === inc.callId) return; // already in it
      if (this.active || this.incoming) {
        backend.declineCall(inc); // busy
        return;
      }
      const { conversation, ...incoming } = inc;
      // Make sure the conversation exists so the call has somewhere to log.
      if (conversation) conversations.adopt(conversation);
      this.incoming = incoming;
    });

    on('callDeclined', ({ callId, userId }) => {
      const call = this.active;
      if (call?.id !== callId) return;
      const who = contacts.get(userId)?.name ?? 'Someone';
      conversations.log(call.conversationId, `${who} declined the call.`, 'call');
      // A 1:1 call that's declined is over.
      if (call.state === 'outgoing' && call.participantIds.length <= 1) this.hangup();
    });

    // Your own mic level drives your speaking ring and tells the others.
    media.onSpeaking = (speaking) => {
      const call = this.active;
      if (!call) return;
      if (speaking && !call.muted) call.speakingId = session.me.id;
      else if (call.speakingId === session.me.id) call.speakingId = null;
      backend.sendSpeaking($state.snapshot(call), speaking && !call.muted);
    };
  }

  start(conversationId: string, mediaKind: CallMedia) {
    const conv = conversations.get(conversationId);
    if (!conv) return;
    if (this.active) this.hangup();
    const call = this.#create(uid('call'), conversationId, mediaKind, [...conv.participantIds], 'outgoing');
    conversations.log(conversationId, `${mediaKind === 'video' ? 'Video' : 'Voice'} call started.`, 'call');
    backend.placeCall($state.snapshot(call), conv);
    this.#ringTimer = setTimeout(() => {
      if (this.active?.id === call.id && call.state === 'outgoing') this.hangup('No answer.');
    }, RING_TIMEOUT_MS);
  }

  accept() {
    const inc = this.incoming;
    if (!inc) return;
    this.incoming = null;
    if (this.active) this.hangup();
    const conv = conversations.get(inc.conversationId);
    const participants = conv ? [...conv.participantIds] : [inc.fromId];
    const call = this.#create(inc.callId, inc.conversationId, inc.media, participants, 'active');
    call.startedAt = Date.now();
    conversations.log(inc.conversationId, `You answered a ${inc.media === 'video' ? 'video' : 'voice'} call.`, 'call');
    backend.joinCall($state.snapshot(call));
  }

  decline() {
    const inc = this.incoming;
    if (!inc) return;
    this.incoming = null;
    backend.declineCall(inc);
    const caller = contacts.get(inc.fromId);
    conversations.log(inc.conversationId, `You declined a call from ${caller?.name ?? 'someone'}.`, 'call');
  }

  hangup(reason?: string) {
    const call = this.active;
    if (!call) return;
    if (this.#ringTimer) clearTimeout(this.#ringTimer);
    backend.leaveCall($state.snapshot(call));
    media.stop();
    const duration = call.startedAt ? formatDuration(Date.now() - call.startedAt) : null;
    const line = duration ? `Call ended · ${duration}` : 'Call cancelled.';
    conversations.log(call.conversationId, reason ? `${line} ${reason}` : line, 'call');
    windows.close(`call:${call.id}`);
    this.active = null;
  }

  toggleMute() {
    if (!this.active) return;
    this.active.muted = !this.active.muted;
    media.setMuted(this.active.muted);
  }

  /** Turning the camera on during a voice call upgrades it to video. */
  toggleCamera() {
    if (!this.active) return;
    this.active.cameraOn = !this.active.cameraOn;
    if (this.active.cameraOn) this.active.media = 'video';
    media.setCamera(this.active.cameraOn);
  }

  toggleShare() {
    if (this.active) this.active.sharing = !this.active.sharing;
  }

  addParticipant(userId: string) {
    const call = this.active;
    if (!call || call.participantIds.includes(userId)) return;
    // Inviting into a 1:1 chat creates a group chat; the call follows it.
    call.conversationId = conversations.invite(call.conversationId, [userId], false);
    const conv = conversations.get(call.conversationId);
    if (conv) backend.inviteToCall($state.snapshot(call), conv, [userId]);
  }

  #connected() {
    const call = this.active;
    if (!call) return;
    if (this.#ringTimer) clearTimeout(this.#ringTimer);
    call.state = 'active';
    call.startedAt = Date.now();
  }

  #create(id: string, conversationId: string, mediaKind: CallMedia, participantIds: string[], state: Call['state']) {
    this.active = {
      id,
      conversationId,
      media: mediaKind,
      participantIds,
      state,
      muted: false,
      cameraOn: mediaKind === 'video',
      sharing: false,
      speakingId: null,
    };
    windows.open('call', id, { x: 120, y: 60 });
    media.start({ audio: true, video: mediaKind === 'video' });
    return this.active;
  }
}

export const calls = new CallStore();
