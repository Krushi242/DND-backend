import type { RowDataPacket } from 'mysql2';

export interface ProductVariant extends RowDataPacket {
  id: number;
  product_id: number;
  title: string;
  image: string;
  description: string | null;
  display_order: number | null;
  is_active: number;
}

export interface Product extends RowDataPacket {
  id: number;
  name: string;
  created_at: Date;
  display_order: number | null;
  is_active: number;
}

export interface ProductWithVariants {
  id: number;
  name: string;
  created_at: Date;
  display_order: number | null;
  is_active: number;
  variants: Array<{
    id: number;
    title: string;
    image: string;
    description: string | null;
    display_order: number | null;
    is_active: number;
  }>;
}
