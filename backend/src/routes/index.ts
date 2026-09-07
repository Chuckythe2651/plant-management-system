import { Router } from 'express';
import plantRoutes from './plants';
import locationRoutes from './locations';
import careLogRoutes from './careLogs';
import aiRoutes from './ai';
import settingsRoutes from './settings';
import knowledgeRoutes from './knowledge';
import uploadRoutes from './uploads';
import sensorRoutes from './sensors';
import mapsRoutes from './maps';

const router = Router();

router.use('/plants', plantRoutes);
router.use('/locations', locationRoutes);
router.use('/care-logs', careLogRoutes);
router.use('/ai', aiRoutes);
router.use('/settings', settingsRoutes);
router.use('/knowledge', knowledgeRoutes);
router.use('/uploads', uploadRoutes);
router.use('/sensors', sensorRoutes);
router.use('/maps', mapsRoutes);

export default router;
