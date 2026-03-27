import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// API Routes
app.use('/api', contactRoutes);
app.use('/api', adminRoutes);
app.use('/api', galleryRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'DND Backend is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Uploaded image is too large' });
  }

  if (error) {
    console.error('Unhandled application error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }

  next();
});

export default app;
