import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import productRoutes from './routes/productRoutes.js';
import videoRoutes from './routes/videoRoutes.js';
import proxyRoutes from './routes/proxyRoutes.js';

const app = express();
const MAX_VIDEO_UPLOAD_BYTES = 4 * 1024 * 1024;
const MAX_GALLERY_UPLOAD_BYTES = 15 * 1024 * 1024;
const MAX_PRODUCTS_UPLOAD_BYTES = 15 * 1024 * 1024;

app.use(cors());

app.use('/api/videos', (req, res, next) => {
  const contentLengthHeader = req.headers['content-length'];
  const contentLength = typeof contentLengthHeader === 'string' ? Number(contentLengthHeader) : NaN;

  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_UPLOAD_BYTES) {
    return res.status(413).json({ error: 'Video file must be 4 MB or smaller' });
  }

  next();
});

app.use('/api/gallery', (req, res, next) => {
  const contentLengthHeader = req.headers['content-length'];
  const contentLength = typeof contentLengthHeader === 'string' ? Number(contentLengthHeader) : NaN;

  if (Number.isFinite(contentLength) && contentLength > MAX_GALLERY_UPLOAD_BYTES) {
    return res.status(413).json({ error: 'Gallery image payload is too large' });
  }

  next();
});

app.use('/api/products', (req, res, next) => {
  const contentLengthHeader = req.headers['content-length'];
  const contentLength = typeof contentLengthHeader === 'string' ? Number(contentLengthHeader) : NaN;

  if (Number.isFinite(contentLength) && contentLength > MAX_PRODUCTS_UPLOAD_BYTES) {
    return res.status(413).json({ error: 'Product payload is too large' });
  }

  next();
});

app.use('/api/gallery', express.json({ limit: '15mb' }));
app.use('/api/gallery', express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/api/products', express.json({ limit: '15mb' }));
app.use('/api/products', express.urlencoded({ extended: true, limit: '15mb' }));
app.use('/api/videos', express.json({ limit: '4mb' }));
app.use('/api/videos', express.urlencoded({ extended: true, limit: '4mb' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

app.use('/api/gallery', (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }

  next();
});

app.use('/api/videos', (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }

  next();
});

app.use('/api/products', (req, res, next) => {
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  }

  next();
});

// API Routes
app.use('/api', contactRoutes);
app.use('/api', adminRoutes);
app.use('/api', galleryRoutes);
app.use('/api', productRoutes);
app.use('/api', videoRoutes);
app.use('/api', proxyRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'DND Backend is running' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error?.type === 'entity.too.large') {
    if (req.path === '/api/videos' || req.originalUrl.includes('/api/videos')) {
      return res.status(413).json({ error: 'Video file must be 4 MB or smaller' });
    }

    return res.status(413).json({ error: 'Uploaded file is too large' });
  }

  if (error) {
    console.error('Unhandled application error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }

  next();
});

export default app;
