import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/empresa";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brl, dateBR } from "@/lib/format";
import { Plus, HardHat } from "lucide-react";

export const Route = createFileRoute("/_authenticated/obras")({
  component: ObrasRoute,
});

function ObrasRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return pathname === "/obras" ? <ObrasList /> : <Outlet />;
}

const statusBadge: Record<string, string> = {
  planejada: "bg-secondary text-secondary-foreground",
  em_andamento: "bg-[var(--color-success)] text-white",
  pausada: "bg-[var(--color-warning)] text-[var(--color-warning-foreground)]",
  concluida: "bg-muted text-muted-foreground",
};

function ObrasList() {
  const emp = useCurrentEmpresa();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["obras", emp.data?.id],
    enabled: !!emp.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras")
        .select("id, nome, endereco, orcamento, data_inicio, data_fim_prevista, status")
        .eq("empresa_id", emp.data!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Obras</h1>
          <p className="text-sm text-muted-foreground">Todas as obras da empresa.</p>
        </div>
        <Button size="lg" onClick={() => navigate({ to: "/obras/nova" })}><Plus className="mr-2 h-4 w-4" /> Nova obra</Button>
      </div>

      {isLoading && <div className="text-muted-foreground">Carregando…</div>}
      {!isLoading && data?.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <HardHat className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="font-medium">Nenhuma obra cadastrada</p>
            <p className="text-sm text-muted-foreground">Comece criando a primeira obra para receber notas.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {(data ?? []).map((o) => (
          <Link key={o.id} to="/obras/$id" params={{ id: o.id }}>
            <Card className="cursor-pointer transition hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold leading-tight">{o.nome}</div>
                  <Badge className={statusBadge[o.status] ?? ""} variant="secondary">{o.status.replace("_", " ")}</Badge>
                </div>
                {o.endereco && <div className="mt-1 text-xs text-muted-foreground">{o.endereco}</div>}
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground">Orçamento</div>
                    <div className="font-medium">{brl(o.orcamento)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Início</div>
                    <div className="font-medium">{dateBR(o.data_inicio)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
