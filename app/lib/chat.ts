'use client';

import { authFetchJson } from '@/app/lib/auth-fetch';
import type {
  ChatDashboardPayload,
  ChatMessage,
  ChatSendMessagePayload,
  ChatSummaryCounts,
  FriendSearchResult,
  FriendSearchSuggestion,
} from '@/app/lib/chatTypes';

export const CHAT_MAX_MESSAGE_LENGTH = 500;

export function getAvatarInitials(name?: string | null, email?: string | null) {
  const source = (name || email || '?').trim();
  if (!source) return '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

export function formatChatTimestamp(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

export function formatChatDateDivider(value: string) {
  const date = new Date(value);
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === now.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

export function getConversationPartner(message: ChatMessage, userId: string) {
  return message.senderId === userId ? message.receiver : message.sender;
}

export async function fetchChatSummary(token: string) {
  return authFetchJson<ChatSummaryCounts>('/api/chat/summary', { token, timeoutMs: 30000 });
}

export async function fetchChatDashboard(token: string) {
  return authFetchJson<ChatDashboardPayload>('/api/chat/dashboard', { token, timeoutMs: 30000 });
}

export async function searchFriendByEmail(token: string, email: string) {
  const encoded = encodeURIComponent(email.trim());
  return authFetchJson<FriendSearchResult | null>(`/api/chat/search?email=${encoded}`, { token, timeoutMs: 20000 });
}

export async function searchFriendSuggestions(token: string, query: string) {
  const encoded = encodeURIComponent(query.trim());
  return authFetchJson<FriendSearchSuggestion[]>(`/api/chat/search?q=${encoded}`, { token, timeoutMs: 20000 });
}

export async function sendFriendRequest(token: string, receiverId: string) {
  return authFetchJson<{ ok: true }>('/api/chat/friends', { token, method: 'POST', body: { receiverId }, timeoutMs: 30000 });
}

export async function respondToFriendRequest(token: string, requestId: string, action: 'accepted' | 'declined') {
  return authFetchJson<{ ok: true }>('/api/chat/friend-requests/respond', {
    token,
    method: 'POST',
    body: { requestId, action },
    timeoutMs: 30000,
  });
}

export async function fetchConversationMessages(token: string, friendId: string) {
  const encoded = encodeURIComponent(friendId);
  return authFetchJson<{ friendId: string; messages: ChatMessage[] }>(`/api/chat/messages?friendId=${encoded}`, { token, timeoutMs: 30000 });
}

export async function markConversationRead(token: string, friendId: string) {
  return authFetchJson<{ ok: true }>('/api/chat/messages/read', {
    token,
    method: 'POST',
    body: { friendId },
    timeoutMs: 20000,
  });
}

export async function sendChatMessage(token: string, receiverId: string, messageText: string, replyToMessageId?: string | null) {
  return authFetchJson<ChatSendMessagePayload>('/api/chat/messages', {
    token,
    method: 'POST',
    body: { receiverId, messageText, replyToMessageId },
    timeoutMs: 30000,
  });
}

export async function reportChatMessage(token: string, messageId: string, reason: string) {
  return authFetchJson<{ ok: true }>('/api/chat/messages/report', {
    token,
    method: 'POST',
    body: { messageId, reason },
    timeoutMs: 30000,
  });
}
