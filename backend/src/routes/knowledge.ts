import { Router } from 'express';
import { knowledgeController } from '../controllers/knowledgeController';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.get('/search', asyncHandler(knowledgeController.search));
router.get('/:plantId', asyncHandler(knowledgeController.getForPlant));
router.post('/fetch', asyncHandler(knowledgeController.fetchAndCache));
export default router;
