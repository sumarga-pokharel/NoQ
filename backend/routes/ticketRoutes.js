import express from 'express';
import { getDashboard, getWaitingTickets, createWalkIn } from '../controllers/ticketController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/dashboard', getDashboard);
router.get('/waiting', getWaitingTickets);
router.post('/walk-in', createWalkIn);

export default router;
