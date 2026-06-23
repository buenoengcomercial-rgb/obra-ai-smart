import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { callGateway } from "@/lib/ai-gateway.server";
import type { Database } from "@/integrations/supabase/types";

type AppSupabaseClient = SupabaseClient<Database>;

const ItemSchema = z.object({
  descricao: z.string().default(""),
  quantidade: z.number().default(1),
  unidade: z.string().nullable().optional(),
  valor_unitario: z.number().default(0),
  valor_total: z.number().default(0),
  confianca: z.number().min(0).max(1).optional(),
});

const NotaSchema = z.object({
  chave_acesso: z.string().nullable().optional(),
  fornecedor_nome: z.string().nullable().optional(),
  fornecedor_cnpj_cpf: z.string().nullable().optional(),
  numero: z.string().nullable().optional(),
  serie: z.string().nullable().optional(),
  data_emissao: z.string().nullable().optional(),
  valor_total: z.number().default(0),
  desconto: z.number().default(0),
  itens: z.array(ItemSchema).default([]),
});

const SYSTEM_PROMPT = `Você é um assistente especialista em ler notas fiscais brasileiras (NF-e, NFC-e, cupons fiscais, recibos) a partir de imagens ou PDFs.
Extraia EXCLUSIVAMENTE em JSON válido no formato:
{
  "chave_acesso": string|null,
  "fornecedor_nome": string|null,
  "fornecedor_cnpj_cpf": string|null,
  "numero": string|null,
  "serie": string|null,
  "data_emissao": "YYYY-MM-DD"|null,
  "valor_total": number,
  "desconto": number,
  "itens": [
    {
      "descricao": string,
      "quantidade": number,
      "unidade": string|null,
      "valor_unitario": number,
      "valor_total": number,
      "confianca": number
    }
  ]
}
Regras:
- Datas em formato ISO (YYYY-MM-DD).
- Valores monetários como número decimal em reais (use ponto). Nunca inclua "R$".
- Se um campo não estiver legível, use null (ou 0 para numéricos quando fizer sentido).
- Não invente fornecedor, CNPJ ou itens que não aparecem na imagem.
- Para chave_acesso, retorne somente os 44 dígitos. Se não estiver legível, use null.
- A soma dos itens deve, idealmente, bater com valor_total - desconto.
Responda APENAS com o JSON, sem comentários nem markdown.`;

function buildDedupKey(parsed: z.infer<typeof NotaSchema>): string | null {
  const supplier = (parsed.fornecedor_cnpj_cpf ?? parsed.fornecedor_nome ?? "").trim();
  const invoiceNumber = (parsed.numero ?? "").trim();

  if (supplier && invoiceNumber) {
    return `${supplier}|${invoiceNumber}|${parsed.data_emissao ?? ""}|${parsed.valor_total ?? 0}`;
  }

  const accessKey = (parsed.chave_acesso ?? "").replace(/\D/g, "");
  if (accessKey.length === 44) return `chave:${accessKey}`;

  return null;
}

export async function processarNotaFiscalComIA({
  supabase,
  notaId,
}: {
  supabase: AppSupabaseClient;
  notaId: string;
}) {
  const { data: nota, error: nErr } = await supabase
    .from("notas_fiscais")
    .select("id, empresa_id, status, anexos(path, mime)")
    .eq("id", notaId)
    .single();
  if (nErr || !nota) throw new Error("Nota não encontrada");

  const anexo = (nota.anexos as Array<{ path: string; mime: string }> | null)?.[0];
  if (!anexo) throw new Error("Nota sem anexo");

  const { data: signed, error: sErr } = await supabase.storage
    .from("notas-fiscais")
    .createSignedUrl(anexo.path, 600);
  if (sErr || !signed) throw new Error("Falha ao gerar URL da imagem");

  const fileRes = await fetch(signed.signedUrl);
  if (!fileRes.ok) throw new Error("Falha ao baixar anexo");

  const buf = await fileRes.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  const dataUrl = `data:${anexo.mime};base64,${b64}`;
  const isPdf = anexo.mime === "application/pdf";

  const userContent: Array<Record<string, unknown>> = [
    {
      type: "text",
      text: "Extraia os dados desta nota fiscal e retorne o JSON conforme o schema.",
    },
  ];

  if (isPdf) {
    userContent.push({
      type: "file",
      file: { filename: "nota.pdf", file_data: dataUrl },
    });
  } else {
    userContent.push({ type: "image_url", image_url: { url: dataUrl } });
  }

  const content = await callGateway({
    model: "google/gemini-3-flash-preview",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent as never },
    ],
    temperature: 0.1,
  });

  let parsed: z.infer<typeof NotaSchema>;
  try {
    parsed = NotaSchema.parse(JSON.parse(content));
  } catch (e) {
    throw new Error(`Não foi possível interpretar a resposta da IA: ${(e as Error).message}`);
  }

  const dedup = buildDedupKey(parsed);

  await supabase.from("ia_extracoes").insert({
    nota_id: notaId,
    payload_bruto: parsed as never,
    modelo: "google/gemini-3-flash-preview",
  });

  const { error: uErr } = await supabase
    .from("notas_fiscais")
    .update({
      fornecedor_nome: parsed.fornecedor_nome ?? null,
      fornecedor_cnpj: parsed.fornecedor_cnpj_cpf ?? null,
      numero: parsed.numero ?? null,
      serie: parsed.serie ?? null,
      data_emissao: parsed.data_emissao ?? null,
      valor_total: parsed.valor_total ?? 0,
      desconto: parsed.desconto ?? 0,
      hash_dedup: dedup,
      status: "em_conferencia",
    })
    .eq("id", notaId);

  if (uErr) {
    if (uErr.message.includes("uq_nota_dedup")) {
      await supabase
        .from("notas_fiscais")
        .update({
          status: "rejeitada",
          observacao: "Possível duplicata detectada automaticamente.",
        })
        .eq("id", notaId);
      throw new Error("Esta nota já foi lançada anteriormente (duplicidade detectada).");
    }
    throw uErr;
  }

  await supabase.from("itens_nota").delete().eq("nota_id", notaId);

  if (parsed.itens.length > 0) {
    const rows = parsed.itens.map((it, i) => ({
      nota_id: notaId,
      descricao: it.descricao || "Item sem descrição",
      quantidade: it.quantidade ?? 1,
      unidade: it.unidade ?? null,
      valor_unitario: it.valor_unitario ?? 0,
      valor_total: it.valor_total ?? (it.quantidade ?? 1) * (it.valor_unitario ?? 0),
      confianca: it.confianca ?? null,
      ordem: i,
    }));

    const { error: iErr } = await supabase.from("itens_nota").insert(rows);
    if (iErr) throw iErr;
  }

  return { ok: true };
}
