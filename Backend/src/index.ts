import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
import { swagger } from '@elysiajs/swagger';
import { config } from './config';
import { errorHandler } from './middleware/error';
import { authRoutes } from './modules/auth';
import { trackRoutes } from './modules/tracks';
import { seasonRoutes } from './modules/seasons';
import { approvalRoutes } from './modules/approvals';
import { sessionRoutes } from './modules/sessions';
import { sessionAssetRoutes } from './modules/session-assets';
import { dashboardRoutes } from './modules/dashboard';
import { reportRoutes } from './modules/reports';
import { auditRoutes } from './modules/audit';
import { runSeed } from './db/seed/seed';
import { queryClient } from './db';

const app = new Elysia()
  // Global Error Handler
  .onError(errorHandler)

  // Request logging
  .onRequest(({ request }) => {
    const start = Date.now();
    const url = new URL(request.url);
    if (!url.pathname.includes('/health')) {
      console.log(`[${new Date().toISOString()}] ${request.method} ${url.pathname}`);
    }
  })

  // CORS Configuration
  .use(
    cors({
      origin: true, // Allow frontend origin
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    })
  )

  // JWT Configuration
  .use(
    jwt({
      name: 'jwt',
      secret: config.jwt.secret,
      exp: config.jwt.expiresIn,
    })
  )

  // Swagger Documentation
  .use(
    swagger({
      path: '/swagger',
      documentation: {
        info: {
          title: 'GDGoC BUSB Chapter Management API',
          version: '1.0.0',
          description: 'Official API for Google Developer Groups on Campus — BUSB Chapter Operations',
        },
        tags: [
          { name: 'Auth', description: 'Authentication and password recovery' },
          { name: 'Tracks', description: 'Chapter tracks management' },
          { name: 'Seasons', description: 'Academic seasons management' },
          { name: 'Approvals', description: 'Head & Vice Head registration approvals' },
          { name: 'Sessions', description: 'Session reports lifecycle and workflows' },
          { name: 'Assets', description: 'Session photo and file attachments' },
          { name: 'Dashboard', description: 'Role-based operational dashboards' },
          { name: 'Reports', description: 'Aggregated analytics and CSV exports' },
          { name: 'Audit', description: 'System audit logs' },
        ],
      },
    })
  )

  // Health Check Endpoint (Render & Monitoring)
  .get('/health', async () => {
    let dbStatus = 'disconnected';
    try {
      await queryClient`SELECT 1`;
      dbStatus = 'connected';
    } catch (e: any) {
      dbStatus = `unreachable: ${e.message}`;
    }

    return {
      status: 'healthy',
      service: 'gdgoc-busb-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: dbStatus,
      env: config.env,
    };
  })

  // API v1 Routes
  .group('/api/v1', (api) =>
    api
      .use(authRoutes)
      .use(trackRoutes)
      .use(seasonRoutes)
      .use(approvalRoutes)
      .use(sessionRoutes)
      .use(sessionAssetRoutes)
      .use(dashboardRoutes)
      .use(reportRoutes)
      .use(auditRoutes)
  );

// Start server only when run directly
if (import.meta.main) {
  const port = config.port;
  const hostname = config.host;

  app.listen({ port, hostname }, async ({ port, hostname }) => {
    console.log(`🚀 GDGoC BUSB Backend API running at http://${hostname}:${port}`);
    console.log(`📚 Swagger documentation available at http://${hostname}:${port}/swagger`);

    // Optionally auto-seed if database is connected
    try {
      await queryClient`SELECT 1`;
      console.log('📦 Database connected. Checking seeds...');
      await runSeed();
    } catch (err: any) {
      console.warn('⚠️ Notice: PostgreSQL not currently reachable or requires migration. Run "bun run db:seed" once DB is connected.');
    }
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down server gracefully...');
    await queryClient.end();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Shutting down server gracefully...');
    await queryClient.end();
    process.exit(0);
  });
}

export default app;
export type App = typeof app;
