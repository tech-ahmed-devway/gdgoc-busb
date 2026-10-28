import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  host: process.env.HOST || '0.0.0.0',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gdgoc_busb',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret_key_change_in_production_min_32_characters_long',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  initialOrganizer: {
    email: process.env.INITIAL_ORGANIZER_EMAIL || 'organizer@gdgoc-busb.org',
    password: process.env.INITIAL_ORGANIZER_PASSWORD || 'OrganizerGDG2026!',
    name: process.env.INITIAL_ORGANIZER_NAME || 'Chapter Organizer',
  },
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    bucket: process.env.SUPABASE_STORAGE_BUCKET || 'session-assets',
  },
};

