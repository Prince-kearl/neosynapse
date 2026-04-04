-- Remove legacy marketplace tables no longer used by the healthcare app.
-- Active app routes now use patient/professional/admin healthcare flows.

-- Drop child tables first, then parents.
drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.favorites cascade;
drop table if exists public.reviews cascade;
drop table if exists public.vendor_follows cascade;
drop table if exists public.meals cascade;
drop table if exists public.vendors cascade;

-- The enum was introduced for the old orders table only.
drop type if exists public.order_status;
