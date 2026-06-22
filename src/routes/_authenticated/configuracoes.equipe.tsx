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
      const { data: members } = await supabase
        .from("company_members")
        .select("user_id")
        .eq("empresa_id", emp.data!.id);
      const ids = (members ?? []).map((m) => m.user_id);
      if (ids.length === 0) return [];
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("id, nome, email").in("id", ids),
        supabase.from("user_roles").select("user_id, role").eq("empresa_id", emp.data!.id),
      ]);
      return ids.map((id) => ({
        user_id: id,
        profile: profiles?.find((p) => p.id === id),
        roles: (roles ?? []).filter((r) => r.user_id === id).map((r) => r.role),
      }));
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
              {(data ?? []).map((m) => (
                <tr key={m.user_id} className="border-t border-border">
                  <td className="px-4 py-3 font-medium">{m.profile?.nome ?? "—"}</td>
                  <td>{m.profile?.email ?? "—"}</td>
                  <td className="flex flex-wrap gap-1 py-3">
                    {m.roles.map((r, i) => <Badge key={i} variant="secondary">{r}</Badge>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Convidar novos membros estará disponível em breve.</p>
    </div>
  );
}
