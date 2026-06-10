import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'plantdb',
    user: process.env.DB_USER || 'plantuser',
    password: process.env.DB_PASSWORD || 'plantpass',
  },

  uploads: {
    dir: process.env.UPLOAD_DIR || '/app/uploads',
    maxSizeMb: 10,
    allowedMimes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },

  cors: {
    origin: process.env.CORS_ORIGIN || '*',
  },
};
