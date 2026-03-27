import type { Request, Response } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '../config/db.js';
import type { ProductVariant, ProductWithVariants } from '../models/productModel.js';

interface ProductJoinRow extends RowDataPacket {
  product_id: number;
  product_name: string;
  product_created_at: Date;
  product_display_order: number | null;
  product_is_active: number;
  variant_id: number | null;
  variant_title: string | null;
  variant_image: string | null;
  variant_description: string | null;
  variant_display_order: number | null;
  variant_is_active: number | null;
}

interface ProductVariantInput {
  id?: number | string;
  title?: string;
  name?: string;
  image?: string;
  image_url?: string;
  description?: string | null;
  details?: string | null;
  display_order?: number | string | null;
  is_active?: number | string | boolean | null;
}

const buildProductFromRows = (rows: ProductJoinRow[], fallback?: {
  id: number;
  name: string;
  display_order?: number | null;
  is_active?: number;
}) : ProductWithVariants => ({
  id: rows[0]?.product_id ?? fallback?.id ?? 0,
  name: rows[0]?.product_name ?? fallback?.name ?? '',
  created_at: rows[0]?.product_created_at ?? new Date(),
  display_order: rows[0]?.product_display_order ?? fallback?.display_order ?? null,
  is_active: rows[0]?.product_is_active ?? fallback?.is_active ?? 1,
  variants: rows
    .filter((row) => row.variant_id !== null)
    .map((row) => ({
      id: row.variant_id as number,
      title: row.variant_title ?? '',
      image: row.variant_image ?? '',
      description: row.variant_description,
      display_order: row.variant_display_order,
      is_active: row.variant_is_active ?? 1,
    })),
});

const getProductById = async (productId: number, includeInactive = true) => {
  const [rows] = await pool.query<ProductJoinRow[]>(
    `SELECT
       p.id AS product_id,
       p.name AS product_name,
       p.created_at AS product_created_at,
       p.display_order AS product_display_order,
       p.is_active AS product_is_active,
       pv.id AS variant_id,
       pv.title AS variant_title,
       pv.image AS variant_image,
       pv.description AS variant_description,
       pv.display_order AS variant_display_order,
       pv.is_active AS variant_is_active
     FROM products p
     LEFT JOIN product_variants pv
       ON pv.product_id = p.id
      ${includeInactive ? '' : 'AND pv.is_active = 1'}
     WHERE p.id = ?
       ${includeInactive ? '' : 'AND p.is_active = 1'}
     ORDER BY COALESCE(pv.display_order, 2147483647) ASC, pv.id ASC`,
    [productId]
  );

  return rows;
};

const getTrimmedString = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();

      if (trimmed) {
        return trimmed;
      }
    }
  }

  return '';
};

const getOptionalText = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === 'string') {
      return value;
    }
  }

  return null;
};

const getOptionalNumber = (...values: Array<unknown>) => {
  for (const value of values) {
    if (value === null || value === undefined || value === '') {
      continue;
    }

    const numericValue = typeof value === 'string' ? Number(value.trim()) : Number(value);

    if (Number.isFinite(numericValue)) {
      return numericValue;
    }
  }

  return null;
};

const getActiveFlag = (...values: Array<unknown>) => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value ? 1 : 0;
    }

    if (typeof value === 'number') {
      return value === 0 ? 0 : 1;
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();

      if (['0', 'false', 'inactive', 'hidden', 'off'].includes(normalized)) {
        return 0;
      }

      if (['1', 'true', 'active', 'visible', 'on'].includes(normalized)) {
        return 1;
      }
    }
  }

  return 1;
};

const normalizeVariantInput = (variant: ProductVariantInput) => {
  const rawId = variant?.id;
  const numericId = typeof rawId === 'string' ? Number(rawId) : rawId;

  return {
    id: Number.isInteger(numericId) && Number(numericId) > 0 ? Number(numericId) : null,
    title: getTrimmedString(variant?.title, variant?.name),
    image: getTrimmedString(variant?.image, variant?.image_url),
    description: getOptionalText(variant?.description, variant?.details),
    display_order: getOptionalNumber(variant?.display_order),
    is_active: getActiveFlag(variant?.is_active),
  };
};

export const getProducts = async (req: Request, res: Response) => {
  try {
    const includeInactive = String(req.query.include_inactive ?? '').toLowerCase() === 'true';
    const [rows] = await pool.query<ProductJoinRow[]>(
      `SELECT
         p.id AS product_id,
         p.name AS product_name,
         p.created_at AS product_created_at,
         p.display_order AS product_display_order,
         p.is_active AS product_is_active,
         pv.id AS variant_id,
         pv.title AS variant_title,
         pv.image AS variant_image,
         pv.description AS variant_description,
         pv.display_order AS variant_display_order,
         pv.is_active AS variant_is_active
       FROM products p
       LEFT JOIN product_variants pv
         ON pv.product_id = p.id
        ${includeInactive ? '' : 'AND pv.is_active = 1'}
       ${includeInactive ? '' : 'WHERE p.is_active = 1'}
       ORDER BY
         COALESCE(p.display_order, 2147483647) ASC,
         p.created_at DESC,
         p.id DESC,
         COALESCE(pv.display_order, 2147483647) ASC,
         pv.id ASC`
    );

    const productsMap = new Map<number, ProductWithVariants>();

    for (const row of rows) {
      if (!productsMap.has(row.product_id)) {
        productsMap.set(row.product_id, {
          id: row.product_id,
          name: row.product_name,
          created_at: row.product_created_at,
          display_order: row.product_display_order,
          is_active: row.product_is_active,
          variants: [],
        });
      }

      if (row.variant_id !== null) {
        productsMap.get(row.product_id)?.variants.push({
          id: row.variant_id,
          title: row.variant_title ?? '',
          image: row.variant_image ?? '',
          description: row.variant_description,
          display_order: row.variant_display_order,
          is_active: row.variant_is_active ?? 1,
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
  const { name, product_name, title, display_order, is_active, variants } = req.body as {
    name?: string;
    product_name?: string;
    title?: string;
    display_order?: number | string | null;
    is_active?: number | string | boolean | null;
    variants?: ProductVariantInput[];
  };
  const productName = getTrimmedString(name, product_name, title);
  const productDisplayOrder = getOptionalNumber(display_order);
  const productIsActive = getActiveFlag(is_active);

  if (!productName) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'At least one variant is required' });
  }

  const normalizedVariants = variants.map(normalizeVariantInput);

  const hasInvalidVariant = normalizedVariants.some((variant) => !variant.title || !variant.image);

  if (hasInvalidVariant) {
    return res.status(400).json({ error: 'Each variant must include title and image' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [productResult] = await connection.execute<ResultSetHeader>(
      'INSERT INTO products (name, display_order, is_active) VALUES (?, ?, ?)',
      [productName, productDisplayOrder, productIsActive]
    );

    const productId = productResult.insertId;

    for (const variant of normalizedVariants) {
      await connection.execute(
        'INSERT INTO product_variants (product_id, title, image, description, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
        [productId, variant.title, variant.image, variant.description, variant.display_order, variant.is_active]
      );
    }

    await connection.commit();

    const rows = await getProductById(productId, true);
    const product = buildProductFromRows(rows, {
      id: productId,
      name: productName,
      display_order: productDisplayOrder,
      is_active: productIsActive,
    });

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
  const { name, product_name, title, display_order, is_active, variants } = req.body as {
    name?: string;
    product_name?: string;
    title?: string;
    display_order?: number | string | null;
    is_active?: number | string | boolean | null;
    variants?: ProductVariantInput[];
  };
  const productName = getTrimmedString(name, product_name, title);
  const productDisplayOrder = getOptionalNumber(display_order);
  const productIsActive = getActiveFlag(is_active);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'A valid product id is required' });
  }

  if (!productName) {
    return res.status(400).json({ error: 'Product name is required' });
  }

  if (!Array.isArray(variants) || variants.length === 0) {
    return res.status(400).json({ error: 'At least one variant is required' });
  }

  const normalizedVariants = variants.map(normalizeVariantInput);

  const hasInvalidVariant = normalizedVariants.some((variant) => !variant.title || !variant.image);

  if (hasInvalidVariant) {
    return res.status(400).json({ error: 'Each variant must include title and image' });
  }

  const duplicateVariantIds = normalizedVariants
    .filter((variant) => variant.id !== null)
    .map((variant) => variant.id as number);

  if (new Set(duplicateVariantIds).size !== duplicateVariantIds.length) {
    return res.status(400).json({ error: 'Duplicate variant ids are not allowed' });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [productRows] = await connection.query<RowDataPacket[]>(
      'SELECT id, name, created_at, display_order, is_active FROM products WHERE id = ? LIMIT 1',
      [id]
    );

    if (!productRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: 'Product not found' });
    }

    const [existingVariantRows] = await connection.query<ProductVariant[]>(
      'SELECT id, product_id, title, image, description, display_order, is_active FROM product_variants WHERE product_id = ? ORDER BY id ASC',
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
      'UPDATE products SET name = ?, display_order = ?, is_active = ? WHERE id = ?',
      [productName, productDisplayOrder, productIsActive, id]
    );

    for (const variant of normalizedVariants) {
      if (variant.id !== null) {
        await connection.execute(
          'UPDATE product_variants SET title = ?, image = ?, description = ?, display_order = ?, is_active = ? WHERE id = ? AND product_id = ?',
          [variant.title, variant.image, variant.description, variant.display_order, variant.is_active, variant.id, id]
        );
      } else {
        await connection.execute(
          'INSERT INTO product_variants (product_id, title, image, description, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
          [id, variant.title, variant.image, variant.description, variant.display_order, variant.is_active]
        );
      }
    }

    for (const existingVariantId of existingVariantIds) {
      if (!requestedExistingVariantIds.has(existingVariantId)) {
        await connection.execute(
          'UPDATE product_variants SET is_active = 0 WHERE id = ? AND product_id = ?',
          [existingVariantId, id]
        );
      }
    }

    await connection.commit();

    const rows = await getProductById(id, true);
    const product = buildProductFromRows(rows, {
      id,
      name: productName,
      display_order: productDisplayOrder,
      is_active: productIsActive,
    });

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
      'UPDATE products SET is_active = 0 WHERE id = ?',
      [id]
    );

    if (!result.affectedRows) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.status(200).json({ message: 'Product hidden successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
