import { Router } from 'express';
import { settingsController } from '../controllers/settingsController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.get('/', asyncHandler(settingsController.list));
router.put('/', asyncHandler(settingsController.update));
router.get('/health', asyncHandler(settingsController.healthCheck));
export default router;
