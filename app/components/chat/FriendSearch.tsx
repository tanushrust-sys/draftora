'use client';

import { Search, UserPlus2 } from 'lucide-react';
import { getAvatarInitials } from '@/app/lib/chat';
import type { FriendSearchResult, FriendSearchSuggestion } from '@/app/lib/chatTypes';

type FriendSearchProps = {
  email: string;
  loading: boolean;
  result: FriendSearchResult | null;
  suggestions: FriendSearchSuggestion[];
  statusMessage: string;
  onEmailChange: (value: string) => void;
  onSearch: () => void;
  onAdd: (userId: string) => void;
  onPickSuggestion: (suggestion: FriendSearchSuggestion) => void;
};

export default function FriendSearch({
  email,
  loading,
  result,
  suggestions,
  statusMessage,
  onEmailChange,
  onSearch,
  onAdd,
  onPickSuggestion,
}: FriendSearchProps) {
  const canAdd = result?.status === 'addable';

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search style={{ width: 15, height: 15, position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-tx3)' }} />
          <input
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onSearch();
              }
            }}
            placeholder="Search by student email"
            style={{
              width: '100%',
              height: 46,
              borderRadius: 14,
              border: '1px solid var(--t-brd)',
              background: 'var(--t-card)',
              color: 'var(--t-tx)',
              padding: '0 0.9rem 0 2.3rem',
              fontSize: 13,
              outline: 'none',
            }}
          />
          {suggestions.length > 0 ? (
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: 'calc(100% + 0.45rem)',
                zIndex: 4,
                borderRadius: 16,
                border: '1px solid var(--t-brd)',
                background: 'var(--t-card)',
                boxShadow: '0 18px 36px color-mix(in srgb, var(--t-shadow) 18%, transparent)',
                overflow: 'hidden',
              }}
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.profile.id}
                  type="button"
                  onClick={() => onPickSuggestion(suggestion)}
                  style={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: '38px minmax(0, 1fr) auto',
                    gap: 10,
                    alignItems: 'center',
                    padding: '0.72rem 0.8rem',
                    border: 'none',
                    borderTop: index === 0 ? 'none' : '1px solid color-mix(in srgb, var(--t-brd) 70%, transparent)',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--t-acc-a)', display: 'grid', placeItems: 'center', color: 'var(--t-acc)', fontWeight: 900, fontSize: 12 }}>
                    {getAvatarInitials(suggestion.profile.username, suggestion.profile.email)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 12.5, fontWeight: 800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{suggestion.profile.username}</p>
                    <p style={{ margin: '0.16rem 0 0', color: 'var(--t-tx3)', fontSize: 11.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{suggestion.profile.email}</p>
                  </div>
                  <span style={resultChipStyle}>{labelForStatus(suggestion.status)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <button type="button" onClick={onSearch} disabled={loading || !email.trim()} style={searchButtonStyle}>
          {loading ? '...' : 'Find'}
        </button>
      </div>

      {statusMessage ? <p style={{ margin: 0, color: 'var(--t-tx3)', fontSize: 12 }}>{statusMessage}</p> : null}

      {result ? (
        <div style={{ borderRadius: 18, border: '1px solid var(--t-brd)', background: 'var(--t-card)', padding: '0.85rem', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--t-acc-a)', display: 'grid', placeItems: 'center', color: 'var(--t-acc)', fontWeight: 900, fontSize: 13 }}>
            {getAvatarInitials(result.profile.username, result.profile.email)}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, color: 'var(--t-tx)', fontSize: 13.5, fontWeight: 800 }}>{result.profile.username}</p>
            <p style={{ margin: '0.16rem 0 0', color: 'var(--t-tx3)', fontSize: 12 }}>{result.profile.email}</p>
          </div>
          {canAdd ? (
            <button type="button" onClick={() => onAdd(result.profile.id)} style={addButtonStyle}>
              <UserPlus2 style={{ width: 14, height: 14 }} />
              Add Friend
            </button>
          ) : (
            <span style={resultChipStyle}>{labelForStatus(result.status)}</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

const searchButtonStyle = {
  height: 46,
  borderRadius: 14,
  border: '1px solid color-mix(in srgb, var(--t-acc) 24%, transparent)',
  background: 'linear-gradient(135deg, color-mix(in srgb, var(--t-acc) 78%, #fff 22%) 0%, color-mix(in srgb, var(--t-acc) 66%, var(--t-card2) 34%) 100%)',
  color: '#fff',
  padding: '0 1rem',
  fontSize: 12.5,
  fontWeight: 800,
  cursor: 'pointer',
} as const;

const addButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  height: 38,
  borderRadius: 12,
  border: '1px solid color-mix(in srgb, var(--t-acc) 24%, transparent)',
  background: 'var(--t-acc)',
  color: '#fff',
  padding: '0 0.9rem',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
} as const;

const resultChipStyle = {
  borderRadius: 999,
  background: 'var(--t-card2)',
  color: 'var(--t-tx2)',
  padding: '0.45rem 0.7rem',
  fontSize: 11.5,
  fontWeight: 800,
  whiteSpace: 'nowrap' as const,
} as const;

function labelForStatus(status: FriendSearchResult['status']) {
  if (status === 'self') return 'You';
  if (status === 'friends') return 'Already Friends';
  if (status === 'pending_incoming') return 'Incoming Request';
  if (status === 'pending_outgoing') return 'Request Sent';
  return 'Add Friend';
}
