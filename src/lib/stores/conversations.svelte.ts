import { backend } from '$lib/backend';
import { on } from '$lib/backend/bus';
import { notify } from '$lib/notify';
import { directId, uid } from '$lib/format';
import type { Conversation, ConversationMeta, FileTransfer, Message } from '$lib/types';
import { contacts } from './contacts.svelte';
import { session } from './session.svelte';
import { windows } from './windows.svelte';

const TYPING_IDLE_MS = 2500;
const TYPING_STALE_MS = 6000;

class ConversationStore {
  list = $state<Conversation[]>([]);
  transfers = $state<Record<string, FileTransfer>>({});

  #outgoingTyping = new Map<string, ReturnType<typeof setTimeout>>();
  #incomingTyping = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    on('message', ({ message, conversation }) => {
      if (conversation) this.#upsert(conversation);
      this.#receive(message);
    });

    on('typing', ({ conversationId, userId, typing }) => this.#setTyping(conversationId, userId, typing));

    on('conversation', ({ conversation, by }) => {
      const isNew = !this.get(conversation.id);
      this.#upsert(conversation);
      if (isNew && conversation.kind === 'room') {
        this.#system(conversation.id, `${contacts.get(by)?.name ?? 'Someone'} added you to ${conversation.name ?? 'a chatroom'}.`);
        windows.openInBackground('conversation', conversation.id);
      }
    });

    on('left', ({ conversationId, userId }) => {
      const c = this.get(conversationId);
      if (!c) return;
      c.participantIds = c.participantIds.filter((id) => id !== userId);
      this.#system(conversationId, `${contacts.get(userId)?.name ?? 'Someone'} left the conversation.`);
    });

    on('fileOffer', ({ transfer, conversation }) => {
      if (conversation) this.#upsert(conversation);
      this.transfers[transfer.id] = transfer;
      this.#receive({
        id: uid('msg'),
        conversationId: transfer.conversationId,
        senderId: transfer.senderId,
        kind: 'file',
        fileTransferId: transfer.id,
        sentAt: Date.now(),
      });
    });

    on('fileProgress', ({ id, progress, state, url }) => {
      const t = this.transfers[id];
      if (!t || t.state === 'cancelled' || t.state === 'declined') return;
      Object.assign(t, { progress, state }, url ? { url } : {});
    });

    on('fileResponse', ({ transferId, userId, accepted }) => {
      const t = this.transfers[transferId];
      if (!t) return;
      const who = contacts.get(userId)?.name ?? 'Someone';
      this.#system(t.conversationId, `${who} ${accepted ? 'accepted' : 'declined'} “${t.fileName}”.`);
    });
  }

  get(id: string) {
    return this.list.find((c) => c.id === id);
  }

  get rooms() {
    return this.list.filter((c) => c.kind === 'room');
  }

  title(c: Conversation): string {
    if (c.kind === 'room') return c.name ?? 'Chatroom';
    return contacts.get(c.participantIds[0])?.name ?? 'Conversation';
  }

  // ---- opening ------------------------------------------------------------

  open(id: string) {
    const c = this.get(id);
    if (!c) return;
    c.unread = 0;
    windows.open('conversation', id);
  }

  /** Finds or creates the 1:1 conversation with a contact (without opening it). */
  ensureDirect(contactId: string): string {
    const id = directId(session.me.id, contactId);
    if (!this.get(id)) this.list.push(this.#blank(id, 'direct', [contactId]));
    return id;
  }

  openDirect(contactId: string) {
    const id = this.ensureDirect(contactId);
    this.open(id);
    return id;
  }

  createRoom(name: string, participantIds: string[]) {
    const id = uid('room');
    const room = this.#blank(id, 'room', participantIds, name.trim() || 'New chatroom');
    this.list.push(room);
    this.#system(id, `${session.me.name} created the chatroom.`);
    backend.syncConversation(this.get(id)!);
    this.open(id);
    return id;
  }

  /**
   * Inviting someone into a 1:1 chat turns it into a new group chat.
   * `foreground: false` keeps the current window on top (e.g. inviting from a call).
   */
  invite(id: string, userIds: string[], foreground = true) {
    const c = this.get(id);
    if (!c) return id;
    const fresh = userIds.filter((u) => !c.participantIds.includes(u));
    if (!fresh.length) return id;

    let target = c;
    if (c.kind === 'direct') {
      // Direct ids are derived from the two people, so a group needs its own id.
      const members = [...c.participantIds, ...fresh];
      const name = contacts.getMany([session.me.id, ...members]).map((u) => u.name.split(' ')[0]).join(', ');
      this.list.push(this.#blank(uid('room'), 'room', members, name));
      target = this.list[this.list.length - 1];
      this.#system(target.id, `Group chat started from your conversation with ${this.title(c)}.`);
      if (foreground) windows.open('conversation', target.id);
      else windows.openInBackground('conversation', target.id);
    } else {
      c.participantIds.push(...fresh);
    }
    this.#system(target.id, `${contacts.getMany(fresh).map((u) => u.name).join(', ')} joined the conversation.`);
    backend.syncConversation(target);
    return target.id;
  }

  leave(id: string) {
    const c = this.get(id);
    if (!c) return;
    backend.leaveConversation(c);
    this.list = this.list.filter((x) => x.id !== id);
    windows.close(`conversation:${id}`);
  }

  // ---- sending ------------------------------------------------------------

  send(id: string, text: string) {
    const c = this.get(id);
    if (!c || !text.trim()) return;
    this.#stopTyping(id);
    const msg: Message = {
      id: uid('msg'),
      conversationId: id,
      senderId: session.me.id,
      kind: 'text',
      text: text.trim(),
      font: { ...session.me.font },
      sentAt: Date.now(),
    };
    c.messages.push(msg);
    backend.sendMessage(c, msg, contacts.getMany(c.participantIds));
  }

  nudge(id: string) {
    const c = this.get(id);
    if (!c) return;
    const msg: Message = { id: uid('msg'), conversationId: id, senderId: session.me.id, kind: 'nudge', sentAt: Date.now() };
    c.messages.push(msg);
    c.nudgeCount++; // the sender's window shakes too
    backend.sendMessage(c, msg, contacts.getMany(c.participantIds));
  }

  /** Call on every keystroke; tells others you're typing and stops after a pause. */
  typing(id: string) {
    const c = this.get(id);
    if (!c) return;
    if (!this.#outgoingTyping.has(id)) backend.sendTyping(c, true);
    clearTimeout(this.#outgoingTyping.get(id));
    this.#outgoingTyping.set(id, setTimeout(() => this.#stopTyping(id), TYPING_IDLE_MS));
  }

  sendFiles(id: string, files: File[]) {
    const c = this.get(id);
    if (!c) return;
    for (const file of files) {
      const t: FileTransfer = {
        id: uid('file'),
        conversationId: id,
        senderId: session.me.id,
        fileName: file.name,
        size: file.size,
        progress: 0,
        state: 'pending',
      };
      this.transfers[t.id] = t;
      c.messages.push({ id: uid('msg'), conversationId: id, senderId: session.me.id, kind: 'file', fileTransferId: t.id, sentAt: Date.now() });
      backend.sendFile(c, t, file);
    }
  }

  acceptFile(transferId: string) {
    const t = this.transfers[transferId];
    if (!t) return;
    t.state = 'transferring';
    backend.acceptFile($state.snapshot(t));
  }

  declineFile(transferId: string) {
    const t = this.transfers[transferId];
    if (!t) return;
    t.state = 'declined';
    backend.declineFile($state.snapshot(t));
  }

  cancelFile(transferId: string) {
    const t = this.transfers[transferId];
    if (!t) return;
    t.state = 'cancelled';
    backend.cancelFile($state.snapshot(t));
  }

  /** Adds a system or call line to the conversation. */
  log(id: string, text: string, kind: 'system' | 'call' = 'system') {
    this.#system(id, text, kind);
  }

  // ---- internals ----------------------------------------------------------

  #blank(id: string, kind: Conversation['kind'], participantIds: string[], name?: string): Conversation {
    return { id, kind, name, participantIds, messages: [], typingIds: [], unread: 0, nudgeCount: 0 };
  }

  /** Create or update a conversation from what a peer sent us. */
  adopt(meta: ConversationMeta) {
    this.#upsert(meta);
  }

  #upsert(meta: ConversationMeta) {
    const participantIds = meta.memberIds.filter((m) => m !== session.me.id);
    const c = this.get(meta.id);
    if (!c) {
      this.list.push(this.#blank(meta.id, meta.kind, participantIds, meta.name));
      return;
    }
    if (meta.kind === 'room') {
      c.name = meta.name ?? c.name;
      c.participantIds = participantIds;
    }
  }

  #stopTyping(id: string) {
    clearTimeout(this.#outgoingTyping.get(id));
    if (!this.#outgoingTyping.delete(id)) return;
    const c = this.get(id);
    if (c) backend.sendTyping(c, false);
  }

  #setTyping(conversationId: string, userId: string, typing: boolean) {
    const c = this.get(conversationId);
    if (!c) return;
    const key = `${conversationId}|${userId}`;
    clearTimeout(this.#incomingTyping.get(key));
    if (typing) {
      if (!c.typingIds.includes(userId)) c.typingIds.push(userId);
      // In case the "stopped typing" event never arrives.
      this.#incomingTyping.set(key, setTimeout(() => this.#setTyping(conversationId, userId, false), TYPING_STALE_MS));
    } else {
      c.typingIds = c.typingIds.filter((id) => id !== userId);
    }
  }

  #system(id: string, text: string, kind: 'system' | 'call' = 'system') {
    this.get(id)?.messages.push({ id: uid('msg'), conversationId: id, senderId: session.me.id, kind, text, sentAt: Date.now() });
  }

  #receive(m: Message) {
    const c = this.get(m.conversationId);
    if (!c) return;
    this.#setTyping(c.id, m.senderId, false);
    c.messages.push(m);
    if (m.kind === 'nudge') c.nudgeCount++;

    const winId = `conversation:${c.id}`;
    if (windows.focusedId !== winId) {
      c.unread++;
      const sender = contacts.get(m.senderId);
      const preview = m.kind === 'text' ? m.text : m.kind === 'nudge' ? 'sent you a nudge!' : 'wants to send you a file';
      notify.info(`${sender?.name ?? 'Someone'} says:`, preview, () => this.open(c.id));
    }
    // Like the original app, an incoming message pops the conversation open.
    if (!windows.isOpen('conversation', c.id)) windows.openInBackground('conversation', c.id);
  }
}

export const conversations = new ConversationStore();
