import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/empresa";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { brl, dateBR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import { Upload } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notas")({
  component: NotasInbox,
});

const statusColors: Record<string, string> = {
  pendente: "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]",
  em_conferencia: "bg-accent text-accent-foreground",
  aprovada: "bg-[var(--color-success)] text-white",
  rejeitada: "bg-destructive text-destructive-foreground",
};

function NotasInbox() {
  const emp = useCurrentEmpresa();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["notas-inbox", emp.data?.id],
    enabled: !!emp.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("id, fornecedor_nome, numero, data_emissao, valor_total, status, origem, obras(nome)")
        .eq("empresa_id", emp.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Array<{
        id: string; fornecedor_nome: string | null; numero: string | null;
        data_emissao: string | null; valor_total: number; status: string; origem: string;
        obras: { nome: string } | null;
      }>;
    },
  });

  const tabs = ["em_conferencia", "pendente", "aprovada", "rejeitada"] as const;
  const labels: Record<string, string> = {
    em_conferencia: "A conferir", pendente: "Em processamento", aprovada: "Aprovadas", rejeitadas: "Rejeitadas",
    rejeitada: "Rejeitadas",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notas fiscais</h1>
          <p className="text-sm text-muted-foreground">Inbox de tudo que foi enviado por painel ou WhatsApp.</p>
        </div>
        <Button size="lg" onClick={() => navigate({ to: "/notas/upload" })}><Upload className="mr-2 h-4 w-4" /> Enviar nota</Button>
      </div>

      <Tabs defaultValue="em_conferencia">
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t} value={t}>
              {labels[t]} ({(data ?? []).filter((n) => n.status === t).length})
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((t) => (
          <TabsContent key={t} value={t}>
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr><th className="px-4 py-3">Fornecedor</th><th>Nº</th><th>Data</th><th>Obra</th><th>Origem</th><th>Status</th><th className="text-right pr-4">Valor</th></tr>
                  </thead>
                  <tbody>
                    {(data ?? []).filter((n) => n.status === t).map((n) => (
                      <tr key={n.id} className="cursor-pointer border-t border-border hover:bg-secondary/40" onClick={() => navigate({ to: "/notas/$id", params: { id: n.id } })}>
                        <td className="px-4 py-3 font-medium">
                          <Link to="/notas/$id" params={{ id: n.id }} className="text-primary hover:underline">{n.fornecedor_nome ?? "—"}</Link>
                        </td>
                        <td>{n.numero ?? "—"}</td>
                        <td>{dateBR(n.data_emissao)}</td>
                        <td>{n.obras?.nome ?? "—"}</td>
                        <td className="text-xs uppercase text-muted-foreground">{n.origem}</td>
                        <td><Badge className={statusColors[n.status]} variant="secondary">{n.status.replace("_", " ")}</Badge></td>
                        <td className="pr-4 text-right font-semibold">{brl(n.valor_total)}</td>
                      </tr>
                    ))}
                    {(data ?? []).filter((n) => n.status === t).length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">Nada por aqui.</td></tr>
                    )}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
