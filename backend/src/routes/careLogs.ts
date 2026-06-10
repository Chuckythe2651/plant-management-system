import { Router } from 'express';
import { careLogController } from '../controllers/careLogController';
import { asyncHandler, validateId } from '../middleware/errorHandler';

const router = Router();
router.get('/', asyncHandler(careLogController.list));
router.post('/', asyncHandler(careLogController.create));
router.delete('/:id', validateId, asyncHandler(careLogController.delete));
export default router;
