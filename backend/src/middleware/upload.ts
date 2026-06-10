import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { config } from '../config';
import { AppError } from './errorHandler';

// Ensure upload dir exists
if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, config.uploads.dir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (config.uploads.allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(400, `File type ${file.mimetype} not allowed. Use JPEG, PNG, WebP, or GIF.`));
    }
  },
});
