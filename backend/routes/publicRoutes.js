import express from 'express';
import {
  getOfficeBySlug,
  joinQueue,
  getTicketStatus,
  holdPlace,
  leaveQueue,
  updateLocation,
  getDisplayBoard,
  getDirectory,
} from '../controllers/publicController.js';

const router = express.Router();

router.get('/directory', getDirectory);
router.get('/offices/:slug', getOfficeBySlug);
router.post('/offices/:slug/tickets', joinQueue);
router.get('/offices/:slug/display', getDisplayBoard);

router.get('/tickets/:id', getTicketStatus);
router.patch('/tickets/:id/hold', holdPlace);
router.patch('/tickets/:id/leave', leaveQueue);
router.patch('/tickets/:id/location', updateLocation);

export default router;
