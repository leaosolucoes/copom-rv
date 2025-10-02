-- Encerrar manualmente as escalas que deveriam ter sido encerradas automaticamente
-- VTR-1: Deveria ter sido encerrada às 07:00 do dia 30/09
-- VTR-2: Deveria ter sido encerrada às 07:00 do dia 02/10

UPDATE public.escalas_viaturas
SET 
  status = 'encerrada',
  encerrado_em = CASE 
    -- VTR-1: data_servico = 2025-09-29, hora_saida antes de hora_entrada = encerra em 30/09
    WHEN data_servico = '2025-09-29' THEN '2025-09-30 10:00:00+00'::timestamptz  -- 07:00 BRT = 10:00 UTC
    -- VTR-2: data_servico = 2025-10-01, hora_saida antes de hora_entrada = encerra em 02/10
    WHEN data_servico = '2025-10-01' THEN '2025-10-02 10:00:00+00'::timestamptz  -- 07:00 BRT = 10:00 UTC
  END,
  observacoes = COALESCE(observacoes || E'\n\n', '') || 'Escala encerrada manualmente via correção do sistema. Deveria ter sido encerrada automaticamente às 07:00 (horário de Brasília).',
  updated_at = now()
WHERE 
  status = 'ativa'
  AND (
    (data_servico = '2025-09-29' AND hora_saida < hora_entrada) OR
    (data_servico = '2025-10-01' AND hora_saida < hora_entrada)
  );