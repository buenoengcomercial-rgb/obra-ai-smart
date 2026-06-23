import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCopy, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentEmpresa } from "@/lib/empresa";

const PUBLIC_APP_URL = "https://obra-ai-smart.lovable.app";

export const Route = createFileRoute("/_authenticated/configuracoes/whatsapp")({
  component: WhatsAppConfig,
});

function WhatsAppConfig() {
  const empresa = useCurrentEmpresa();
  const webhookUrl = `${PUBLIC_APP_URL}/api/public/whatsapp/webhook`;

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
            <li>
              Gere um <strong>token de acesso permanente</strong> através de um System User.
            </li>
            <li>
              Anote o <strong>Phone Number ID</strong> do número WABA.
            </li>
            <li>
              Defina o <strong>Verify Token</strong> como <code>obra_certa_whatsapp_2026</code>.
            </li>
            <li>
              Configure o webhook abaixo em{" "}
              <em>
                Casos de uso → Conectar-se com clientes pelo WhatsApp → Personalizar → Configuração
              </em>{" "}
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
              <Button
                size="sm"
                variant="outline"
                onClick={copyEmpresaId}
                disabled={!empresa.data?.id}
              >
                <ClipboardCopy className="h-3 w-3" />
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Cadastre esse valor como secret <code>WHATSAPP_EMPRESA_ID</code>. Assim o webhook sabe
              em qual empresa lançar as notas recebidas pelo WhatsApp.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
