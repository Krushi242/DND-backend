import { Router } from 'express';
import {
  createGalleryItem,
  deleteGalleryItem,
  getGalleryItems,
} from '../controllers/galleryController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.get('/gallery', getGalleryItems);
router.post('/gallery', authenticateAdmin, createGalleryItem);
router.delete('/gallery', authenticateAdmin, deleteGalleryItem);

export default router;
