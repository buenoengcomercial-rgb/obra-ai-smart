import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { processarNotaFiscalComIA } from "@/lib/notas.processor.server";

const ExtractInput = z.object({
  notaId: z.string().uuid(),
});

export const extrairNotaFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExtractInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    await processarNotaFiscalComIA({ supabase, notaId: data.notaId });

    return { ok: true, userId };
  });
