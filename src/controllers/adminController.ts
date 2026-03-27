import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import type { Admin, SafeAdmin } from '../models/adminModel.js';

const SALT_ROUNDS = 10;

const toSafeAdmin = (admin: Admin): SafeAdmin => ({
  id: admin.id,
  username: admin.username,
  email: admin.email,
  role: admin.role,
  created_at: admin.created_at,
});

const createAdminToken = (admin: SafeAdmin) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ admin }, jwtSecret, { expiresIn: '7d' });
};

export const createAdmin = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [result] = await pool.execute(
      'INSERT INTO admins (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const [rows] = await pool.query<Admin[]>(
      'SELECT id, username, email, password, role, created_at FROM admins WHERE id = ? LIMIT 1',
      [(result as { insertId: number }).insertId]
    );

    const admin = rows[0];

    if (!admin) {
      return res.status(500).json({ error: 'Admin created but could not be loaded' });
    }

    const safeAdmin = toSafeAdmin(admin);
    const token = createAdminToken(safeAdmin);

    return res.status(201).json({
      message: 'Admin created successfully',
      token,
      accessToken: token,
      admin: safeAdmin,
      user: safeAdmin,
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    return res.status(500).json({ error: 'Failed to create admin' });
  }
};

export const loginAdmin = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const [rows] = await pool.query<Admin[]>(
      'SELECT id, username, email, password, role, created_at FROM admins WHERE email = ? LIMIT 1',
      [email]
    );

    const admin = rows[0];

    if (!admin) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const safeAdmin = toSafeAdmin(admin);
    const token = createAdminToken(safeAdmin);

    return res.status(200).json({
      message: 'Login successful',
      token,
      accessToken: token,
      admin: safeAdmin,
      user: safeAdmin,
    });
  } catch (error) {
    console.error('Error logging in admin:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
};

export const getAdminProfile = async (req: Request, res: Response) => {
  if (!req.admin) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  return res.status(200).json({ admin: req.admin });
};
