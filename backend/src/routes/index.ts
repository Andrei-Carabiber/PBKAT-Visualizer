import { Router } from 'express';
import computeRoutes from './compute';

const router = Router();

router.use('/compute', computeRoutes);

export default router;