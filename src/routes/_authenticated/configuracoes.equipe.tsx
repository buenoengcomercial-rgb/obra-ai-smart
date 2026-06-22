import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/empresa";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/configuracoes/equipe")({
  component: Equipe,
});

function Equipe() {
  const emp = useCurrentEmpresa();
  const { data } = useQuery({
    queryKey: ["equipe", emp.data?.id],
    enabled: !!emp.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("company_members")
        .select("user_id, profiles(nome, email, avatar_url), user_roles(role)")
        .eq("empresa_id", emp.data!.id);
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Equipe</h1>
        <p className="text-sm text-muted-foreground">Membros que têm acesso a esta empresa.</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Nome</th><th>E-mail</th><th>Papéis</th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((m: { user_id: string; profiles: { nome?: string; email?: string } | null; user_roles: Array<{ role: string }> | null }) => (
                <tr key={m.user_id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{m.profiles?.nome ?? "—"}</td>
                  <td>{m.profiles?.email ?? "—"}</td>
                  <td className="flex flex-wrap gap-1 py-3">
                    {(m.user_roles ?? []).map((r, i) => <Badge key={i} variant="secondary">{r.role}</Badge>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Convidar novos membros estará disponível em breve. Por enquanto, peça à pessoa para se cadastrar; quando você fizer o primeiro convite, ela será vinculada a esta empresa.</p>
    </div>
  );
}
