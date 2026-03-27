import { Router } from 'express';
import { createAdmin, getAdminProfile, loginAdmin } from '../controllers/adminController.js';
import { authenticateAdmin } from '../middleware/authMiddleware.js';

const router = Router();

router.post('/admins', createAdmin);
router.post('/admin/login', loginAdmin);
router.get('/admin/profile', authenticateAdmin, getAdminProfile);
router.get('/admin/me', authenticateAdmin, getAdminProfile);

export default router;
