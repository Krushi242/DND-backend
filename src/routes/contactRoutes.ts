import { Router } from 'express';
import { submitContact, getContacts } from '../controllers/contactController.js';

const router = Router();

router.post('/contact', submitContact);
router.get('/contacts', getContacts);

export default router;
