import { createFileRoute } from "@tanstack/react-router";
import type { Json } from "@/integrations/supabase/types";

const DEFAULT_VERIFY_TOKEN = "obra_certa_whatsapp_2026";
const GRAPH_API_VERSION = "v25.0";
const STORAGE_BUCKET = "notas-fiscais";

type WhatsAppContact = {
  wa_id?: string;
  profile?: {
    name?: string;
  };
};

type WhatsAppMedia = {
  id?: string;
  mime_type?: string;
  caption?: string;
  filename?: string;
  sha256?: string;
};

type WhatsAppMessage = {
  id?: string;
  from?: string;
  timestamp?: string;
  type?: string;
  text?: { body?: string };
  image?: WhatsAppMedia;
  document?: WhatsAppMedia;
  [key: string]: unknown;
};

type WhatsAppChangeValue = {
  contacts?: WhatsAppContact[];
  messages?: WhatsAppMessage[];
  statuses?: unknown[];
};

type WhatsAppWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: WhatsAppChangeValue;
    }>;
  }>;
};

function getExpectedVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;
}

function getEmpresaId() {
  return process.env.WHATSAPP_EMPRESA_ID || "";
}

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function normalizePhone(phone?: string) {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits ? `+${digits}` : "";
}

function getContactName(contacts: WhatsAppContact[] | undefined, phone: string) {
  const digits = phone.replace(/\D/g, "");
  return contacts?.find((contact) => contact.wa_id === digits)?.profile?.name ?? null;
}

function getMessageMedia(message: WhatsAppMessage) {
  if (message.type === "image" && message.image?.id) {
    return {
      id: message.image.id,
      mime: message.image.mime_type ?? "image/jpeg",
      filename: "nota-whatsapp.jpg",
      caption: message.image.caption ?? null,
    };
  }

  if (message.type === "document" && message.document?.id) {
    return {
      id: message.document.id,
      mime: message.document.mime_type ?? "application/pdf",
      filename: message.document.filename ?? "nota-whatsapp.pdf",
      caption: message.document.caption ?? null,
    };
  }

  return null;
}

function extensionFromMime(mime: string, filename?: string) {
  const filenameExt = filename?.split(".").pop()?.toLowerCase();
  if (filenameExt && /^[a-z0-9]{2,5}$/.test(filenameExt)) return filenameExt;

  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("png")) return "png";
  if (mime.includes("heic")) return "heic";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  return "bin";
}

async function isValidMetaSignature(rawBody: string, signature: string | null) {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return true;
  if (!signature?.startsWith("sha256=")) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected =
    "sha256=" +
    [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");

  if (expected.length !== signature.length) return false;

  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

async function downloadWhatsAppMedia(mediaId: string) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("WHATSAPP_ACCESS_TOKEN não configurado.");
  }

  const metadataRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metadataRes.ok) {
    throw new Error(`Falha ao buscar metadados da mídia no WhatsApp (${metadataRes.status}).`);
  }

  const metadata = (await metadataRes.json()) as {
    url?: string;
    mime_type?: string;
    file_size?: number;
  };
  if (!metadata.url) throw new Error("A mídia do WhatsApp não retornou URL para download.");

  const mediaRes = await fetch(metadata.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!mediaRes.ok) {
    throw new Error(`Falha ao baixar mídia do WhatsApp (${mediaRes.status}).`);
  }

  return {
    bytes: new Uint8Array(await mediaRes.arrayBuffer()),
    mime: metadata.mime_type ?? mediaRes.headers.get("content-type") ?? "application/octet-stream",
    size: (metadata.file_size ?? Number(mediaRes.headers.get("content-length") ?? 0)) || null,
  };
}

async function processMessage({
  message,
  contacts,
}: {
  message: WhatsAppMessage;
  contacts?: WhatsAppContact[];
}) {
  const empresaId = getEmpresaId();
  if (!empresaId) {
    console.warn("[WhatsApp webhook] WHATSAPP_EMPRESA_ID ausente. Mensagem ignorada.");
    return { skipped: "missing_empresa" };
  }

  const media = getMessageMedia(message);
  if (!media) {
    console.log("[WhatsApp webhook] Mensagem sem mídia fiscal ignorada", message.type);
    return { skipped: "unsupported_message_type", type: message.type ?? "unknown" };
  }

  const phone = normalizePhone(message.from);
  if (!phone) return { skipped: "missing_sender" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  if (message.id) {
    const { data: existing } = await supabaseAdmin
      .from("whatsapp_mensagens")
      .select("id")
      .eq("wa_message_id", message.id)
      .maybeSingle();

    if (existing) {
      return { skipped: "duplicate_message", waMessageId: message.id };
    }
  }

  const displayName = getContactName(contacts, phone);
  const { data: contato, error: contatoErr } = await supabaseAdmin
    .from("whatsapp_contatos")
    .upsert(
      {
        empresa_id: empresaId,
        telefone_e164: phone,
        nome_exibicao: displayName,
      },
      { onConflict: "empresa_id,telefone_e164" },
    )
    .select("id, obra_padrao_id")
    .single();

  if (contatoErr || !contato) {
    throw contatoErr ?? new Error("Não foi possível registrar o contato do WhatsApp.");
  }

  const downloaded = await downloadWhatsAppMedia(media.id);
  const mime = downloaded.mime || media.mime;
  const ext = extensionFromMime(mime, media.filename);
  const storagePath = `${empresaId}/whatsapp/${message.id ?? crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, downloaded.bytes, {
      contentType: mime,
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data: nota, error: notaErr } = await supabaseAdmin
    .from("notas_fiscais")
    .insert({
      empresa_id: empresaId,
      obra_id: contato.obra_padrao_id,
      status: "pendente",
      origem: "whatsapp",
      observacao: media.caption
        ? `Recebida via WhatsApp de ${phone}: ${media.caption}`
        : `Recebida via WhatsApp de ${phone}.`,
    })
    .select("id")
    .single();
  if (notaErr || !nota) throw notaErr ?? new Error("Não foi possível criar a nota fiscal.");

  const { error: anexoErr } = await supabaseAdmin.from("anexos").insert({
    nota_id: nota.id,
    bucket: STORAGE_BUCKET,
    path: storagePath,
    mime,
    tamanho: downloaded.size,
  });
  if (anexoErr) throw anexoErr;

  await supabaseAdmin.from("whatsapp_mensagens").insert({
    contato_id: contato.id,
    direcao: "in",
    wa_message_id: message.id ?? null,
    tipo: message.type ?? null,
    conteudo: message as Json,
  });

  await supabaseAdmin.from("whatsapp_sessoes").insert({
    contato_id: contato.id,
    estado: "ocioso",
    nota_id: nota.id,
    obra_id: contato.obra_padrao_id,
  });

  try {
    const { processarNotaFiscalComIA } = await import("@/lib/notas.processor.server");
    await processarNotaFiscalComIA({ supabase: supabaseAdmin, notaId: nota.id });
    return { processed: true, notaId: nota.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido na leitura da nota.";
    await supabaseAdmin
      .from("notas_fiscais")
      .update({
        status: "rejeitada",
        observacao: `Falha na leitura automática via WhatsApp: ${message}`,
      })
      .eq("id", nota.id);
    throw error;
  }
}

async function processPayload(payload: WhatsAppWebhookPayload) {
  const results: Array<Record<string, unknown>> = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      for (const message of value?.messages ?? []) {
        try {
          results.push(await processMessage({ message, contacts: value?.contacts }));
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Erro desconhecido ao processar WhatsApp.";
          console.error("[WhatsApp webhook] Falha ao processar mensagem", errorMessage);
          results.push({ error: errorMessage, waMessageId: message.id ?? null });
        }
      }
    }
  }

  return results;
}

export const Route = createFileRoute("/api/public/whatsapp/webhook")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");

        if (mode === "subscribe" && token === getExpectedVerifyToken() && challenge) {
          return textResponse(challenge);
        }

        return textResponse("Invalid WhatsApp webhook verification token.", 403);
      },
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const validSignature = await isValidMetaSignature(
          rawBody,
          request.headers.get("x-hub-signature-256"),
        );

        if (!validSignature) {
          return Response.json({ received: false, error: "invalid_signature" }, { status: 403 });
        }

        const body = JSON.parse(rawBody || "{}") as WhatsAppWebhookPayload;
        const results = await processPayload(body);

        return Response.json({ received: true, results });
      },
    },
  },
});
