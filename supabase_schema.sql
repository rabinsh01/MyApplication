-- ==========================================
-- SUPABASE DATABASE SCHEMA SETUP SCRIPT
-- Run this script in your Supabase SQL Editor
-- ==========================================

-- 1. Invoices Table
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT NOT NULL,
    date TEXT NOT NULL,
    client_name TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    paid NUMERIC NOT NULL DEFAULT 0,
    amount_due NUMERIC NOT NULL DEFAULT 0,
    profit NUMERIC NOT NULL DEFAULT 0,
    commission NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL CHECK (status IN ('Paid', 'Partially Paid', 'Unpaid')),
    created_by TEXT,
    hidden_remarks TEXT,
    invoice_description TEXT,
    line_items JSONB DEFAULT '[]'::jsonb,
    is_deleted BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    total_amount NUMERIC NOT NULL DEFAULT 0,
    govt_charge NUMERIC NOT NULL DEFAULT 0,
    service_charge NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    mobile TEXT,
    email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- 5. Grant access to authenticated users
DROP POLICY IF EXISTS "Allow authenticated access to invoices" ON public.invoices;
CREATE POLICY "Allow authenticated access to invoices" ON public.invoices
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated access to services" ON public.services;
CREATE POLICY "Allow authenticated access to services" ON public.services
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated access to clients" ON public.clients;
CREATE POLICY "Allow authenticated access to clients" ON public.clients
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
