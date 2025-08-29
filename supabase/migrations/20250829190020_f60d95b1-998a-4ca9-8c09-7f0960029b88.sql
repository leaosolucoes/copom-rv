-- Adicionar campos para ciência do admin nos imprevistos
ALTER TABLE public.escala_imprevistos 
ADD COLUMN admin_ciente boolean DEFAULT false,
ADD COLUMN admin_ciente_por uuid REFERENCES public.users(id),
ADD COLUMN admin_ciente_em timestamp with time zone;