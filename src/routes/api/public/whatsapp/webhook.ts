import { createFileRoute } from "@tanstack/react-router";

const DEFAULT_VERIFY_TOKEN = "obra_certa_whatsapp_2026";

function getExpectedVerifyToken() {
  return process.env.WHATSAPP_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;
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
        const body = await request.json().catch(() => null);

        // A recepcao e processamento das mensagens sera expandida na proxima etapa.
        // Por enquanto, responder 200 impede que a Meta marque o webhook como falho.
        console.log("[WhatsApp webhook] Evento recebido", JSON.stringify(body).slice(0, 2000));

        return Response.json({ received: true });
      },
    },
  },
});
