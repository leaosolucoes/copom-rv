-- Limpar dados de teste existentes
DELETE FROM complaints 
WHERE complainant_name LIKE '%Test User%' 
   OR complainant_name LIKE '%TEST%' 
   OR complainant_name LIKE '%João da Silva (TESTE)%'
   OR occurrence_type = 'TESTE_SIMULACAO'
   OR occurrence_type = 'Teste de Integração WhatsApp'
   OR occurrence_type = 'Perturbação do Sossego'
   OR narrative LIKE '%SIMULAÇÃO DE TESTE%'
   OR narrative LIKE '%Esta é uma mensagem de teste%';

-- Criar função para validar e bloquear dados de teste
CREATE OR REPLACE FUNCTION prevent_test_data_insertion()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar se são dados de teste e bloquear
  IF NEW.complainant_name LIKE '%Test User%' 
     OR NEW.complainant_name LIKE '%TEST_SIMULATION%'
     OR NEW.complainant_name LIKE '%João da Silva (TESTE)%'
     OR NEW.occurrence_type = 'TESTE_SIMULACAO'
     OR NEW.occurrence_type = 'Teste de Integração WhatsApp'
     OR NEW.narrative LIKE '%SIMULAÇÃO DE TESTE%'
     OR NEW.narrative LIKE '%Esta é uma mensagem de teste%'
  THEN
    RAISE EXCEPTION 'Dados de teste não são permitidos no banco de produção';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar o trigger apenas para INSERTs de dados reais (não para testes)
CREATE TRIGGER prevent_test_data_trigger
  BEFORE INSERT ON complaints
  FOR EACH ROW
  EXECUTE FUNCTION prevent_test_data_insertion();