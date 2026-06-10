import { Router, Request, Response } from 'express';
import { upload } from '../middleware/upload';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.post(
  '/',
  upload.single('image'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No file uploaded' });
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    res.status(201).json({ success: true, data: { url, filename: req.file.filename } });
  })
);

export default router;
