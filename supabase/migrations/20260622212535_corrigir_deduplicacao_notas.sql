-- Respostas antigas sem identidade geravam a mesma chave e causavam falsos positivos.
UPDATE public.notas_fiscais
SET hash_dedup = NULL
WHERE hash_dedup = '|||0';

-- Notas rejeitadas podem ser reenviadas para uma nova tentativa de leitura.
DROP INDEX IF EXISTS public.uq_nota_dedup;

CREATE UNIQUE INDEX uq_nota_dedup
ON public.notas_fiscais (empresa_id, hash_dedup)
WHERE hash_dedup IS NOT NULL
  AND status <> 'rejeitada'::public.nota_status;
