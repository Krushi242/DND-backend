import { Router } from 'express';
import {
  createGalleryItem,
  deleteGalleryItem,
  getGalleryItems,
} from '../controllers/galleryController.js';

const router = Router();

router.get('/gallery', getGalleryItems);
router.post('/gallery', createGalleryItem);
router.delete('/gallery', deleteGalleryItem);

export default router;
