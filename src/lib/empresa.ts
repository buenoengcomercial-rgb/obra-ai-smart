import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type EmpresaCtx = { id: string; nome: string } | null;

async function fetchCurrentEmpresa(): Promise<EmpresaCtx> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase
    .from("company_members")
    .select("empresa_id, empresas(id, nome)")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error || !data?.empresas) return null;
  const e = data.empresas as { id: string; nome: string };
  return { id: e.id, nome: e.nome };
}

export function useCurrentEmpresa() {
  return useQuery({
    queryKey: ["current-empresa"],
    queryFn: fetchCurrentEmpresa,
    staleTime: 60_000,
  });
}

export async function createEmpresa(nome: string, cnpj?: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("Não autenticado");
  const empresaId = crypto.randomUUID();

  // A política de leitura só libera a empresa depois que o vínculo abaixo
  // existe. Por isso, a inserção não deve solicitar a linha como retorno.
  const { error } = await supabase
    .from("empresas")
    .insert({ id: empresaId, nome, cnpj: cnpj || null, criada_por: u.user.id });
  if (error) throw error;

  // membership + admin role
  const { error: memErr } = await supabase
    .from("company_members")
    .insert({ empresa_id: empresaId, user_id: u.user.id });
  if (memErr) throw memErr;
  const { error: roleErr } = await supabase
    .from("user_roles")
    .insert({ empresa_id: empresaId, user_id: u.user.id, role: "admin" });
  if (roleErr) throw roleErr;
  // categorias iniciais
  const cats = ["Cimento e Argamassa", "Estrutura", "Hidráulica", "Elétrica", "Acabamento", "Mão de obra", "Equipamentos", "Outros"];
  await supabase
    .from("categorias_custo")
    .insert(cats.map((nome) => ({ empresa_id: empresaId, nome })));
  return { id: empresaId, nome };
}
