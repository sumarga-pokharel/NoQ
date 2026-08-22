import express from 'express';
import { updateProfile, runSetup, updateDocuments } from '../controllers/providerController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect);
router.put('/me', updateProfile);
router.put('/setup', runSetup);
router.put('/documents', updateDocuments);

export default router;
