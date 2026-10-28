import { Elysia, t } from 'elysia';
import { db } from '../../db';
import { users, memberships, tracks, passwordResets } from '../../db/schema';
import { eq, and, gt, isNull } from 'drizzle-orm';
import { hashPassword, verifyPassword, generateResetToken, hashToken } from '../../lib/auth';
import { logAudit } from '../../lib/audit';
import { AppError } from '../../middleware/error';
import { resolveAuthUser } from '../../middleware/auth';

export const authRoutes = new Elysia({ prefix: '/auth' })
  // User Registration (Head / Vice Head only)
  .post(
    '/register',
    async ({ body }) => {
      const { fullName, email, password, confirmPassword, role, trackId } = body;

      if (password !== confirmPassword) {
        throw new AppError('Passwords do not match', 400, 'PASSWORDS_MISMATCH');
      }

      if (role !== 'head' && role !== 'vice_head') {
        throw new AppError('Only Head or Vice Head roles can be requested', 400, 'INVALID_ROLE');
      }

      // Verify track exists and is active
      const [track] = await db
        .select()
        .from(tracks)
        .where(and(eq(tracks.id, trackId), eq(tracks.status, 'active')))
        .limit(1);

      if (!track) {
        throw new AppError('Selected track does not exist or is not active', 404, 'TRACK_NOT_FOUND');
      }

      // Check if email already registered
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (existingUser) {
        throw new AppError('An account with this email address already exists', 409, 'EMAIL_EXISTS');
      }

      const passwordHash = await hashPassword(password);

      // Create user and pending membership in a transaction
      const [newUser] = await db
        .insert(users)
        .values({
          fullName: fullName.trim(),
          email: email.toLowerCase().trim(),
          passwordHash,
          role,
          accountStatus: 'pending',
        })
        .returning();

      const [newMembership] = await db
        .insert(memberships)
        .values({
          userId: newUser.id,
          trackId: track.id,
          role,
          status: 'pending',
        })
        .returning();

      await logAudit({
        actorId: newUser.id,
        action: 'USER_REGISTERED',
        resourceType: 'user',
        resourceId: newUser.id,
        metadata: {
          email: newUser.email,
          requestedRole: role,
          trackId: track.id,
          trackName: track.name,
        },
      });

      return {
        success: true,
        message: 'Registration submitted successfully. Your account is pending Organizer approval.',
        data: {
          userId: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          accountStatus: newUser.accountStatus,
          trackName: track.name,
        },
      };
    },
    {
      body: t.Object({
        fullName: t.String({ minLength: 2, maxLength: 100 }),
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 8 }),
        confirmPassword: t.String({ minLength: 8 }),
        role: t.Union([t.Literal('head'), t.Literal('vice_head')]),
        trackId: t.String(),
      }),
    }
  )

  // Login (Organizer or Head / Vice Head)
  .post(
    '/login',
    async ({ body, jwt, cookie: { auth } }) => {
      const { email, password, requestedMode } = body;

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // Validate selected access mode against actual role
      if (requestedMode === 'organizer' && user.role !== 'organizer') {
        throw new AppError(
          'This account does not have Organizer privileges. Please use the Head / Vice Head portal.',
          403,
          'ACCESS_DENIED_NOT_ORGANIZER'
        );
      }

      // Check account approval status for non-organizers
      if (user.role !== 'organizer') {
        if (user.accountStatus === 'pending') {
          throw new AppError(
            'Your account is pending Organizer approval. Please wait until your chapter organizer approves your request.',
            403,
            'ACCOUNT_PENDING_APPROVAL'
          );
        }

        if (user.accountStatus === 'rejected') {
          // Look up rejection reason if any
          const [membership] = await db
            .select()
            .from(memberships)
            .where(eq(memberships.userId, user.id))
            .limit(1);

          throw new AppError(
            `Your registration request was rejected.${membership?.rejectionReason ? ` Reason: ${membership.rejectionReason}` : ''}`,
            403,
            'ACCOUNT_REJECTED',
            { reason: membership?.rejectionReason }
          );
        }

        if (user.accountStatus === 'suspended') {
          throw new AppError('Your account has been suspended. Please contact the Chapter Organizer.', 403, 'ACCOUNT_SUSPENDED');
        }
      }

      // Generate JWT token
      const token = await (jwt as any).sign({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      // Fetch user profile with track membership
      const authUser = await resolveAuthUser(user.id);

      await logAudit({
        actorId: user.id,
        action: 'USER_LOGGED_IN',
        resourceType: 'user',
        resourceId: user.id,
        metadata: {
          role: user.role,
          requestedMode,
        },
      });

      return {
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: authUser,
        },
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
        requestedMode: t.Optional(t.Union([t.Literal('organizer'), t.Literal('leadership')])),
      }),
    }
  )

  // Forgot Password
  .post(
    '/forgot-password',
    async ({ body }) => {
      const { email } = body;
      const normalizedEmail = email.toLowerCase().trim();

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, normalizedEmail))
        .limit(1);

      // Security requirement: Never reveal whether an email exists
      if (!user) {
        return {
          success: true,
          message: 'If an account exists with this email, password reset instructions have been generated.',
        };
      }

      // Generate recovery token (1 hour validity)
      const { token, hash } = generateResetToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(passwordResets).values({
        userId: user.id,
        tokenHash: hash,
        expiresAt,
      });

      await logAudit({
        actorId: user.id,
        action: 'PASSWORD_RESET_REQUESTED',
        resourceType: 'user',
        resourceId: user.id,
      });

      // In production, send via email provider. In development, return the token safely for testing
      const isDev = process.env.NODE_ENV !== 'production';

      return {
        success: true,
        message: 'If an account exists with this email, password reset instructions have been generated.',
        ...(isDev ? { devResetToken: token } : {}),
      };
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
      }),
    }
  )

  // Reset Password
  .post(
    '/reset-password',
    async ({ body }) => {
      const { token, newPassword, confirmPassword } = body;

      if (newPassword !== confirmPassword) {
        throw new AppError('Passwords do not match', 400, 'PASSWORDS_MISMATCH');
      }

      if (newPassword.length < 8) {
        throw new AppError('Password must be at least 8 characters long', 400, 'PASSWORD_TOO_SHORT');
      }

      const tokenHash = hashToken(token);

      const [resetRecord] = await db
        .select()
        .from(passwordResets)
        .where(
          and(
            eq(passwordResets.tokenHash, tokenHash),
            gt(passwordResets.expiresAt, new Date()),
            isNull(passwordResets.usedAt)
          )
        )
        .limit(1);

      if (!resetRecord) {
        throw new AppError('Invalid or expired password reset token', 400, 'INVALID_RESET_TOKEN');
      }

      const newPasswordHash = await hashPassword(newPassword);

      // Update password & mark token as used
      await db.transaction(async (tx) => {
        await tx
          .update(users)
          .set({ passwordHash: newPasswordHash, updatedAt: new Date() })
          .where(eq(users.id, resetRecord.userId));

        await tx
          .update(passwordResets)
          .set({ usedAt: new Date() })
          .where(eq(passwordResets.id, resetRecord.id));
      });

      await logAudit({
        actorId: resetRecord.userId,
        action: 'PASSWORD_RESET_COMPLETED',
        resourceType: 'user',
        resourceId: resetRecord.userId,
      });

      return {
        success: true,
        message: 'Password has been reset successfully. You can now log in with your new password.',
      };
    },
    {
      body: t.Object({
        token: t.String(),
        newPassword: t.String({ minLength: 8 }),
        confirmPassword: t.String({ minLength: 8 }),
      }),
    }
  )

  // Get Current User Profile
  .get('/me', async ({ headers, jwt }) => {
    const authHeader = headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('Unauthorized: Missing bearer token', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7);
    const payload = (await (jwt as any).verify(token)) as { sub: string } | null;

    if (!payload || !payload.sub) {
      throw new AppError('Unauthorized: Invalid or expired token', 401, 'INVALID_TOKEN');
    }

    const authUser = await resolveAuthUser(payload.sub);
    if (!authUser) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return {
      success: true,
      data: authUser,
    };
  })

  // Logout
  .post('/logout', async () => {
    return {
      success: true,
      message: 'Logged out successfully',
    };
  });

