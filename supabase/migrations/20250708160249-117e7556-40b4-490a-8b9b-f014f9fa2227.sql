-- Adicionar o novo role 'fiscal' aos enums existentes
ALTER TYPE public.user_role ADD VALUE 'fiscal';
ALTER TYPE public.app_role ADD VALUE 'fiscal';