import { Router } from 'express';
import { sensorController } from '../controllers/sensorController';
import { asyncHandler, validateId } from '../middleware/errorHandler';

const router = Router();
router.get('/', asyncHandler(sensorController.list));
router.post('/', asyncHandler(sensorController.create));
router.post('/sync-all', asyncHandler(sensorController.syncAll));
router.post('/:id/sync', validateId, asyncHandler(sensorController.sync));
router.delete('/:id', validateId, asyncHandler(sensorController.delete));
export default router;
