import express from 'express';
import cors from 'cors';
import pool from './src/config/db.js';
import videoRoutes from './src/routes/videoRoutes.js';
import galleryRoutes from './src/routes/galleryRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', videoRoutes);
app.use('/api', galleryRoutes);

const server = app.listen(0, async () => {
  const port = server.address().port;
  console.log(`Test server running on port ${port}`);

  try {
    // 1. Insert video
    const [insertResult] = await pool.execute(
      'INSERT INTO videos (video_url) VALUES (?)',
      ['https://test.com/video']
    );
    const videoId = insertResult.insertId;
    console.log(`Inserted video with ID ${videoId}`);

    // 2. HTTP DELETE
    const response = await fetch(`http://127.0.0.1:${port}/api/videos?id=${videoId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    });

    const body = await response.json();
    console.log(`DELETE video status: ${response.status}`, body);

    // 3. Cleanup
    pool.end();
    server.close();
  } catch (err) {
    console.error('Test failed:', err);
    pool.end();
    server.close();
  }
});
