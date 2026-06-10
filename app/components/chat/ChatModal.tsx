'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import ChatSidebar from '@/app/components/chat/ChatSidebar';
import ChatThread from '@/app/components/chat/ChatThread';
import FriendsPanel from '@/app/components/chat/FriendsPanel';
import { chatTheme } from '@/app/components/chat/chatTheme';
import {
  fetchChatDashboard,
  fetchConversationMessages,
  markConversationRead,
  reportChatMessage,
  searchFriendByEmail,
  searchFriendSuggestions,
  sendChatMessage,
  sendFriendRequest,
  respondToFriendRequest,
} from '@/app/lib/chat';
import type {
  ChatDashboardPayload,
  ChatMessage,
  ChatProfileSnippet,
  ChatSummaryCounts,
  ChatTab,
  ConversationSummary,
  FriendSearchResult,
  FriendSearchSuggestion,
  FriendSummary,
} from '@/app/lib/chatTypes';
import { supabase } from '@/app/lib/supabase';

type ChatModalProps = {
  open: boolean;
  token: string;
  currentUser: ChatProfileSnippet;
  initialCounts: ChatSummaryCounts;
  onClose: () => void;
  onCountsChange: (counts: ChatSummaryCounts) => void;
  mode?: 'overlay' | 'page';
};

export default function ChatModal({
  open,
  token,
  currentUser,
  initialCounts,
  onClose,
  onCountsChange,
  mode = 'overlay',
}: ChatModalProps) {
  const [activeTab, setActiveTab] = useState<ChatTab>('chats');
  const [counts, setCounts] = useState(initialCounts);
  const [dashboard, setDashboard] = useState<ChatDashboardPayload | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [messagesByFriend, setMessagesByFriend] = useState<Record<string, ChatMessage[]>>({});
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<FriendSearchResult | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<FriendSearchSuggestion[]>([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [error, setError] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false);

  const selectedConversation = useMemo(
    () => dashboard?.conversations.find((entry) => entry.friend.id === selectedFriendId) ?? null,
    [dashboard?.conversations, selectedFriendId],
  );

  const selectedFriend: FriendSummary | null = useMemo(() => {
    if (selectedConversation?.friend) return selectedConversation.friend;
    return dashboard?.friends.find((friend) => friend.id === selectedFriendId) ?? null;
  }, [dashboard?.friends, selectedConversation?.friend, selectedFriendId]);

  const currentMessages = selectedFriendId ? (messagesByFriend[selectedFriendId] ?? []) : [];
  const selectedFriendName = selectedFriend?.username ?? 'Friend';

  const refreshDashboard = useCallback(async (preferredFriendId?: string | null) => {
    if (!open) return;
    setLoadingDashboard(true);
    try {
      const payload = await fetchChatDashboard(token);
      setDashboard(payload);
      setCounts(payload.counts);
      onCountsChange(payload.counts);
      setError('');

      setSelectedFriendId((currentFriendId) =>
        preferredFriendId
        ?? currentFriendId
        ?? payload.conversations[0]?.friend.id
        ?? payload.friends[0]?.id
        ?? null,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load Draftora Chat.');
    } finally {
      setLoadingDashboard(false);
    }
  }, [onCountsChange, open, token]);

  const loadMessages = useCallback(async (friendId: string, markRead = true) => {
    setLoadingMessages(true);
    try {
      const payload = await fetchConversationMessages(token, friendId);
      setMessagesByFriend((current) => ({ ...current, [friendId]: payload.messages }));
      setError('');
      if (markRead) {
        void markConversationRead(token, friendId)
          .then(() => refreshDashboard(friendId))
          .catch(() => {});
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, [refreshDashboard, token]);

  useEffect(() => {
    if (!open) return;
    setCounts(initialCounts);
    void refreshDashboard();
  }, [open, refreshDashboard]);

  useEffect(() => {
    if (!open || !selectedFriendId) return;
    if (messagesByFriend[selectedFriendId]) return;
    void loadMessages(selectedFriendId);
  }, [loadMessages, messagesByFriend, open, selectedFriendId]);

  useEffect(() => {
    if (!open) return;
    const update = () => setIsMobile(window.innerWidth < 820);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [open]);

  useEffect(() => {
    if (!open || activeTab !== 'friends') return;
    const query = searchEmail.trim();
    if (query.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const suggestions = await searchFriendSuggestions(token, query);
          setSearchSuggestions(suggestions);
        } catch {
          setSearchSuggestions([]);
        }
      })();
    }, 180);

    return () => window.clearTimeout(timer);
  }, [activeTab, open, searchEmail, token]);

  useEffect(() => {
    if (!open || !currentUser.id) return;

    const channel = supabase.channel(`draftora-chat-${currentUser.id}`);
    channel
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `receiver_id=eq.${currentUser.id}`,
      }, () => {
        void refreshDashboard(selectedFriendId);
        if (selectedFriendId) void loadMessages(selectedFriendId, false);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages',
        filter: `sender_id=eq.${currentUser.id}`,
      }, () => {
        void refreshDashboard(selectedFriendId);
        if (selectedFriendId) void loadMessages(selectedFriendId, false);
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friend_requests',
        filter: `receiver_id=eq.${currentUser.id}`,
      }, () => {
        void refreshDashboard(selectedFriendId);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser.id, loadMessages, open, refreshDashboard, selectedFriendId]);

  const handleSelectFriend = useCallback((friendId: string) => {
    setActiveTab('chats');
    setSelectedFriendId(friendId);
    setMobileThreadOpen(true);
    setError('');
    void loadMessages(friendId);
  }, [loadMessages]);

  const handleSearch = useCallback(async () => {
    if (!searchEmail.trim()) return;
    setSearchLoading(true);
    setSearchMessage('');
    try {
      const result = await searchFriendByEmail(token, searchEmail);
      setSearchResult(result);
      setSearchSuggestions([]);
      if (!result) setSearchMessage('No matching student found.');
    } catch (caught) {
      setSearchMessage(caught instanceof Error ? caught.message : 'Could not search right now.');
    } finally {
      setSearchLoading(false);
    }
  }, [searchEmail, token]);

  const handleAddFriend = useCallback(async (userId: string) => {
    try {
      await sendFriendRequest(token, userId);
      setSearchMessage('Friend request sent.');
      await refreshDashboard(userId);
      const result = await searchFriendByEmail(token, searchEmail);
      setSearchResult(result);
      setSearchSuggestions([]);
    } catch (caught) {
      setSearchMessage(caught instanceof Error ? caught.message : 'Could not send friend request.');
    }
  }, [refreshDashboard, searchEmail, token]);

  const handlePickSuggestion = useCallback((suggestion: FriendSearchSuggestion) => {
    setSearchEmail(suggestion.profile.email);
    setSearchResult(suggestion);
    setSearchSuggestions([]);
    setSearchMessage('');
  }, []);

  const handleRespond = useCallback(async (requestId: string, action: 'accepted' | 'declined') => {
    try {
      await respondToFriendRequest(token, requestId, action);
      await refreshDashboard();
      if (action === 'accepted') setActiveTab('chats');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update request.');
    }
  }, [refreshDashboard, token]);

  const handleSend = useCallback(async () => {
    if (!selectedFriendId || !draft.trim() || sending) return;
    setSending(true);
    setError('');
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      senderId: currentUser.id,
      receiverId: selectedFriendId,
      messageText: draft.trim(),
      replyToMessageId: replyTo?.id ?? null,
      createdAt: new Date().toISOString(),
      isDeleted: false,
      moderationStatus: 'allowed',
      reportCount: 0,
      readAt: null,
      sender: currentUser,
      receiver: selectedFriend ?? {
        id: selectedFriendId,
        username: selectedFriendName,
        email: '',
        title: null,
        level: null,
      },
      replyTo: replyTo ? {
        id: replyTo.id,
        messageText: replyTo.messageText,
        senderId: replyTo.senderId,
        senderName: replyTo.sender.username,
      } : null,
    };
    setMessagesByFriend((current) => ({
      ...current,
      [selectedFriendId]: [...(current[selectedFriendId] ?? []), optimisticMessage],
    }));
    try {
      const response = await sendChatMessage(token, selectedFriendId, draft, replyTo?.id ?? null);
      setMessagesByFriend((current) => ({
        ...current,
        [selectedFriendId]: (current[selectedFriendId] ?? []).map((message) =>
          message.id === optimisticId ? response.message : message,
        ),
      }));
      setDraft('');
      setReplyTo(null);
      await refreshDashboard(selectedFriendId);
    } catch (caught) {
      setMessagesByFriend((current) => ({
        ...current,
        [selectedFriendId]: (current[selectedFriendId] ?? []).filter((message) => message.id !== optimisticId),
      }));
      setError(caught instanceof Error ? caught.message : 'Could not send message.');
    } finally {
      setSending(false);
    }
  }, [currentUser, draft, refreshDashboard, replyTo, selectedFriend, selectedFriendId, selectedFriendName, sending, token]);

  const handleReport = useCallback(async (message: ChatMessage) => {
    const reason = window.prompt('Why are you reporting this message?', 'Unkind or unsafe');
    if (!reason?.trim()) return;
    try {
      await reportChatMessage(token, message.id, reason.trim());
      setError('Thanks. The message was reported for review.');
      await refreshDashboard(selectedFriendId);
      if (selectedFriendId) await loadMessages(selectedFriendId, false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not report message.');
    }
  }, [loadMessages, refreshDashboard, selectedFriendId, token]);

  if (!open) return null;

  const showSidebar = !isMobile || !mobileThreadOpen;
  const showThread = !isMobile || mobileThreadOpen;
  const isPageMode = mode === 'page';

  return (
    <div
      style={{
        position: isPageMode ? 'relative' : 'fixed',
        inset: isPageMode ? 'auto' : 0,
        zIndex: isPageMode ? 'auto' : 90,
        background: isPageMode ? 'transparent' : chatTheme.overlay,
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'center',
        padding: 0,
        overflow: 'hidden',
        width: '100%',
        height: '100%',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Draftora Chat"
        style={{
          width: '100%',
          height: '100%',
          minHeight: isPageMode ? 'calc(100vh - 1.5rem)' : '100dvh',
          borderRadius: isPageMode ? 24 : 0,
          overflow: 'hidden',
          border: isPageMode ? `1px solid ${chatTheme.border}` : 'none',
          background: chatTheme.shell,
          boxShadow: isPageMode ? '0 24px 60px rgba(0,0,0,0.18)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ padding: '0.95rem 1rem', borderBottom: `1px solid ${chatTheme.border}`, background: chatTheme.shellAlt, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 14, background: chatTheme.accentSoft, display: 'grid', placeItems: 'center', color: chatTheme.accent }}>
              <MessageCircle style={{ width: 18, height: 18 }} />
            </div>
            <div>
              <p style={{ margin: 0, color: chatTheme.text, fontSize: 15, fontWeight: 900 }}>Draftora Chat</p>
              <p style={{ margin: '0.14rem 0 0', color: chatTheme.textMuted, fontSize: 11.5 }}>
                {counts.totalBadge > 0 ? `${counts.totalBadge} new updates` : 'Safe chat for sharing writing ideas'}
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 14, border: `1px solid ${chatTheme.border}`, background: chatTheme.surface, color: chatTheme.textMuted, display: 'grid', placeItems: 'center', cursor: 'pointer' }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {error ? (
          <div style={{ padding: '0.7rem 1rem', background: '#2a2130', color: '#ffca6b', fontSize: 12.5, fontWeight: 700 }}>
            {error}
          </div>
        ) : null}

        <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
          {showSidebar ? (
            <ChatSidebar
              activeTab={activeTab}
              counts={counts}
              conversations={dashboard?.conversations ?? []}
              selectedFriendId={selectedFriendId}
              onTabChange={(tab) => {
                setActiveTab(tab);
                if (tab === 'friends') setMobileThreadOpen(false);
              }}
              onSelectFriend={handleSelectFriend}
            />
          ) : null}

          {activeTab === 'friends' && showSidebar ? (
            <FriendsPanel
              searchEmail={searchEmail}
              searchLoading={searchLoading}
              searchResult={searchResult}
              searchSuggestions={searchSuggestions}
              searchMessage={searchMessage}
              incomingRequests={dashboard?.incomingRequests ?? []}
              outgoingRequests={dashboard?.outgoingRequests ?? []}
              friends={dashboard?.friends ?? []}
              onSearchEmailChange={setSearchEmail}
              onSearch={handleSearch}
              onAddFriend={handleAddFriend}
              onPickSuggestion={handlePickSuggestion}
              onAccept={(requestId) => void handleRespond(requestId, 'accepted')}
              onDecline={(requestId) => void handleRespond(requestId, 'declined')}
              onOpenChat={(friendId) => {
                handleSelectFriend(friendId);
                setActiveTab('chats');
              }}
            />
          ) : null}

          {activeTab === 'chats' && showThread ? (
            <ChatThread
              currentUserId={currentUser.id}
              friend={selectedFriend}
              messages={currentMessages}
              loading={loadingMessages && currentMessages.length === 0}
              sending={sending}
              draft={draft}
              replyTo={replyTo}
              isMobile={isMobile}
              onBack={() => setMobileThreadOpen(false)}
              onDraftChange={setDraft}
              onCancelReply={() => setReplyTo(null)}
              onSend={() => void handleSend()}
              onReply={setReplyTo}
              onReport={(message) => void handleReport(message)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
