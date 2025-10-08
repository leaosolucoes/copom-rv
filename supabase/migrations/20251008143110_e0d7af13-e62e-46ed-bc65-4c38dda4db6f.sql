-- ============================================
-- CORREÇÃO: Auto-encerrar escalas às 07:00
-- ============================================

-- Etapa 1: Remover cron jobs duplicados/incorretos
-- Job #1: Roda a cada 5 minutos (muito frequente)
SELECT cron.unschedule(1);

-- Job #2: Roda às 07:00 UTC (04:00 Brasília - horário errado)
SELECT cron.unschedule(2);

-- Manter apenas Job #3 que executa às 10:00 UTC (07:00 Brasília - correto)

-- Etapa 2: Encerrar manualmente as 2 escalas antigas que estavam travadas
UPDATE public.escalas_viaturas 
SET 
  status = 'encerrada',
  encerrado_em = NOW(),
  observacoes = COALESCE(observacoes || ' | ', '') || 'Encerrado manualmente - correção de sistema'
WHERE id IN (
  '09ce43b9-8c48-42cb-b1d4-746bb0a461ac',
  '4d067858-fe7e-4d11-8623-09afc834099f'
) AND status = 'ativa';