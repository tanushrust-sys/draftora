'use client';

import { MessageCircle, Users } from 'lucide-react';
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
    <div style={{ width: 320, minWidth: 0, borderRight: '1px solid var(--t-brd)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.85rem', display: 'flex', gap: 8, borderBottom: '1px solid var(--t-brd)' }}>
        <TabButton label="Chats" icon={<MessageCircle style={{ width: 14, height: 14 }} />} active={activeTab === 'chats'} badge={counts.unreadChats} onClick={() => onTabChange('chats')} />
        <TabButton label="Friends" icon={<Users style={{ width: 14, height: 14 }} />} active={activeTab === 'friends'} badge={counts.pendingRequests} onClick={() => onTabChange('friends')} />
      </div>

      {activeTab === 'chats' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.6rem' }}>
          {conversations.length === 0 ? (
            <div style={{ padding: '1rem', color: 'var(--t-tx3)', fontSize: 12.5, lineHeight: 1.5 }}>
              No chats yet. Add a friend to start sharing writing ideas.
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
                  border: selected ? '1px solid color-mix(in srgb, var(--t-acc) 28%, transparent)' : '1px solid transparent',
                  background: selected ? 'var(--t-acc-a)' : 'transparent',
                  display: 'grid',
                  gridTemplateColumns: '44px minmax(0, 1fr) auto',
                  gap: 10,
                  cursor: 'pointer',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--t-card2)', display: 'grid', placeItems: 'center', color: 'var(--t-acc)', fontWeight: 900, fontSize: 13 }}>
                  {getAvatarInitials(conversation.friend.username, conversation.friend.email)}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 13, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conversation.friend.username}</p>
                  </div>
                  <p style={{ margin: '0.18rem 0 0', color: 'var(--t-tx3)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {conversation.lastMessage?.messageText || 'Start a new chat'}
                  </p>
                </div>
                <div style={{ display: 'grid', justifyItems: 'end', gap: 6 }}>
                  <span style={{ color: 'var(--t-tx3)', fontSize: 10.5 }}>{formatChatTimestamp(conversation.lastMessage?.createdAt || conversation.updatedAt)}</span>
                  {conversation.unreadCount > 0 ? (
                    <span style={{ minWidth: 20, height: 20, borderRadius: 999, background: 'var(--t-acc)', color: '#fff', fontSize: 10.5, fontWeight: 900, display: 'grid', placeItems: 'center', padding: '0 6px' }}>
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
        border: active ? '1px solid color-mix(in srgb, var(--t-acc) 26%, transparent)' : '1px solid transparent',
        background: active ? 'var(--t-acc-a)' : 'transparent',
        color: active ? 'var(--t-acc)' : 'var(--t-tx2)',
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
      {badge > 0 ? <span style={{ minWidth: 18, height: 18, borderRadius: 999, background: active ? 'var(--t-acc)' : 'var(--t-card2)', color: active ? '#fff' : 'var(--t-tx2)', fontSize: 10.5, display: 'grid', placeItems: 'center', padding: '0 5px' }}>{badge}</span> : null}
    </button>
  );
}
