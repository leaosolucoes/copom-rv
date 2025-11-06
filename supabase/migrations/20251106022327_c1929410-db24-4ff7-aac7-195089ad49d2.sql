-- Garantir que a extensão pgcrypto está ativa no schema correto
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

-- Verificar se está funcionando
DO $$
BEGIN
  PERFORM encode(digest('test', 'sha256'), 'hex');
  RAISE NOTICE 'pgcrypto extension is working!';
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'pgcrypto extension failed: %', SQLERRM;
END $$;