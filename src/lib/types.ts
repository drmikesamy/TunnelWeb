export type Status = 'online' | 'busy' | 'away' | 'brb' | 'phone' | 'lunch' | 'offline';

export interface ChatFont {
  family: string; // key into CHAT_FONTS
  size: number; // px
  color: string;
  bold: boolean;
  italic: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  status: Status;
  personalMessage: string;
  hue: number; // avatar colour
  font: ChatFont;
  group: string;
}

export type MessageKind = 'text' | 'nudge' | 'file' | 'system' | 'call';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  kind: MessageKind;
  text?: string;
  font?: ChatFont;
  fileTransferId?: string;
  sentAt: number;
}

export type TransferState = 'pending' | 'transferring' | 'done' | 'declined' | 'cancelled';

export interface FileTransfer {
  id: string;
  conversationId: string;
  senderId: string;
  fileName: string;
  size: number; // bytes
  progress: number; // 0..1
  state: TransferState;
  url?: string; // object URL once a received file has downloaded
}

export interface Conversation {
  id: string;
  kind: 'direct' | 'room';
  name?: string; // rooms only
  participantIds: string[]; // excludes the current user
  messages: Message[];
  typingIds: string[];
  unread: number;
  nudgeCount: number; // bumps on every received nudge, used to shake the window
}

export type CallMedia = 'audio' | 'video';
export type CallState = 'outgoing' | 'active' | 'ended';

export interface Call {
  id: string;
  conversationId: string;
  media: CallMedia;
  participantIds: string[]; // remote participants
  state: CallState;
  startedAt?: number;
  muted: boolean;
  cameraOn: boolean;
  sharing: boolean;
  speakingId: string | null;
}

export interface IncomingCall {
  callId: string;
  conversationId: string;
  fromId: string;
  media: CallMedia;
}

/** What a peer needs to know to recreate a conversation on their side. */
export interface ConversationMeta {
  id: string;
  kind: 'direct' | 'room';
  name?: string;
  memberIds: string[]; // includes the sender
}

export type ConnectionState = 'connecting' | 'online' | 'offline';
