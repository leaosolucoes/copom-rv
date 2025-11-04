-- ============================================
-- REMOÇÃO DOS MÓDULOS DE AUDIÊNCIAS, VIATURAS E ESCALAS
-- ============================================

-- 1. REMOVER STORAGE BUCKETS
DELETE FROM storage.buckets WHERE id = 'oficios-audiencias';
DELETE FROM storage.buckets WHERE id = 'checklist-fotos';

-- 2. REMOVER TABELAS (em ordem de dependência)

-- Tabelas dependentes de checklist_viaturas
DROP TABLE IF EXISTS checklist_pneus CASCADE;
DROP TABLE IF EXISTS checklist_equipamentos CASCADE;

-- Tabela dependente de escalas_viaturas
DROP TABLE IF EXISTS escala_imprevistos CASCADE;

-- Tabelas principais
DROP TABLE IF EXISTS checklist_viaturas CASCADE;
DROP TABLE IF EXISTS escalas_viaturas CASCADE;
DROP TABLE IF EXISTS historico_km_viaturas CASCADE;
DROP TABLE IF EXISTS checklist_config_items CASCADE;
DROP TABLE IF EXISTS viaturas CASCADE;
DROP TABLE IF EXISTS audiencias CASCADE;
DROP TABLE IF EXISTS configuracao_audiencias CASCADE;

-- 3. REMOVER FUNÇÃO DE VALIDAÇÃO DE ESCALAS
DROP FUNCTION IF EXISTS validate_escala_conflict() CASCADE;