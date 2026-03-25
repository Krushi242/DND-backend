import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import contactRoutes from './routes/contactRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes - Removed the '/api' prefix here because Vercel/api/index takes care of it
app.use('/', contactRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

export default app;
