import type { Request, Response } from 'express';
import pool from '../config/db.js';
import type { GalleryItem } from '../models/galleryModel.js';

export const getGalleryItems = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<GalleryItem[]>(
      'SELECT id, title, image, description, status, created_at FROM gallery WHERE status = 1 ORDER BY created_at DESC'
    );

    return res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching gallery items:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createGalleryItem = async (req: Request, res: Response) => {
  const { title, image, description, category, status } = req.body;
  const normalizedDescription = description ?? category ?? null;

  if (!title || !image) {
    return res.status(400).json({ error: 'Title and image are required' });
  }

  try {
    const normalizedStatus = status === 0 ? 0 : 1;
    const [result] = await pool.execute(
      'INSERT INTO gallery (title, image, description, status) VALUES (?, ?, ?, ?)',
      [title, image, normalizedDescription, normalizedStatus]
    );

    const galleryId = (result as { insertId: number }).insertId;
    const [rows] = await pool.query<GalleryItem[]>(
      'SELECT id, title, image, description, status, created_at FROM gallery WHERE id = ? LIMIT 1',
      [galleryId]
    );

    return res.status(201).json({
      message: 'Gallery item created successfully',
      item: rows[0] ?? {
        id: galleryId,
        title,
        image,
        description: normalizedDescription,
        status: normalizedStatus,
      },
    });
  } catch (error) {
    console.error('Error creating gallery item:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteGalleryItem = async (req: Request, res: Response) => {
  const rawId = req.query.id ?? req.body?.id ?? req.params?.id;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'A valid gallery id is required' });
  }

  try {
    const [result] = await pool.execute(
      'UPDATE gallery SET status = 0 WHERE id = ? AND status = 1',
      [id]
    );

    const affectedRows = (result as { affectedRows: number }).affectedRows;

    if (!affectedRows) {
      return res.status(404).json({ error: 'Gallery item not found' });
    }

    return res.status(200).json({ message: 'Gallery item deleted successfully' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
