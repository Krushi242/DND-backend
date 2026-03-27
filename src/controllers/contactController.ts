import type { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import 'dotenv/config';
import pool from '../config/db.js';

// Configure Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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

    const mailOptions = {
      from: process.env.EMAIL_FROM || `"DRD Plantech Leads" <${process.env.SMTP_USER}>`,
      to: process.env.EMAIL_TO || process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER,
      subject: `New Lead: ${name} from ${city}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #005948;">New Contact Inquiry</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Phone:</strong> ${phone}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Company:</strong> ${company || 'N/A'}</p>
          <p><strong>City:</strong> ${city}</p>
          <p><strong>Inquiry Type:</strong> ${inquiry_type}</p>
          <p><strong>Message:</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-radius: 5px;">
            ${message}
          </div>
          <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;" />
          <p style="font-size: 12px; color: #666;">This is an automated notification from the DRD Plantech Website.</p>
        </div>
      `,
    };

    let notificationSent = false;

    try {
      await transporter.sendMail(mailOptions);
      notificationSent = true;
      console.log('Notification email sent successfully');
    } catch (mailError) {
      console.error('Failed to send notification email:', mailError);
    }

    res.status(201).json({
      message: notificationSent
        ? 'Contact form submitted successfully'
        : 'Contact saved, but email notification failed',
      contactId: (result as { insertId: number }).insertId,
      notificationSent,
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
