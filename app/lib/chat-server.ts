import { adminSupabase } from '@/app/lib/server-auth';
import type {
  ChatDashboardPayload,
  ChatMessage,
  ChatProfileSnippet,
  ChatSummaryCounts,
  ConversationSummary,
  FriendRequestItem,
  FriendSummary,
} from '@/app/lib/chatTypes';

type ProfileRow = {
  id: string;
  username: string;
  email: string;
  title: string;
  level: number;
  account_type: string;
  deleted_at?: string | null;
};

type FriendshipRow = {
  id: string;
  user_1_id: string;
  user_2_id: string;
  created_at: string;
};

type FriendRequestRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  updated_at: string;
};

type ChatMessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message_text: string;
  reply_to_message_id: string | null;
  created_at: string;
  is_deleted: boolean;
  moderation_status: 'allowed' | 'blocked' | 'reported';
  report_count: number;
  read_at: string | null;
};

function toProfileSnippet(profile: ProfileRow): ChatProfileSnippet {
  return {
    id: profile.id,
    username: profile.username,
    email: profile.email,
    title: profile.title,
    level: profile.level,
  };
}

export function normalizeFriendshipPair(a: string, b: string) {
  return a < b ? { user1: a, user2: b } : { user1: b, user2: a };
}

export async function getProfilesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, ProfileRow>();

  const { data, error } = await adminSupabase
    .from('profiles')
    .select('id, username, email, title, level, account_type, deleted_at')
    .in('id', ids);

  if (error) throw new Error(error.message || 'Could not load profiles.');
  return new Map((data ?? []).map((profile) => [profile.id, profile as ProfileRow]));
}

export async function getFriendshipsForUser(userId: string) {
  const { data, error } = await adminSupabase
    .from('friendships')
    .select('id, user_1_id, user_2_id, created_at')
    .or(`user_1_id.eq.${userId},user_2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Could not load friends.');
  return (data ?? []) as FriendshipRow[];
}

export async function getFriendRequestsForUser(userId: string) {
  const { data, error } = await adminSupabase
    .from('friend_requests')
    .select('id, requester_id, receiver_id, status, created_at, updated_at')
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message || 'Could not load friend requests.');
  return (data ?? []) as FriendRequestRow[];
}

function getOtherFriendId(friendship: FriendshipRow, userId: string) {
  return friendship.user_1_id === userId ? friendship.user_2_id : friendship.user_1_id;
}

export async function getChatSummaryCounts(userId: string): Promise<ChatSummaryCounts> {
  const unreadPromise = adminSupabase
    .from('chat_messages')
    .select('sender_id', { count: 'exact' })
    .eq('receiver_id', userId)
    .is('read_at', null)
    .eq('is_deleted', false);

  const requestsPromise = adminSupabase
    .from('friend_requests')
    .select('id', { count: 'exact' })
    .eq('receiver_id', userId)
    .eq('status', 'pending');

  const [unreadResult, requestResult] = await Promise.all([unreadPromise, requestsPromise]);

  if (unreadResult.error) throw new Error(unreadResult.error.message || 'Could not load unread messages.');
  if (requestResult.error) throw new Error(requestResult.error.message || 'Could not load friend requests.');

  const unreadMessages = unreadResult.count ?? 0;
  const unreadChats = new Set((unreadResult.data ?? []).map((entry) => entry.sender_id)).size;
  const pendingRequests = requestResult.count ?? 0;

  return {
    unreadMessages,
    unreadChats,
    pendingRequests,
    totalBadge: pendingRequests + unreadChats,
  };
}

async function getMessagesForFriendIds(userId: string, friendIds: string[]) {
  if (friendIds.length === 0) return [] as ChatMessageRow[];
  const joinedIds = friendIds.join(',');
  const { data, error } = await adminSupabase
    .from('chat_messages')
    .select('id, sender_id, receiver_id, message_text, reply_to_message_id, created_at, is_deleted, moderation_status, report_count, read_at')
    .or(`and(sender_id.eq.${userId},receiver_id.in.(${joinedIds})),and(receiver_id.eq.${userId},sender_id.in.(${joinedIds}))`)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw new Error(error.message || 'Could not load conversations.');
  return (data ?? []) as ChatMessageRow[];
}

function mapChatMessageRow(
  row: ChatMessageRow,
  profileMap: Map<string, ProfileRow>,
  replyMap: Map<string, ChatMessageRow>,
): ChatMessage {
  const sender = profileMap.get(row.sender_id);
  const receiver = profileMap.get(row.receiver_id);
  const reply = row.reply_to_message_id ? replyMap.get(row.reply_to_message_id) : null;
  const replySender = reply ? profileMap.get(reply.sender_id) : null;

  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    messageText: row.is_deleted ? 'Message unavailable.' : row.message_text,
    replyToMessageId: row.reply_to_message_id,
    createdAt: row.created_at,
    isDeleted: row.is_deleted,
    moderationStatus: row.moderation_status,
    reportCount: row.report_count,
    readAt: row.read_at,
    sender: sender ? toProfileSnippet(sender) : { id: row.sender_id, username: 'Unknown', email: '', title: null, level: null },
    receiver: receiver ? toProfileSnippet(receiver) : { id: row.receiver_id, username: 'Unknown', email: '', title: null, level: null },
    replyTo: reply ? {
      id: reply.id,
      messageText: reply.message_text,
      senderId: reply.sender_id,
      senderName: replySender?.username || 'Unknown',
    } : null,
  };
}

export async function getDashboardPayload(userId: string): Promise<ChatDashboardPayload> {
  const [counts, friendships, requests] = await Promise.all([
    getChatSummaryCounts(userId),
    getFriendshipsForUser(userId),
    getFriendRequestsForUser(userId),
  ]);

  const friendIds = friendships.map((friendship) => getOtherFriendId(friendship, userId));
  const requestProfileIds = requests.flatMap((request) => [request.requester_id, request.receiver_id]);
  const allProfileIds = Array.from(new Set([...friendIds, ...requestProfileIds, userId]));
  const profileMap = await getProfilesByIds(allProfileIds);
  const messageRows = await getMessagesForFriendIds(userId, friendIds);
  const replyMap = new Map(messageRows.map((row) => [row.id, row]));

  const friends: FriendSummary[] = friendships
    .map((friendship) => {
      const profile = profileMap.get(getOtherFriendId(friendship, userId));
      if (!profile) return null;
      return {
        ...toProfileSnippet(profile),
        friendshipId: friendship.id,
        createdAt: friendship.created_at,
      } satisfies FriendSummary;
    })
    .filter((value): value is FriendSummary => Boolean(value))
    .sort((a, b) => a.username.localeCompare(b.username));

  const conversationsByFriendId = new Map<string, ConversationSummary>();
  for (const friend of friends) {
    conversationsByFriendId.set(friend.id, {
      friend,
      lastMessage: null,
      unreadCount: 0,
      updatedAt: friend.createdAt,
    });
  }

  for (const row of messageRows) {
    const friendId = row.sender_id === userId ? row.receiver_id : row.sender_id;
    const existing = conversationsByFriendId.get(friendId);
    if (!existing) continue;
    if (!existing.lastMessage) {
      existing.lastMessage = mapChatMessageRow(row, profileMap, replyMap);
      existing.updatedAt = row.created_at;
    }
    if (row.receiver_id === userId && !row.read_at && !row.is_deleted) {
      existing.unreadCount += 1;
    }
  }

  const conversations = Array.from(conversationsByFriendId.values()).sort((a, b) => {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const incomingRequests: FriendRequestItem[] = [];
  const outgoingRequests: FriendRequestItem[] = [];

  for (const request of requests) {
    const requester = profileMap.get(request.requester_id);
    const receiver = profileMap.get(request.receiver_id);
    if (!requester || !receiver) continue;

    const mapped: FriendRequestItem = {
      id: request.id,
      requesterId: request.requester_id,
      receiverId: request.receiver_id,
      status: request.status,
      createdAt: request.created_at,
      updatedAt: request.updated_at,
      requester: toProfileSnippet(requester),
      receiver: toProfileSnippet(receiver),
    };

    if (request.receiver_id === userId) incomingRequests.push(mapped);
    else outgoingRequests.push(mapped);
  }

  return {
    counts,
    conversations,
    friends,
    incomingRequests,
    outgoingRequests,
  };
}

export async function getMessagesBetweenFriends(userId: string, friendId: string) {
  const { data, error } = await adminSupabase
    .from('chat_messages')
    .select('id, sender_id, receiver_id, message_text, reply_to_message_id, created_at, is_deleted, moderation_status, report_count, read_at')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message || 'Could not load messages.');

  const rows = (data ?? []) as ChatMessageRow[];
  const profileMap = await getProfilesByIds([userId, friendId]);
  const replyMap = new Map(rows.map((row) => [row.id, row]));
  return rows.map((row) => mapChatMessageRow(row, profileMap, replyMap));
}

export async function areUsersFriends(userId: string, otherUserId: string) {
  const pair = normalizeFriendshipPair(userId, otherUserId);
  const { data, error } = await adminSupabase
    .from('friendships')
    .select('id')
    .eq('user_1_id', pair.user1)
    .eq('user_2_id', pair.user2)
    .maybeSingle();

  if (error) throw new Error(error.message || 'Could not verify friendship.');
  return Boolean(data);
}
