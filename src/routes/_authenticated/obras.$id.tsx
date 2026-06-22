import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { brl, dateBR } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/_authenticated/obras/$id")({
  component: ObraDetalhe,
});

function ObraDetalhe() {
  const { id } = Route.useParams();
  const { data: obra, isLoading } = useQuery({
    queryKey: ["obra", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: notas } = useQuery({
    queryKey: ["obra-notas", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("id, fornecedor_nome, numero, data_emissao, valor_total, status")
        .eq("obra_id", id)
        .order("data_emissao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const { data: itens } = useQuery({
    queryKey: ["obra-itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_nota")
        .select("valor_total, categorias_custo(nome, cor), notas_fiscais!inner(obra_id, status)")
        .eq("notas_fiscais.obra_id", id)
        .eq("notas_fiscais.status", "aprovada");
      if (error) throw error;
      return data as Array<{ valor_total: number; categorias_custo: { nome: string; cor: string } | null }>;
    },
  });

  if (isLoading || !obra) return <div className="text-muted-foreground">Carregando…</div>;

  const realizado = (notas ?? []).filter((n) => n.status === "aprovada").reduce((s, n) => s + Number(n.valor_total || 0), 0);
  const orc = Number(obra.orcamento);
  const consumido = orc > 0 ? Math.min(100, (realizado / orc) * 100) : 0;
  const saldo = orc - realizado;

  const catMap = new Map<string, number>();
  for (const i of itens ?? []) {
    const k = i.categorias_custo?.nome ?? "Sem categoria";
    catMap.set(k, (catMap.get(k) ?? 0) + Number(i.valor_total));
  }
  const catData = Array.from(catMap.entries()).map(([nome, valor]) => ({ nome, valor }));

  return (
    <div className="space-y-6">
      <div>
        <Link to="/obras" className="text-sm text-muted-foreground hover:underline">← Obras</Link>
        <h1 className="mt-1 text-2xl font-bold">{obra.nome}</h1>
        {obra.endereco && <p className="text-sm text-muted-foreground">{obra.endereco}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Orçamento</div><div className="mt-1 text-xl font-bold">{brl(orc)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Realizado</div><div className="mt-1 text-xl font-bold">{brl(realizado)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Saldo</div><div className={`mt-1 text-xl font-bold ${saldo < 0 ? "text-destructive" : "text-[var(--color-success)]"}`}>{brl(saldo)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs uppercase text-muted-foreground">Período</div><div className="mt-1 text-sm font-medium">{dateBR(obra.data_inicio)} → {dateBR(obra.data_fim_prevista)}</div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <Progress value={consumido} />
          <div className="mt-2 text-xs text-muted-foreground">{consumido.toFixed(0)}% do orçamento consumido</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Custos por categoria</CardTitle></CardHeader>
          <CardContent style={{ height: 260 }}>
            {catData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem notas aprovadas ainda.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catData}>
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Bar dataKey="valor" fill="var(--color-chart-1)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Notas desta obra</CardTitle></CardHeader>
          <CardContent>
            {(notas ?? []).length === 0 ? (
              <div className="text-sm text-muted-foreground">Nenhuma nota associada.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr><th className="py-2">Fornecedor</th><th>Nº</th><th>Data</th><th>Status</th><th className="text-right">Valor</th></tr>
                </thead>
                <tbody>
                  {notas!.map((n) => (
                    <tr key={n.id} className="border-t border-border">
                      <td className="py-2"><Link to="/notas/$id" params={{ id: n.id }} className="text-primary hover:underline">{n.fornecedor_nome ?? "—"}</Link></td>
                      <td>{n.numero ?? "—"}</td>
                      <td>{dateBR(n.data_emissao)}</td>
                      <td><Badge variant="secondary">{n.status}</Badge></td>
                      <td className="text-right font-medium">{brl(n.valor_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
