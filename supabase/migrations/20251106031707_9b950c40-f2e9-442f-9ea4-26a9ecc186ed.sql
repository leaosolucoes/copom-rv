-- Aumentar o limite de tamanho do bucket complaint-media para 100MB
UPDATE storage.buckets 
SET file_size_limit = 104857600  -- 100MB em bytes (100 * 1024 * 1024)
WHERE id = 'complaint-media';