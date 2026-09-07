import { Router } from 'express';
import { upload } from '../middleware/upload';
import { mapsController } from '../controllers/mapsController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/floor-plan', asyncHandler(mapsController.getFloorPlan));
router.post('/floor-plan', upload.single('image'), asyncHandler(mapsController.uploadFloorPlan));

export default router;
