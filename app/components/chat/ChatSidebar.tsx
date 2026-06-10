'use client';

import { MessageCircle, Users } from 'lucide-react';
import { chatTheme } from '@/app/components/chat/chatTheme';
import { formatChatTimestamp, getAvatarInitials } from '@/app/lib/chat';
import type { ChatSummaryCounts, ChatTab, ConversationSummary } from '@/app/lib/chatTypes';

type ChatSidebarProps = {
  activeTab: ChatTab;
  counts: ChatSummaryCounts;
  conversations: ConversationSummary[];
  selectedFriendId: string | null;
  onTabChange: (tab: ChatTab) => void;
  onSelectFriend: (friendId: string) => void;
};

export default function ChatSidebar({
  activeTab,
  counts,
  conversations,
  selectedFriendId,
  onTabChange,
  onSelectFriend,
}: ChatSidebarProps) {
  return (
    <div style={{ width: 320, minWidth: 0, borderRight: `1px solid ${chatTheme.border}`, background: chatTheme.shellAlt, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.85rem', display: 'flex', gap: 8, borderBottom: `1px solid ${chatTheme.border}` }}>
        <TabButton label="Chats" icon={<MessageCircle style={{ width: 14, height: 14 }} />} active={activeTab === 'chats'} badge={counts.unreadChats} onClick={() => onTabChange('chats')} />
        <TabButton label="Friends" icon={<Users style={{ width: 14, height: 14 }} />} active={activeTab === 'friends'} badge={counts.pendingRequests} onClick={() => onTabChange('friends')} />
      </div>

      {activeTab === 'chats' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
          <div style={{ padding: '0.45rem 0.45rem 0.7rem' }}>
            <p style={{ margin: 0, color: chatTheme.text, fontSize: 14, fontWeight: 800 }}>Your chats</p>
            <p style={{ margin: '0.18rem 0 0', color: chatTheme.textMuted, fontSize: 11.5 }}>Pick a friend and keep the conversation going.</p>
          </div>
          {conversations.length === 0 ? (
            <div style={{ padding: '1rem', color: chatTheme.textMuted, fontSize: 12.5, lineHeight: 1.5 }}>
              No chats yet. Open the Friends tab, add someone, then start chatting from their card.
            </div>
          ) : conversations.map((conversation) => {
            const selected = selectedFriendId === conversation.friend.id;
            return (
              <button
                key={conversation.friend.id}
                type="button"
                onClick={() => onSelectFriend(conversation.friend.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '0.8rem',
                  borderRadius: 18,
                  border: selected ? `1px solid ${chatTheme.borderStrong}` : '1px solid transparent',
                  background: selected ? chatTheme.accentSoft : 'transparent',
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0, 1fr) auto',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: chatTheme.surfaceMuted, display: 'grid', placeItems: 'center', color: chatTheme.accent, fontWeight: 900, fontSize: 13 }}>
                  {getAvatarInitials(conversation.friend.username, conversation.friend.email)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ margin: 0, color: chatTheme.text, fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.friend.username}</p>
                  </div>
                  <p style={{ margin: '0.18rem 0 0', color: chatTheme.textMuted, fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conversation.lastMessage?.messageText || 'Start a new chat'}
                  </p>
                </div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: 6 }}>
                  <span style={{ color: chatTheme.textMuted, fontSize: 10.5 }}>{formatChatTimestamp(conversation.lastMessage?.createdAt || conversation.updatedAt)}</span>
                  {conversation.unreadCount > 0 ? (
                    <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: chatTheme.accentStrong, color: '#fff', fontSize: 10.5, fontWeight: 900, display: 'grid', placeItems: 'center', padding: '0 6px' }}>
                      {conversation.unreadCount}
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  badge,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  badge: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1,
        height: 42,
        borderRadius: 14,
        border: active ? `1px solid ${chatTheme.borderStrong}` : '1px solid transparent',
        background: active ? chatTheme.accentSoft : 'transparent',
        color: active ? chatTheme.accent : chatTheme.textMuted,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 12.5,
        fontWeight: 800,
        cursor: 'pointer',
      }}
    >
      {icon}
      {label}
      {badge > 0 ? <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: active ? chatTheme.accentStrong : chatTheme.surfaceMuted, color: active ? '#fff' : chatTheme.textMuted, fontSize: 10.5, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{badge}</span> : null}
    </button>
  );
}
