import { Check, CheckCheck, LoaderCircle, UserRound, Users } from 'lucide-react';
import type { Conversation, DeliveryState, User } from './types';

export function Avatar({ user, size = 'md' }: { user?: User | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const initials = user?.displayName?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" /> : initials || <UserRound />}
      {user?.presence === 'online' && <span className="presence-dot" />}
    </span>
  );
}

export function GroupAvatar({ name, url, size = 'md' }: { name: string; url?: string | null | undefined; size?: 'sm' | 'md' | 'lg' }) {
  const initials = name?.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
  return (
    <span className={`avatar avatar-${size}`} aria-hidden="true">
      {url ? <img src={url} alt="" /> : initials || <Users />}
    </span>
  );
}

export function conversationName(conversation: Conversation, currentUserId: string) {
  if (conversation.title) return conversation.title;
  if (conversation.group?.name) return conversation.group.name;
  const others = conversation.participants.filter((user) => user.id !== currentUserId);
  return others.map((user) => user.displayName).join(', ') || 'New conversation';
}

export function conversationPeer(conversation: Conversation, currentUserId: string) {
  return conversation.participants.find((user) => user.id !== currentUserId) ?? conversation.participants[0];
}

export function timeLabel(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
}

export function DeliveryIcon({ state }: { state: DeliveryState }) {
  if (state === 'sending') return <LoaderCircle className="spin" aria-label="Sending" />;
  if (state === 'read') return <CheckCheck className="read-check" aria-label="Read" />;
  if (state === 'delivered') return <CheckCheck aria-label="Delivered" />;
  return <Check aria-label={state === 'failed' ? 'Failed to send' : 'Sent'} />;
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return <div className="state-view"><LoaderCircle className="spin" /><span>{label}</span></div>;
}

export function SkeletonList({ rows = 6, avatar = true }: { rows?: number; avatar?: boolean }) {
  return <div className="skeleton-list" aria-hidden="true">{Array.from({ length: rows }).map((_, index) => (
    <div className="skeleton-row" key={index}>
      {avatar && <span className="skeleton skeleton-avatar" />}
      <span className="skeleton-lines"><span className="skeleton skeleton-line" /><span className="skeleton skeleton-line short" /></span>
    </div>
  ))}</div>;
}

export function SkeletonChat({ bubbles = 8 }: { bubbles?: number }) {
  const widths = [38, 52, 44];
  return <div className="skeleton-chat" aria-hidden="true">{Array.from({ length: bubbles }).map((_, index) => {
    const mine = index % 3 === 0;
    return <div className={`skeleton-bubble-row ${mine ? 'mine' : ''}`} key={index}>
      {!mine && <span className="skeleton skeleton-avatar" />}
      <span className="skeleton skeleton-bubble" style={{ width: `${Number(widths[index % 3] ?? 44) + (mine ? 10 : 0)}%` }} />
    </div>;
  })}</div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><span className="empty-mark" /><h3>{title}</h3><p>{detail}</p></div>;
}
