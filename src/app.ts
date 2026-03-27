import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import contactRoutes from './routes/contactRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import galleryRoutes from './routes/galleryRoutes.js';
import videoRoutes from './routes/videoRoutes.js';

const app = express();
const MAX_VIDEO_UPLOAD_BYTES = 4 * 1024 * 1024;

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

app.use('/api/videos', (req, res, next) => {
  const contentLengthHeader = req.headers['content-length'];
  const contentLength = typeof contentLengthHeader === 'string' ? Number(contentLengthHeader) : NaN;

  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_UPLOAD_BYTES) {
    return res.status(413).json({ error: 'Video file must be 4 MB or smaller' });
  }

  next();
});

// API Routes
app.use('/api', contactRoutes);
app.use('/api', adminRoutes);
app.use('/api', galleryRoutes);
app.use('/api', videoRoutes);

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
