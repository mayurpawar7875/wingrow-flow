-- Add missing fields to inventory_items
ALTER TABLE public.inventory_items 
ADD COLUMN IF NOT EXISTS price_per_item DECIMAL(10,2) DEFAULT 0 CHECK (price_per_item >= 0),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS item_version INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- Ensure unique constraint on itemName (handle existing constraint)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_item_name'
  ) THEN
    ALTER TABLE public.inventory_items ADD CONSTRAINT unique_item_name UNIQUE (name);
  END IF;
END $$;

-- Update inventory_transactions table to add audit fields
ALTER TABLE public.inventory_transactions 
ADD COLUMN IF NOT EXISTS prev_quantity INTEGER,
ADD COLUMN IF NOT EXISTS new_quantity INTEGER,
ADD COLUMN IF NOT EXISTS reason TEXT;

-- Create new transaction type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type') THEN
    CREATE TYPE transaction_type AS ENUM (
      'ISSUE',
      'RETURN', 
      'ADJUSTMENT_CREATE',
      'ADJUSTMENT_EDIT',
      'ADJUSTMENT_ARCHIVE',
      'Inbound',
      'Outbound'
    );
  END IF;
END $$;

-- Add type column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'inventory_transactions' 
    AND column_name = 'type'
  ) THEN
    ALTER TABLE public.inventory_transactions 
    ADD COLUMN type transaction_type DEFAULT 'ADJUSTMENT_CREATE'::transaction_type NOT NULL;
  END IF;
END $$;

-- Function to handle stock movement with version checking
CREATE OR REPLACE FUNCTION public.update_stock_with_version(
  _item_id UUID,
  _current_version INTEGER,
  _quantity_delta INTEGER,
  _movement_type TEXT,
  _reason TEXT,
  _performed_by UUID,
  _reference_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _prev_qty INTEGER;
  _new_qty INTEGER;
  _current_db_version INTEGER;
  _movement_id UUID;
  _result JSON;
BEGIN
  -- Get current version and quantity with row lock
  SELECT quantity_on_hand, item_version 
  INTO _prev_qty, _current_db_version
  FROM public.inventory_items
  WHERE id = _item_id
  FOR UPDATE;

  -- Check version conflict
  IF _current_db_version != _current_version THEN
    RAISE EXCEPTION 'Version conflict: Item was updated by another user'
      USING ERRCODE = 'P0001';
  END IF;

  -- Calculate new quantity
  _new_qty := _prev_qty + _quantity_delta;

  -- Prevent negative inventory
  IF _new_qty < 0 THEN
    RAISE EXCEPTION 'Insufficient inventory. Current: %, Requested: %', _prev_qty, ABS(_quantity_delta)
      USING ERRCODE = 'P0002';
  END IF;

  -- Update item quantity and increment version
  UPDATE public.inventory_items
  SET 
    quantity_on_hand = _new_qty,
    item_version = item_version + 1,
    updated_at = NOW()
  WHERE id = _item_id;

  -- Create stock movement record
  INSERT INTO public.inventory_transactions (
    item_id,
    type,
    quantity,
    prev_quantity,
    new_quantity,
    reason,
    reference,
    performed_by
  ) VALUES (
    _item_id,
    _movement_type::transaction_type,
    _quantity_delta,
    _prev_qty,
    _new_qty,
    _reason,
    _reference_id,
    _performed_by
  )
  RETURNING id INTO _movement_id;

  -- Check if low stock
  _result := json_build_object(
    'success', true,
    'movementId', _movement_id,
    'prevQuantity', _prev_qty,
    'newQuantity', _new_qty,
    'newVersion', _current_db_version + 1,
    'lowStock', (
      SELECT _new_qty <= reorder_level 
      FROM public.inventory_items 
      WHERE id = _item_id
    )
  );

  RETURN _result;
END;
$$;

-- Seed test data
INSERT INTO public.inventory_items (name, sku, unit, price_per_item, quantity_on_hand, reorder_level, item_version, is_archived)
VALUES 
  ('A4 Paper Ream', 'STA-A4-500', 'pack', 260.00, 40, 10, 0, false),
  ('Marker Pen', 'STA-MRK-BLK', 'pcs', 25.00, 120, 30, 0, false),
  ('Packaging Tape 2in', 'PKG-TAPE-2', 'roll', 55.00, 18, 12, 0, false)
ON CONFLICT (name) DO NOTHING;