import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { ClipboardCopy, MessageCircle, Send, ShieldCheck, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentEmpresa } from "@/lib/empresa";
import { checkWhatsAppWebhook, sendWhatsAppTest } from "@/lib/whatsapp.functions";

const PUBLIC_APP_URL = "https://obra-ai-smart.lovable.app";

export const Route = createFileRoute("/_authenticated/configuracoes/whatsapp")({
  component: WhatsAppConfig,
});

function WhatsAppConfig() {
  const empresa = useCurrentEmpresa();
  const webhookUrl = `${PUBLIC_APP_URL}/api/public/whatsapp/webhook`;

  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

  const sendFn = useServerFn(sendWhatsAppTest);
  const checkFn = useServerFn(checkWhatsAppWebhook);

  const sendMutation = useMutation({
    mutationFn: (input: { to: string; message?: string }) => sendFn({ data: input }),
    onSuccess: (res) => toast.success(`Mensagem enviada para ${res.to}`, { description: res.messageId ?? undefined }),
    onError: (err: Error) => toast.error("Falha no envio", { description: err.message }),
  });

  const checkMutation = useMutation({
    mutationFn: () => checkFn({ data: undefined }),
    onSuccess: (res) => {
      if (res.ok) toast.success("Webhook validado com sucesso!", { description: `HTTP ${res.status}` });
      else toast.error("Webhook respondeu de forma inesperada", {
        description: `HTTP ${res.status} — esperado "${res.expected}", recebido "${res.echoed}"`,
      });
    },
    onError: (err: Error) => toast.error("Falha ao validar webhook", { description: err.message }),
  });

  const copyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
  };

  const copyEmpresaId = () => {
    if (!empresa.data?.id) return;
    navigator.clipboard.writeText(empresa.data.id);
    toast.success("ID da empresa copiado!");
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Integração WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Receba notas direto do canteiro pelo WhatsApp.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" /> Como ligar a API oficial da Meta
          </CardTitle>
          <CardDescription>
            Configure o webhook na Meta e salve os secrets no Lovable.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Crie um app em <strong>developers.facebook.com</strong> do tipo <em>Business</em> e
              adicione o produto <strong>WhatsApp</strong>.
            </li>
            <li>Gere um <strong>token de acesso permanente</strong> através de um System User.</li>
            <li>Anote o <strong>Phone Number ID</strong> do número WABA.</li>
            <li>Defina o <strong>Verify Token</strong> como <code>obra_certa_whatsapp_2026</code>.</li>
            <li>
              Configure o webhook abaixo em{" "}
              <em>Casos de uso → Conectar-se com clientes pelo WhatsApp → Personalizar → Configuração</em>{" "}
              e assine o campo <strong>messages</strong>.
            </li>
          </ol>

          <div className="rounded-md border border-border bg-secondary p-3 font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="break-all">{webhookUrl}</span>
              <Button size="sm" variant="outline" onClick={copyWebhook}>
                <ClipboardCopy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-dashed p-3 text-muted-foreground">
            Secrets necessários no Lovable: <code>WHATSAPP_ACCESS_TOKEN</code>,{" "}
            <code>WHATSAPP_PHONE_NUMBER_ID</code>, <code>WHATSAPP_VERIFY_TOKEN</code>,{" "}
            <code>META_APP_SECRET</code> e <code>WHATSAPP_EMPRESA_ID</code>.
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Empresa para receber as notas do WhatsApp
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted p-2 font-mono text-xs">
              <span className="break-all">
                {empresa.data?.id ?? "Crie ou selecione uma empresa para exibir o ID."}
              </span>
              <Button size="sm" variant="outline" onClick={copyEmpresaId} disabled={!empresa.data?.id}>
                <ClipboardCopy className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Cadastre esse valor como secret <code>WHATSAPP_EMPRESA_ID</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" /> Testar integração
          </CardTitle>
          <CardDescription>
            Valide o webhook e dispare uma mensagem de teste pelo número WABA.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 text-sm">
          <div className="space-y-2">
            <div className="font-medium">1. Validar webhook</div>
            <p className="text-xs text-muted-foreground">
              Simula a chamada <code>GET</code> que a Meta faz para confirmar o <em>verify token</em>.
            </p>
            <Button
              variant="outline"
              onClick={() => checkMutation.mutate()}
              disabled={checkMutation.isPending}
            >
              {checkMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              Validar webhook
            </Button>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="font-medium">2. Enviar mensagem de teste</div>
            <p className="text-xs text-muted-foreground">
              O número precisa estar autorizado na conta WABA (ou ser um tester durante o sandbox).
              Use o formato internacional, ex.: <code>5511999999999</code>.
            </p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <div className="space-y-1">
                <Label htmlFor="wa-phone">Número de destino</Label>
                <Input
                  id="wa-phone"
                  inputMode="tel"
                  placeholder="5511999999999"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="wa-message">Mensagem (opcional)</Label>
              <Textarea
                id="wa-message"
                rows={3}
                placeholder="✅ Teste de integração Obra Certa — webhook conectado."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button
              onClick={() => sendMutation.mutate({ to: phone, message })}
              disabled={sendMutation.isPending || !phone.trim()}
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Enviar teste
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
