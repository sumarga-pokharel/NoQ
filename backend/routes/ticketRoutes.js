import express from 'express';
import { getDashboard, createWalkIn } from '../controllers/ticketController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/dashboard', getDashboard);
router.post('/walk-in', createWalkIn);

export default router;
