import type { RowDataPacket } from 'mysql2';

export interface GalleryItem extends RowDataPacket {
  id: number;
  title: string;
  image: string;
  description: string | null;
  status: number;
  created_at: Date;
}
