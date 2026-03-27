import type { RowDataPacket } from 'mysql2';

export interface ProductVariant extends RowDataPacket {
  id: number;
  product_id: number;
  title: string;
  image: string;
  description: string | null;
}

export interface Product extends RowDataPacket {
  id: number;
  name: string;
  created_at: Date;
}

export interface ProductWithVariants {
  id: number;
  name: string;
  created_at: Date;
  variants: Array<{
    id: number;
    title: string;
    image: string;
    description: string | null;
  }>;
}
