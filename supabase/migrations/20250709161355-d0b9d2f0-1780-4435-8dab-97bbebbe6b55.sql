-- Remover trigger problemático
DROP TRIGGER IF EXISTS prevent_test_data_trigger ON complaints;
DROP FUNCTION IF EXISTS prevent_test_data_insertion();

-- Criar nova função mais específica para dados de teste
CREATE OR REPLACE FUNCTION prevent_test_data_insertion()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar APENAS dados claramente de teste/simulação
  IF (NEW.complainant_name ~ '^TEST_SIMULATION_[0-9]+$' 
     OR NEW.complainant_name ~ '^Test User [0-9]+$'
     OR NEW.complainant_name = 'João da Silva (TESTE)'
     OR NEW.occurrence_type = 'TESTE_SIMULACAO'
     OR NEW.occurrence_type = 'Teste de Integração WhatsApp'
     OR (NEW.narrative LIKE 'SIMULAÇÃO DE TESTE %' AND NEW.narrative LIKE '%dados fictícios%')
     OR NEW.narrative = 'Esta é uma mensagem de teste do sistema de posturas de Rio Verde para verificar a integração com WhatsApp.')
  THEN
    RAISE EXCEPTION 'Dados de teste automatizados não são permitidos no banco de produção';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger novamente
CREATE TRIGGER prevent_test_data_trigger
  BEFORE INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION prevent_test_data_insertion();