import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/empresa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/obras/nova")({
  component: NovaObra,
});

function NovaObra() {
  const emp = useCurrentEmpresa();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    nome: "",
    endereco: "",
    orcamento: "",
    data_inicio: "",
    data_fim_prevista: "",
    status: "planejada" as "planejada" | "em_andamento" | "pausada" | "concluida",
  });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!emp.data) return toast.error("Crie sua empresa primeiro.");
    setLoading(true);
    const { data, error } = await supabase
      .from("obras")
      .insert({
        empresa_id: emp.data.id,
        nome: form.nome,
        endereco: form.endereco || null,
        orcamento: Number(form.orcamento || 0),
        data_inicio: form.data_inicio || null,
        data_fim_prevista: form.data_fim_prevista || null,
        status: form.status,
      })
      .select("id")
      .single();
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Obra criada.");
    navigate({ to: "/obras/$id", params: { id: data.id } });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader><CardTitle>Nova obra</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Nome da obra *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Residencial Jardins" />
          </div>
          <div className="space-y-2">
            <Label>Endereço</Label>
            <Input value={form.endereco} onChange={(e) => setForm({ ...form, endereco: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Orçamento (R$)</Label>
              <Input type="number" step="0.01" value={form.orcamento} onChange={(e) => setForm({ ...form, orcamento: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={form.data_inicio} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Fim previsto</Label>
              <Input type="date" value={form.data_fim_prevista} onChange={(e) => setForm({ ...form, data_fim_prevista: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as typeof form.status })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planejada">Planejada</SelectItem>
                <SelectItem value="em_andamento">Em andamento</SelectItem>
                <SelectItem value="pausada">Pausada</SelectItem>
                <SelectItem value="concluida">Concluída</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate({ to: "/obras" })}>Cancelar</Button>
            <Button onClick={save} disabled={!form.nome || loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar obra
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
