-- Habilitar RLS nas tabelas que precisam
ALTER TABLE public.checklist_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_pneus ENABLE ROW LEVEL SECURITY;

-- As tabelas viaturas e checklist_viaturas já têm RLS habilitado, apenas certificando
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_viaturas ENABLE ROW LEVEL SECURITY;