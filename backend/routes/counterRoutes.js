import express from 'express';
import {
  listCounters,
  createCounter,
  updateCounter,
  deleteCounter,
  callNext,
  markArrived,
  completeTicket,
  skip,
} from '../controllers/counterController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.get('/', listCounters);
router.post('/', createCounter);
router.put('/:id', updateCounter);
router.delete('/:id', deleteCounter);
router.post('/:id/call-next', callNext);
router.post('/:id/arrived', markArrived);
router.post('/:id/complete', completeTicket);
router.post('/:id/skip', skip);

export default router;
