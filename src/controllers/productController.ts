import type { Request, Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db.js';
import type { ProductVariant, ProductWithVariants } from '../models/productModel.js';

interface ProductJoinRow extends RowDataPacket {
  product_id: number;
  product_name: string;
  product_created_at: Date;
  variant_id: number | null;
  variant_title: string | null;
  variant_image: string | null;
  variant_description: string | null;
}

interface ProductVariantInput {
  id?: number;
  title?: string;
  image?: string;
  description?: string | null;
}

const buildProductFromRows = (rows: ProductJoinRow[], fallback?: { id: number; name: string }) : ProductWithVariants => ({
  id: rows[0]?.product_id ?? fallback?.id ?? 0,
  name: rows[0]?.product_name ?? fallback?.name ?? '',
  created_at: rows[0]?.product_created_at ?? new Date(),
  variants: rows
    .filter((row) => row.variant_id !== null)
    .map((row) => ({
      id: row.variant_id as number,
      title: row.variant_title ?? '',
      image: row.variant_image ?? '',
      description: row.variant_description,
    })),
});

const getProductById = async (productId: number) => {
  const [rows] = await pool.query<ProductJoinRow[]>(
    `SELECT
       p.id AS product_id,
       p.name AS product_name,
       p.created_at AS product_created_at,
       pv.id AS variant_id,
       pv.title AS variant_title,
       pv.image AS variant_image,
       pv.description AS variant_description
     FROM products p
     LEFT JOIN product_variants pv ON pv.product_id = p.id
     WHERE p.id = ?
     ORDER BY pv.id ASC`,
    [productId]
  );

  return rows;
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const [rows] = await pool.query<ProductJoinRow[]>(
      `SELECT
         p.id AS product_id,
         p.name AS product_name,
         p.created_at AS product_created_at,
         pv.id AS variant_id,
         pv.title AS variant_title,
         pv.image AS variant_image,
         pv.description AS variant_description
       FROM products p
       LEFT JOIN product_variants pv ON pv.product_id = p.id
       ORDER BY p.created_at DESC, p.id DESC, pv.id ASC`
    );

    const productsMap = new Map<number, ProductWithVariants>();

    for (const row of rows) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          created_at: row.product_created_at,
          variants: [],
        });
      }

      if (row.variant_id !== null) {
        productsMap.get(row.product_id)?.variants.push({
          id: row.variant_id,
          title: row.variant_title ?? '',
          image: row.variant_image ?? '',
          description: row.variant_description,
        });
      }
    }

    return res.status(200).json(Array.from(productsMap.values()));
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  const { name, variants } = req.body as {
    name?: string;
    variants?: ProductVariantInput[];
  };

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'At least one variant is required' });
  }

  const normalizedVariants = variants.map((variant) => ({
    title: typeof variant?.title === 'string' ? variant.title.trim() : '',
    image: typeof variant?.image === 'string' ? variant.image.trim() : '',
    description: typeof variant?.description === 'string' ? variant.description : null,
  }));

  const hasInvalidVariant = normalizedVariants.some((variant) => !variant.title || !variant.image);

  if (hasInvalidVariant) {
    return res.status(400).json({ error: 'Each variant must include title and image' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [productResult] = await connection.execute<ResultSetHeader>(
      'INSERT INTO products (name) VALUES (?)',
      [name.trim()]
    );

    const productId = productResult.insertId;

    for (const variant of normalizedVariants) {
      await connection.execute(
        'INSERT INTO product_variants (product_id, title, image, description) VALUES (?, ?, ?, ?)',
        [productId, variant.title, variant.image, variant.description]
      );
    }

    await connection.commit();

    const rows = await getProductById(productId);
    const product = buildProductFromRows(rows, { id: productId, name: name.trim() });

    return res.status(201).json({
      message: 'Product created successfully',
      product,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const { name, variants } = req.body as {
    name?: string;
    variants?: ProductVariantInput[];
  };

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'A valid product id is required' });
  }

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'At least one variant is required' });
  }

  const normalizedVariants = variants.map((variant) => ({
    id: Number.isInteger(variant?.id) && Number(variant.id) > 0 ? Number(variant.id) : null,
    title: typeof variant?.title === 'string' ? variant.title.trim() : '',
    image: typeof variant?.image === 'string' ? variant.image.trim() : '',
    description: typeof variant?.description === 'string' ? variant.description : null,
  }));

  const hasInvalidVariant = normalizedVariants.some((variant) => !variant.title || !variant.image);

  if (hasInvalidVariant) {
    return res.status(400).json({ error: 'Each variant must include title and image' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [productRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, created_at FROM products WHERE id = ? LIMIT 1',
      [id]
    );

    if (!productRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const [existingVariantRows] = await connection.query<ProductVariant[]>(
      'SELECT id, product_id, title, image, description FROM product_variants WHERE product_id = ? ORDER BY id ASC',
      [id]
    );

    const existingVariantIds = new Set(existingVariantRows.map((variant) => variant.id));
    const requestedExistingVariantIds = new Set<number>();

    for (const variant of normalizedVariants) {
      if (variant.id !== null) {
        if (!existingVariantIds.has(variant.id)) {
          await connection.rollback();
          return res.status(400).json({ error: `Variant ${variant.id} does not belong to this product` });
        }

        requestedExistingVariantIds.add(variant.id);
      }
    }

    await connection.execute<ResultSetHeader>(
      'UPDATE products SET name = ? WHERE id = ?',
      [name.trim(), id]
    );

    for (const variant of normalizedVariants) {
      if (variant.id !== null) {
        await connection.execute(
          'UPDATE product_variants SET title = ?, image = ?, description = ? WHERE id = ? AND product_id = ?',
          [variant.title, variant.image, variant.description, variant.id, id]
        );
      } else {
        await connection.execute(
          'INSERT INTO product_variants (product_id, title, image, description) VALUES (?, ?, ?, ?)',
          [id, variant.title, variant.image, variant.description]
        );
      }
    }

    for (const existingVariantId of existingVariantIds) {
      if (!requestedExistingVariantIds.has(existingVariantId)) {
        await connection.execute(
          'DELETE FROM product_variants WHERE id = ? AND product_id = ?',
          [existingVariantId, id]
        );
      }
    }

    await connection.commit();

    const rows = await getProductById(id);
    const product = buildProductFromRows(rows, { id, name: name.trim() });

    return res.status(200).json({
      message: 'Product updated successfully',
      product,
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  } finally {
    connection.release();
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  const rawId = req.query.id ?? req.body?.id ?? req.params?.id;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'A valid product id is required' });
  }

  try {
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM products WHERE id = ?',
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
