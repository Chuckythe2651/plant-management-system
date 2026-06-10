import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { asyncHandler } from '../middleware/errorHandler';
import { upload } from '../middleware/upload';
import rateLimit from 'express-rate-limit';

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many AI requests. Please wait a moment.' },
});

const router = Router();
router.post('/diagnose', aiLimiter, upload.single('image'), asyncHandler(aiController.diagnose));
router.get('/history', asyncHandler(aiController.history));
router.get('/providers', asyncHandler(aiController.providers));
export default router;
