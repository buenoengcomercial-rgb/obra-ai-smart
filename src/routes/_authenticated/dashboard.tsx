import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa, createEmpresa } from "@/lib/empresa";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { brl, dateBR } from "@/lib/format";
import { useState } from "react";
import { HardHat, Receipt, Wallet, AlertCircle, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const emp = useCurrentEmpresa();
  if (emp.isLoading) return <Skeleton />;
  if (!emp.data) return <OnboardingInline />;
  return <DashboardInner empresaId={emp.data.id} empresaNome={emp.data.nome} />;
}

function Skeleton() {
  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando…
    </div>
  );
}

function OnboardingInline() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const m = useMutation({
    mutationFn: () => createEmpresa(nome, cnpj),
    onSuccess: () => {
      toast.success("Empresa criada!");
      qc.invalidateQueries({ queryKey: ["current-empresa"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>Bem-vindo ao Gestor de Obras</CardTitle>
          <CardDescription>Crie a sua empresa para começar a cadastrar obras e notas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Nome da empresa *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Construtora Aurora Ltda" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ (opcional)</Label>
            <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
          <Button className="w-full" size="lg" onClick={() => m.mutate()} disabled={!nome || m.isPending}>
            {m.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar empresa
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardInner({ empresaId, empresaNome }: { empresaId: string; empresaNome: string }) {
  const navigate = useNavigate();
  const { data: obras } = useQuery({
    queryKey: ["dash-obras", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome, orcamento, status")
        .eq("empresa_id", empresaId);
      if (error) throw error;
      return data;
    },
  });

  const { data: notasAprov } = useQuery({
    queryKey: ["dash-notas-aprov", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("id, obra_id, valor_total, data_emissao, created_at, fornecedor_nome")
        .eq("empresa_id", empresaId)
        .eq("status", "aprovada");
      if (error) throw error;
      return data;
    },
  });

  const { data: pendentes } = useQuery({
    queryKey: ["dash-pendentes", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("id")
        .eq("empresa_id", empresaId)
        .in("status", ["pendente", "em_conferencia"]);
      if (error) throw error;
      return data.length;
    },
  });

  const { data: itensCat } = useQuery({
    queryKey: ["dash-cat", empresaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_nota")
        .select("valor_total, categoria_id, categorias_custo(nome, cor), notas_fiscais!inner(empresa_id, status)")
        .eq("notas_fiscais.empresa_id", empresaId)
        .eq("notas_fiscais.status", "aprovada");
      if (error) throw error;
      return data as Array<{ valor_total: number; categorias_custo: { nome: string; cor: string } | null }>;
    },
  });

  const orcTotal = (obras ?? []).reduce((s, o) => s + Number(o.orcamento || 0), 0);
  const realizado = (notasAprov ?? []).reduce((s, n) => s + Number(n.valor_total || 0), 0);
  const saldo = orcTotal - realizado;
  const consumido = orcTotal > 0 ? Math.min(100, (realizado / orcTotal) * 100) : 0;

  const byObra = (obras ?? []).map((o) => {
    const r = (notasAprov ?? []).filter((n) => n.obra_id === o.id).reduce((s, n) => s + Number(n.valor_total || 0), 0);
    return { nome: o.nome.length > 14 ? o.nome.slice(0, 14) + "…" : o.nome, orcamento: Number(o.orcamento), realizado: r };
  });

  const catMap = new Map<string, { nome: string; valor: number; cor: string }>();
  for (const i of itensCat ?? []) {
    const nome = i.categorias_custo?.nome ?? "Sem categoria";
    const cor = i.categorias_custo?.cor ?? "#888";
    const prev = catMap.get(nome) ?? { nome, valor: 0, cor };
    prev.valor += Number(i.valor_total || 0);
    catMap.set(nome, prev);
  }
  const catData = Array.from(catMap.values()).filter((c) => c.valor > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{empresaNome}</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada de todas as obras.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate({ to: "/notas" })}>Ver notas pendentes</Button>
          <Button size="lg" onClick={() => navigate({ to: "/notas/upload" })}>+ Enviar nota</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI title="Orçamento total" value={brl(orcTotal)} icon={<Wallet className="h-4 w-4" />} />
        <KPI title="Custo realizado" value={brl(realizado)} icon={<Receipt className="h-4 w-4" />} />
        <KPI title="Saldo disponível" value={brl(saldo)} tone={saldo < 0 ? "danger" : "ok"} icon={<Wallet className="h-4 w-4" />} />
        <KPI title="Notas a conferir" value={String(pendentes ?? 0)} icon={<AlertCircle className="h-4 w-4" />} highlight={!!pendentes && pendentes > 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consumo do orçamento</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={consumido} />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{consumido.toFixed(0)}% utilizado</span>
            <span>{brl(realizado)} de {brl(orcTotal)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Orçamento × Realizado por obra</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            {byObra.length === 0 ? (
              <Empty msg="Nenhuma obra cadastrada ainda." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byObra}>
                  <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                  <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Legend />
                  <Bar dataKey="orcamento" fill="var(--color-chart-1)" name="Orçamento" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="realizado" fill="var(--color-chart-2)" name="Realizado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Custos por categoria</CardTitle></CardHeader>
          <CardContent style={{ height: 280 }}>
            {catData.length === 0 ? (
              <Empty msg="Aprove notas para ver a distribuição." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={catData} dataKey="valor" nameKey="nome" innerRadius={50} outerRadius={90} paddingAngle={2}>
                    {catData.map((c, i) => (
                      <Cell key={i} fill={c.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => brl(v)} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimas notas aprovadas</CardTitle></CardHeader>
        <CardContent>
          {(notasAprov ?? []).length === 0 ? (
            <Empty msg="Nenhuma nota aprovada ainda." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Fornecedor</th><th>Data</th><th>Obra</th><th className="text-right">Valor</th></tr>
              </thead>
              <tbody>
                {(notasAprov ?? []).slice(-8).reverse().map((n) => {
                  const obra = obras?.find((o) => o.id === n.obra_id);
                  return (
                    <tr key={n.id} className="border-t border-border">
                      <td className="py-2">
                        <Link to="/notas/$id" params={{ id: n.id }} className="text-primary hover:underline">
                          {n.fornecedor_nome ?? "—"}
                        </Link>
                      </td>
                      <td>{dateBR(n.data_emissao)}</td>
                      <td>{obra?.nome ?? "—"}</td>
                      <td className="text-right font-medium">{brl(n.valor_total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {(obras ?? []).length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-3">
              <HardHat className="h-6 w-6 text-primary" />
              <div>
                <div className="font-medium">Cadastre sua primeira obra</div>
                <div className="text-sm text-muted-foreground">Sem obra, as notas não têm onde ser lançadas.</div>
              </div>
            </div>
            <Button onClick={() => navigate({ to: "/obras/nova" })}>Criar obra</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KPI({ title, value, icon, tone, highlight }: { title: string; value: string; icon?: React.ReactNode; tone?: "ok" | "danger"; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-accent" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
          <span>{title}</span>
          {icon}
        </div>
        <div className={`mt-2 text-2xl font-bold ${tone === "danger" ? "text-destructive" : tone === "ok" ? "text-[var(--color-success)]" : "text-foreground"}`}>
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
function Empty({ msg }: { msg: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">{msg}</div>;
}
