import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_authenticated/categorias")({
  component: Categorias,
});

function Categorias() {
  const emp = useCurrentEmpresa();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#2F5D3A");

  const { data } = useQuery({
    queryKey: ["categorias", emp.data?.id],
    enabled: !!emp.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categorias_custo").select("*").eq("empresa_id", emp.data!.id).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!emp.data) throw new Error("Empresa não definida");
      const { error } = await supabase.from("categorias_custo").insert({ empresa_id: emp.data.id, nome, cor });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Categoria adicionada."); setNome(""); qc.invalidateQueries({ queryKey: ["categorias"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("categorias_custo").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["categorias"] }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categorias de custo</h1>
        <p className="text-sm text-muted-foreground">Use para agrupar materiais e serviços nos relatórios.</p>
      </div>

      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-[1fr_auto_auto]">
          <div className="space-y-1">
            <Label>Nome *</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Hidráulica" />
          </div>
          <div className="space-y-1">
            <Label>Cor</Label>
            <Input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="h-10 w-16 p-1" />
          </div>
          <div className="flex items-end">
            <Button onClick={() => add.mutate()} disabled={!nome || add.isPending}><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="h-5 w-5 rounded" style={{ background: c.cor ?? "#888" }} />
                <span className="font-medium">{c.nome}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
