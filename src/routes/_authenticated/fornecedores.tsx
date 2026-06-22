import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/empresa";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/fornecedores")({
  component: Fornecedores,
});

function Fornecedores() {
  const emp = useCurrentEmpresa();
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", cnpj_cpf: "", telefone: "", email: "" });

  const { data } = useQuery({
    queryKey: ["fornecedores", emp.data?.id],
    enabled: !!emp.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fornecedores").select("*").eq("empresa_id", emp.data!.id).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!emp.data) throw new Error("Empresa não definida");
      const { error } = await supabase.from("fornecedores").insert({ ...form, empresa_id: emp.data.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor adicionado.");
      setForm({ nome: "", cnpj_cpf: "", telefone: "", email: "" });
      qc.invalidateQueries({ queryKey: ["fornecedores"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["fornecedores"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <p className="text-sm text-muted-foreground">Empresas e prestadores que aparecem nas notas.</p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-5">
          <div className="space-y-1 md:col-span-2">
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>CNPJ/CPF</Label>
            <Input value={form.cnpj_cpf} onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label>Telefone</Label>
            <Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} />
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => add.mutate()} disabled={!form.nome || add.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-3">Nome</th><th>CNPJ/CPF</th><th>Telefone</th><th>E-mail</th><th></th></tr>
            </thead>
            <tbody>
              {(data ?? []).map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{f.nome}</td>
                  <td>{f.cnpj_cpf ?? "—"}</td>
                  <td>{f.telefone ?? "—"}</td>
                  <td>{f.email ?? "—"}</td>
                  <td className="pr-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => remove.mutate(f.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
              {(data ?? []).length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">Nenhum fornecedor cadastrado.</td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
