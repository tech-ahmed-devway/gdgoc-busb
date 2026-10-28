import { describe, it, expect, spyOn } from 'bun:test';
import app from '../src/index';
import { db } from '../src/db';
import { canAccessTrack, isOrganizer, isApprovedLeader } from '../src/middleware/auth';

describe('GDGoC BUSB API - Authentication & Security Tests', () => {
  it('GET /health returns healthy status', async () => {
    const res = await app.handle(new Request('http://localhost:3001/health'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('healthy');
    expect(json.service).toBe('gdgoc-busb-backend');
  });

  it('Login rejects invalid credentials with 401', async () => {
    const selectSpy = spyOn(db, 'select').mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        } as any)
    );

    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent@gdgoc-busb.org',
          password: 'WrongPassword123!',
          requestedMode: 'leadership',
        }),
      })
    );

    selectSpy.mockRestore();

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('Registration requires matching passwords', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Test Applicant',
          email: 'applicant@test.com',
          password: 'Password123!',
          confirmPassword: 'MismatchPassword!',
          role: 'head',
          trackId: '00000000-0000-0000-0000-000000000000',
        }),
      })
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe('PASSWORDS_MISMATCH');
  });

  it('Registration rejects unauthorized role requests (e.g. organizer)', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: 'Intruder',
          email: 'intruder@test.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          role: 'organizer',
          trackId: '00000000-0000-0000-0000-000000000000',
        }),
      })
    );

    expect(res.status).toBe(422);
  });

  it('Forgot password never reveals whether email exists', async () => {
    const selectSpy = spyOn(db, 'select').mockImplementation(
      () =>
        ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        } as any)
    );

    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'ghost_user@randomdomain.org',
        }),
      })
    );

    selectSpy.mockRestore();

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.message).toContain('If an account exists');
  });

  it('Protected route rejects unauthenticated requests with 401', async () => {
    const res = await app.handle(new Request('http://localhost:3001/api/v1/auth/me'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error.code).toBe('UNAUTHORIZED');
  });

  it('Organizer routes reject requests without valid token', async () => {
    const res = await app.handle(
      new Request('http://localhost:3001/api/v1/approvals', {
        headers: { Authorization: 'Bearer fake_invalid_jwt_token' },
      })
    );
    expect(res.status).toBe(401);
  });
});

describe('GDGoC BUSB Authorization & Track Permission Unit Tests', () => {
  it('Organizer can access all tracks', () => {
    const organizerUser = {
      id: 'org-1',
      email: 'organizer@gdgoc-busb.org',
      fullName: 'Chapter Organizer',
      role: 'organizer' as const,
      accountStatus: 'approved' as const,
      membership: null,
    };

    expect(isOrganizer(organizerUser)).toBe(true);
    expect(canAccessTrack(organizerUser, 'track-1')).toBe(true);
    expect(canAccessTrack(organizerUser, 'track-2')).toBe(true);
  });

  it('Approved Head can only access assigned track', () => {
    const headUser = {
      id: 'head-1',
      email: 'web.head@gdgoc-busb.org',
      fullName: 'Web Head',
      role: 'head' as const,
      accountStatus: 'approved' as const,
      membership: {
        id: 'mem-1',
        trackId: 'track-web',
        trackName: 'Web Development',
        role: 'head' as const,
        status: 'approved' as const,
      },
    };

    expect(isOrganizer(headUser)).toBe(false);
    expect(isApprovedLeader(headUser)).toBe(true);
    expect(canAccessTrack(headUser, 'track-web')).toBe(true);
    expect(canAccessTrack(headUser, 'track-ai')).toBe(false);
  });

  it('Pending Head is blocked from all track resources', () => {
    const pendingUser = {
      id: 'pending-1',
      email: 'pending@gdgoc-busb.org',
      fullName: 'Pending Applicant',
      role: 'head' as const,
      accountStatus: 'pending' as const,
      membership: {
        id: 'mem-2',
        trackId: 'track-web',
        trackName: 'Web Development',
        role: 'head' as const,
        status: 'pending' as const,
      },
    };

    expect(isApprovedLeader(pendingUser)).toBe(false);
    expect(canAccessTrack(pendingUser, 'track-web')).toBe(false);
  });
});

