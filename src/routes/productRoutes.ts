import { Router } from 'express';
import { createProduct, deleteProduct, getProducts } from '../controllers/productController.js';

const router = Router();

router.get('/products', getProducts);
router.post('/products', createProduct);
router.delete('/products', deleteProduct);

export default router;
