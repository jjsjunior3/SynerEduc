-- Adiciona coluna segmento à tabela notas (se não existir)
ALTER TABLE notas
  ADD COLUMN IF NOT EXISTS segmento text CHECK (segmento IN ('ead', 'presencial'));
