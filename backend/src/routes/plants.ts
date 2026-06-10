import { Router } from 'express';
import { plantController } from '../controllers/plantController';
import { knowledgeController } from '../controllers/knowledgeController';
import { asyncHandler, validateId } from '../middleware/errorHandler';

const router = Router();

/**
 * @swagger
 * /api/v1/plants:
 *   get:
 *     summary: List all plants
 *     tags: [Plants]
 *     parameters:
 *       - in: query
 *         name: location_id
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of plants
 */
router.get('/', asyncHandler(plantController.list));

/**
 * @swagger
 * /api/v1/plants/due-soon:
 *   get:
 *     summary: Get plants due for watering soon
 *     tags: [Plants]
 */
router.get('/due-soon', asyncHandler(plantController.dueSoon));

/**
 * @swagger
 * /api/v1/plants/search:
 *   get:
 *     summary: Search plant species via Perenual API
 *     tags: [Plants]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *         description: Plant name search query
 */
router.get('/search', asyncHandler(knowledgeController.search));

/**
 * @swagger
 * /api/v1/plants/{id}:
 *   get:
 *     summary: Get a plant by ID
 *     tags: [Plants]
 */
router.get('/:id', validateId, asyncHandler(plantController.getById));

/**
 * @swagger
 * /api/v1/plants:
 *   post:
 *     summary: Create a plant
 *     tags: [Plants]
 */
router.post('/', asyncHandler(plantController.create));

/**
 * @swagger
 * /api/v1/plants/{id}:
 *   put:
 *     summary: Update a plant
 *     tags: [Plants]
 */
router.put('/:id', validateId, asyncHandler(plantController.update));

/**
 * @swagger
 * /api/v1/plants/{id}:
 *   delete:
 *     summary: Delete a plant
 *     tags: [Plants]
 */
router.delete('/:id', validateId, asyncHandler(plantController.delete));

/**
 * @swagger
 * /api/v1/plants/{id}/water:
 *   post:
 *     summary: Log watering event
 *     tags: [Plants]
 */
router.post('/:id/water', validateId, asyncHandler(plantController.water));

export default router;
