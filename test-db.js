import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const testDelete = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT || '3306'),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  try {
    console.log('Inserting test video...');
    const [insertResult] = await pool.execute(
      'INSERT INTO videos (video_url) VALUES (?)',
      ['https://www.youtube.com/watch?v=test']
    );
    const videoId = insertResult.insertId;
    console.log('Inserted with ID:', videoId);

    console.log('Deleting test video ID:', videoId);
    const [deleteResult] = await pool.execute('DELETE FROM videos WHERE id = ?', [videoId]);
    console.log('Delete result:', deleteResult);
    console.log('Affected rows:', deleteResult.affectedRows);
    
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    pool.end();
  }
};

testDelete();
