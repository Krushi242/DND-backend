import type { Request, Response } from 'express';
import pool from '../config/db.js';
import type { Contact } from '../models/contactModel.js';

export const submitContact = async (req: Request, res: Response) => {
  const { name, phone, email, company, city, inquiry_type, message } = req.body;

  if (!name || !phone || !email || !message) {
    return res.status(400).json({ error: 'Required fields are missing' });
  }

  try {
    const [result] = await pool.execute(
      'INSERT INTO contacts (name, phone, email, company, city, inquiry_type, message) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, phone, email, company, city, inquiry_type, message]
    );

    res.status(201).json({ 
      message: 'Contact form submitted successfully', 
      contactId: (result as any).insertId 
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getContacts = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query('SELECT * FROM contacts ORDER BY created_at DESC');
    res.status(200).json(rows);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
