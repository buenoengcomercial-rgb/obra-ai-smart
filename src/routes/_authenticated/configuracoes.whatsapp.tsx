import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/configuracoes/whatsapp")({
  component: WhatsAppConfig,
});

function WhatsAppConfig() {
  const webhookUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/public/whatsapp/webhook` : "";
  const copy = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast.success("URL copiada!");
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
            Etapa única — você fornece os tokens, a gente cuida do resto.
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
              Defina um <strong>Verify Token</strong> (qualquer string que só você sabe).
            </li>
            <li>
              Configure o webhook abaixo em{" "}
              <em>
                Casos de uso → Conectar-se com clientes pelo WhatsApp → Personalizar → Configuração
              </em>
              .
            </li>
          </ol>
          <div className="rounded-md border border-border bg-secondary p-3 font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="break-all">{webhookUrl}</span>
              <Button size="sm" variant="outline" onClick={copy}>
                <ClipboardCopy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="rounded-md border border-dashed p-3 text-muted-foreground">
            Use o token de verificação <code>obra_certa_whatsapp_2026</code> na Meta. Quando você
            tiver os tokens em mãos, peça aqui no chat para{" "}
            <strong>ativar a integração WhatsApp</strong>. Vamos pedir e armazenar com segurança:{" "}
            <code>WHATSAPP_ACCESS_TOKEN</code>, <code>WHATSAPP_PHONE_NUMBER_ID</code> e{" "}
            <code>META_APP_SECRET</code>.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
