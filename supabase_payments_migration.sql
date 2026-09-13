-- ==============================================================
-- SUPABASE MIGRATION SCRIPT: STAGED / PARTIAL PAYMENT SYSTEM
-- Run this script in your Supabase SQL Editor
-- ==============================================================

-- 1. Create invoice_payments table
CREATE TABLE IF NOT EXISTS public.invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('Cash', 'Card', 'Bank Transfer', 'Online', 'Other')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_payment_date ON public.invoice_payments(payment_date);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy for Authenticated Users
DROP POLICY IF EXISTS "Allow authenticated access to invoice_payments" ON public.invoice_payments;
CREATE POLICY "Allow authenticated access to invoice_payments" ON public.invoice_payments
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Data Migration for Pre-existing Invoices
-- Automatically creates an initial payment record for existing invoices that have `paid > 0`
-- and do not yet have any records in `invoice_payments`.
INSERT INTO public.invoice_payments (invoice_id, payment_date, amount, payment_method, notes)
SELECT 
    i.id,
    COALESCE(i.date::date, CURRENT_DATE),
    i.paid,
    'Other',
    'Initial payment record (Migrated from existing invoice)'
FROM public.invoices i
WHERE i.paid > 0 
  AND NOT EXISTS (
    SELECT 1 FROM public.invoice_payments ip WHERE ip.invoice_id = i.id
  );
