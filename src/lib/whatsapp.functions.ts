import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GRAPH_API_VERSION = "v25.0";

export const sendWhatsAppTest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { to: string; message?: string }) => {
    const to = String(input?.to ?? "").replace(/\D/g, "");
    if (!to || to.length < 8) throw new Error("Informe um número válido no formato internacional (ex: 5511999999999).");
    return { to, message: input?.message?.trim() || "✅ Teste de integração Obra Certa — webhook conectado." };
  })
  .handler(async ({ data }) => {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const missing = [
      ...(!token ? ["WHATSAPP_ACCESS_TOKEN"] : []),
      ...(!phoneId ? ["WHATSAPP_PHONE_NUMBER_ID"] : []),
    ];
    if (missing.length) {
      throw new Error(`Secrets ausentes: ${missing.join(", ")}.`);
    }

    const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: data.to,
        type: "text",
        text: { body: data.message, preview_url: false },
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string; code?: number; error_subcode?: number; type?: string };
    };

    if (!res.ok || json.error) {
      const msg = json.error?.message ?? `Falha ao enviar mensagem (HTTP ${res.status}).`;
      throw new Error(msg);
    }

    return {
      ok: true as const,
      messageId: json.messages?.[0]?.id ?? null,
      to: `+${data.to}`,
    };
  });

export const checkWhatsAppWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!verifyToken) throw new Error("Secret WHATSAPP_VERIFY_TOKEN ausente.");

    const base = "https://obra-ai-smart.lovable.app/api/public/whatsapp/webhook";
    const challenge = `lovable-${Date.now()}`;
    const url = `${base}?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(verifyToken)}&hub.challenge=${encodeURIComponent(challenge)}`;

    const res = await fetch(url, { method: "GET" });
    const body = await res.text();

    return {
      ok: res.ok && body === challenge,
      status: res.status,
      echoed: body.slice(0, 200),
      expected: challenge,
    };
  });
