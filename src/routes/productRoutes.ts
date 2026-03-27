import { Router } from 'express';
import { createProduct, deleteProduct, getProducts, updateProduct } from '../controllers/productController.js';

const router = Router();

router.get('/products', getProducts);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products', deleteProduct);

export default router;
