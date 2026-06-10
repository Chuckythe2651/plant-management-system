import { Router } from 'express';
import { locationController } from '../controllers/locationController';
import { asyncHandler, validateId } from '../middleware/errorHandler';

const router = Router();
router.get('/', asyncHandler(locationController.list));
router.get('/:id', validateId, asyncHandler(locationController.getById));
router.post('/', asyncHandler(locationController.create));
router.put('/:id', validateId, asyncHandler(locationController.update));
router.delete('/:id', validateId, asyncHandler(locationController.delete));
export default router;
