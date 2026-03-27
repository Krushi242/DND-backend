import { Router } from 'express';
import { proxyGoogleDriveImage } from '../controllers/proxyController.js';

const router = Router();

router.get('/proxy', proxyGoogleDriveImage);

export default router;
