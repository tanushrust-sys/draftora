'use client';

import FriendRequestCard from '@/app/components/chat/FriendRequestCard';
import FriendSearch from '@/app/components/chat/FriendSearch';
import type { FriendRequestItem, FriendSearchResult, FriendSearchSuggestion, FriendSummary } from '@/app/lib/chatTypes';

type FriendsPanelProps = {
  searchEmail: string;
  searchLoading: boolean;
  searchResult: FriendSearchResult | null;
  searchSuggestions: FriendSearchSuggestion[];
  searchMessage: string;
  incomingRequests: FriendRequestItem[];
  outgoingRequests: FriendRequestItem[];
  friends: FriendSummary[];
  onSearchEmailChange: (value: string) => void;
  onSearch: () => void;
  onAddFriend: (userId: string) => void;
  onPickSuggestion: (suggestion: FriendSearchSuggestion) => void;
  onAccept: (requestId: string) => void;
  onDecline: (requestId: string) => void;
  onOpenChat: (friendId: string) => void;
};

export default function FriendsPanel({
  searchEmail,
  searchLoading,
  searchResult,
  searchSuggestions,
  searchMessage,
  incomingRequests,
  outgoingRequests,
  friends,
  onSearchEmailChange,
  onSearch,
  onAddFriend,
  onPickSuggestion,
  onAccept,
  onDecline,
  onOpenChat,
}: FriendsPanelProps) {
  return (
    <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: '1rem', display: 'grid', gap: '1rem' }}>
      <section style={panelStyle}>
        <h3 style={sectionTitleStyle}>Find a friend</h3>
        <FriendSearch
          email={searchEmail}
          loading={searchLoading}
          result={searchResult}
          suggestions={searchSuggestions}
          statusMessage={searchMessage}
          onEmailChange={onSearchEmailChange}
          onSearch={onSearch}
          onAdd={onAddFriend}
          onPickSuggestion={onPickSuggestion}
        />
      </section>

      <section style={panelStyle}>
        <h3 style={sectionTitleStyle}>Incoming requests</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {incomingRequests.length === 0 ? <p style={emptyTextStyle}>No pending requests right now.</p> : incomingRequests.map((request) => (
            <FriendRequestCard
              key={request.id}
              profile={request.requester}
              subtitle={request.requester.email}
              variant="incoming"
              request={request}
              onAccept={onAccept}
              onDecline={onDecline}
            />
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={sectionTitleStyle}>Outgoing requests</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {outgoingRequests.length === 0 ? <p style={emptyTextStyle}>No outgoing requests.</p> : outgoingRequests.map((request) => (
            <FriendRequestCard
              key={request.id}
              profile={request.receiver}
              subtitle={request.receiver.email}
              variant="outgoing"
            />
          ))}
        </div>
      </section>

      <section style={panelStyle}>
        <h3 style={sectionTitleStyle}>Friends</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {friends.length === 0 ? <p style={emptyTextStyle}>Add friends by email to start chatting safely.</p> : friends.map((friend) => (
            <button key={friend.id} type="button" onClick={() => onOpenChat(friend.id)} style={{ all: 'unset', cursor: 'pointer' }}>
              <FriendRequestCard
                profile={friend}
                subtitle={friend.email}
                variant="friend"
              />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

const panelStyle = {
  borderRadius: 22,
  border: '1px solid var(--t-brd)',
  background: 'var(--t-card2)',
  padding: '1rem',
  display: 'grid',
  gap: '0.8rem',
} as const;

const sectionTitleStyle = {
  margin: 0,
  color: 'var(--t-tx)',
  fontSize: 14,
  fontWeight: 800,
} as const;

const emptyTextStyle = {
  margin: 0,
  color: 'var(--t-tx3)',
  fontSize: 12.5,
  lineHeight: 1.5,
} as const;
