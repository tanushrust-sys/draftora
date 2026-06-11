export type ChatTab = 'chats' | 'friends';

export type ChatProfileSnippet = {
  id: string;
  username: string;
  email: string;
  title?: string | null;
  level?: number | null;
};

export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export type FriendRequestItem = {
  id: string;
  requesterId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string;
  updatedAt: string;
  requester: ChatProfileSnippet;
  receiver: ChatProfileSnippet;
};

export type FriendSummary = ChatProfileSnippet & {
  friendshipId: string;
  createdAt: string;
};

export type ChatMessageStatus = 'allowed' | 'blocked' | 'reported';

export type ChatMessage = {
  id: string;
  senderId: string;
  receiverId: string;
  messageText: string;
  replyToMessageId: string | null;
  createdAt: string;
  isDeleted: boolean;
  moderationStatus: ChatMessageStatus;
  reportCount: number;
  readAt: string | null;
  sender: ChatProfileSnippet;
  receiver: ChatProfileSnippet;
  replyTo?: {
    id: string;
    messageText: string;
    senderId: string;
    senderName: string;
  } | null;
};

export type ConversationSummary = {
  friend: FriendSummary;
  lastMessage: ChatMessage | null;
  unreadCount: number;
  updatedAt: string;
};

export type ChatSummaryCounts = {
  unreadMessages: number;
  unreadChats: number;
  pendingRequests: number;
  totalBadge: number;
};

export type FriendSearchResult = {
  profile: ChatProfileSnippet;
  status: 'addable' | 'self' | 'pending_outgoing' | 'pending_incoming' | 'friends';
  requestId?: string | null;
};

export type FriendSearchSuggestion = FriendSearchResult;

export type ChatDashboardPayload = {
  counts: ChatSummaryCounts;
  conversations: ConversationSummary[];
  friends: FriendSummary[];
  incomingRequests: FriendRequestItem[];
  outgoingRequests: FriendRequestItem[];
  initialFriendId: string | null;
  initialMessages: ChatMessage[];
};

export type ChatSendMessagePayload = {
  message: ChatMessage;
  moderationWarning?: string | null;
};
