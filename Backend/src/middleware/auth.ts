import { Context } from 'elysia';
import { db } from '../db';
import { users, memberships, tracks } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: 'organizer' | 'head' | 'vice_head';
  accountStatus: 'pending' | 'approved' | 'rejected' | 'suspended';
  membership?: {
    id: string;
    trackId: string;
    trackName: string;
    role: 'head' | 'vice_head';
    status: 'pending' | 'approved' | 'rejected' | 'suspended';
  } | null;
}

export async function resolveAuthUser(tokenUserId: string): Promise<AuthUser | null> {
  const [userRecord] = await db
    .select()
    .from(users)
    .where(eq(users.id, tokenUserId))
    .limit(1);

  if (!userRecord) return null;

  // If user is organizer, role is organizer and no single track membership is mandatory
  let membershipInfo = null;

  const [activeMembership] = await db
    .select({
      id: memberships.id,
      trackId: memberships.trackId,
      trackName: tracks.name,
      role: memberships.role,
      status: memberships.status,
    })
    .from(memberships)
    .innerJoin(tracks, eq(memberships.trackId, tracks.id))
    .where(eq(memberships.userId, userRecord.id))
    .limit(1);

  if (activeMembership) {
    membershipInfo = {
      id: activeMembership.id,
      trackId: activeMembership.trackId,
      trackName: activeMembership.trackName,
      role: activeMembership.role as 'head' | 'vice_head',
      status: activeMembership.status as any,
    };
  }

  return {
    id: userRecord.id,
    email: userRecord.email,
    fullName: userRecord.fullName,
    role: userRecord.role as any,
    accountStatus: userRecord.accountStatus as any,
    membership: membershipInfo,
  };
}

export function isOrganizer(user?: AuthUser | null): boolean {
  return user?.role === 'organizer' && user?.accountStatus === 'approved';
}

export function isApprovedLeader(user?: AuthUser | null): boolean {
  if (!user) return false;
  if (user.role === 'organizer') return user.accountStatus === 'approved';
  return (
    user.accountStatus === 'approved' &&
    user.membership?.status === 'approved' &&
    (user.role === 'head' || user.role === 'vice_head')
  );
}

export function canAccessTrack(user: AuthUser | null | undefined, trackId: string): boolean {
  if (!user) return false;
  if (isOrganizer(user)) return true;
  if (!isApprovedLeader(user)) return false;
  return user.membership?.trackId === trackId;
}

