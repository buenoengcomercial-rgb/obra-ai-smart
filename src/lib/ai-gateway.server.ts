// Lovable AI Gateway helper. Server-only.
type Message = {
  role: "system" | "user" | "assistant";
  content: string | Array<{ type: string; [k: string]: unknown }>;
};

type GatewayOptions = {
  model?: string;
  messages: Message[];
  response_format?: { type: "json_object" } | { type: "json_schema"; json_schema: unknown };
  temperature?: number;
};

export async function callGateway(opts: GatewayOptions) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY ausente no servidor.");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    body: JSON.stringify({
      model: opts.model ?? "google/gemini-3-flash-preview",
      messages: opts.messages,
      ...(opts.response_format ? { response_format: opts.response_format } : {}),
      ...(typeof opts.temperature === "number" ? { temperature: opts.temperature } : {}),
    }),
  });

  if (res.status === 429) throw new Error("Limite de requisições da IA atingido. Tente novamente em instantes.");
  if (res.status === 402) throw new Error("Créditos da IA esgotados. Adicione créditos na configuração da workspace.");
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha na IA (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? "";
}
