import { Router } from 'express';
import computeRoutes from './compute.js';

const router = Router();

router.use('/compute', computeRoutes);

export default router;