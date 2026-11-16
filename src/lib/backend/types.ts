import type {
  Call,
  ConnectionState,
  Conversation,
  ConversationMeta,
  FileTransfer,
  IncomingCall,
  Message,
  TransferState,
  User,
} from '$lib/types';

/** Events a backend pushes to the stores (see bus.ts). */
export interface BackendEvents {
  connection: { state: ConnectionState };
  users: { users: User[] }; // full directory (live: on connect)
  presence: { user: Partial<User> & { id: string } };
  conversation: { conversation: ConversationMeta; by: string };
  left: { conversationId: string; userId: string };
  message: { message: Message; conversation?: ConversationMeta };
  typing: { conversationId: string; userId: string; typing: boolean };
  fileOffer: { transfer: FileTransfer; conversation?: ConversationMeta };
  fileProgress: { id: string; progress: number; state: TransferState; url?: string };
  fileResponse: { transferId: string; userId: string; accepted: boolean };
  incomingCall: IncomingCall & { conversation?: ConversationMeta };
  callDeclined: { callId: string; userId: string };
  callMembers: { callId: string; members: string[] };
  speaking: { callId: string; userId: string; speaking: boolean };
}

/**
 * Everything the UI can ask of "the server". Implemented by live.ts; keeping it
 * an interface means stores never depend on the transport directly.
 */
export interface Backend {
  /** `npx tunnelweb join …` command, once the tunnel is up. */
  invite(): Promise<string | null>;

  connect(me: User): void;
  updateProfile(me: User): void;

  sendMessage(conversation: Conversation, message: Message, participants: User[]): void;
  sendTyping(conversation: Conversation, typing: boolean): void;
  syncConversation(conversation: Conversation): void; // room created / people invited
  leaveConversation(conversation: Conversation): void;

  sendFile(conversation: Conversation, transfer: FileTransfer, file: File): void;
  acceptFile(transfer: FileTransfer): void;
  declineFile(transfer: FileTransfer): void;
  cancelFile(transfer: FileTransfer): void;

  placeCall(call: Call, conversation: Conversation): void;
  joinCall(call: Call): void;
  leaveCall(call: Call): void;
  declineCall(incoming: IncomingCall): void;
  inviteToCall(call: Call, conversation: Conversation, userIds: string[]): void;
  sendSpeaking(call: Call, speaking: boolean): void;
}
