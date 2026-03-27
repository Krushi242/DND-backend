import type { Request, Response } from 'express';
import pool from '../config/db.js';
import type { VideoItem } from '../models/videoModel.js';

export const getVideos = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<VideoItem[]>(
      'SELECT id, video_url, created_at FROM videos ORDER BY created_at DESC'
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching videos:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createVideo = async (req: Request, res: Response) => {
  const videoUrl = req.body?.video_url ?? req.body?.video ?? req.body?.url;

  if (!videoUrl) {
    return res.status(400).json({ error: 'video_url is required' });
  }

  if (typeof videoUrl !== 'string') {
    return res.status(400).json({ error: 'video_url must be a string' });
  }

  if (videoUrl.startsWith('data:')) {
    return res.status(400).json({
      error: 'Upload the video to storage first and send its public URL in video_url',
    });
  }

  try {
    const parsedUrl = new URL(videoUrl);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ error: 'video_url must be an http or https URL' });
    }
  } catch {
    return res.status(400).json({ error: 'video_url must be a valid URL' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO videos (video_url) VALUES (?)',
      [videoUrl]
    );

    const videoId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query<VideoItem[]>(
      'SELECT id, video_url, created_at FROM videos WHERE id = ? LIMIT 1',
      [videoId]
    );

    return res.status(201).json({
      message: 'Video created successfully',
      item: rows[0] ?? {
        id: videoId,
        video_url: videoUrl,
      },
    });
  } catch (error) {
    console.error('Error creating video:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteVideo = async (req: Request, res: Response) => {
  const rawId = req.query.id ?? req.body?.id ?? req.params?.id;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'A valid video id is required' });
  }

  try {
    const [result] = await pool.execute('DELETE FROM videos WHERE id = ?', [id]);
    const affectedRows = (result as { affectedRows: number }).affectedRows;

    if (!affectedRows) {
      return res.status(404).json({ error: 'Video not found' });
    }

    return res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
