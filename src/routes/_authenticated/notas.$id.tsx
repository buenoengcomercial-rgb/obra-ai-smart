import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/empresa";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { brl } from "@/lib/format";
import { Check, X, Trash2, Plus, Save, AlertTriangle, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notas/$id")({
  component: Conferencia,
});

type Item = {
  id?: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  valor_unitario: number;
  valor_total: number;
  confianca: number | null;
  categoria_id: string | null;
  _new?: boolean;
};

function Conferencia() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const emp = useCurrentEmpresa();

  const { data: nota, isLoading } = useQuery({
    queryKey: ["nota", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais").select("*, anexos(path, mime)").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: obras } = useQuery({
    queryKey: ["obras-select", emp.data?.id],
    enabled: !!emp.data?.id,
    queryFn: async () => (await supabase.from("obras").select("id, nome").eq("empresa_id", emp.data!.id)).data ?? [],
  });

  const { data: categorias } = useQuery({
    queryKey: ["categorias", emp.data?.id],
    enabled: !!emp.data?.id,
    queryFn: async () => (await supabase.from("categorias_custo").select("id, nome, cor").eq("empresa_id", emp.data!.id)).data ?? [],
  });

  const { data: itensDb } = useQuery({
    queryKey: ["itens", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itens_nota").select("*").eq("nota_id", id).order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const [header, setHeader] = useState({
    fornecedor_nome: "", fornecedor_cnpj: "", numero: "", serie: "",
    data_emissao: "", valor_total: 0, desconto: 0, obra_id: "" as string | null, observacao: "",
  });
  const [itens, setItens] = useState<Item[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [originalSnapshot, setOriginalSnapshot] = useState<typeof header | null>(null);

  useEffect(() => {
    if (nota) {
      const h = {
        fornecedor_nome: nota.fornecedor_nome ?? "",
        fornecedor_cnpj: nota.fornecedor_cnpj ?? "",
        numero: nota.numero ?? "",
        serie: nota.serie ?? "",
        data_emissao: nota.data_emissao ?? "",
        valor_total: Number(nota.valor_total ?? 0),
        desconto: Number(nota.desconto ?? 0),
        obra_id: nota.obra_id,
        observacao: nota.observacao ?? "",
      };
      setHeader(h);
      setOriginalSnapshot(h);
      const an = (nota.anexos as Array<{ path: string; mime: string }>)?.[0];
      if (an) {
        supabase.storage.from("notas-fiscais").createSignedUrl(an.path, 3600).then(({ data }) => {
          if (data?.signedUrl) setImageUrl(data.signedUrl);
        });
      }
    }
  }, [nota]);

  useEffect(() => {
    if (itensDb) setItens(itensDb.map((i) => ({
      id: i.id, descricao: i.descricao, quantidade: Number(i.quantidade),
      unidade: i.unidade, valor_unitario: Number(i.valor_unitario),
      valor_total: Number(i.valor_total), confianca: i.confianca ? Number(i.confianca) : null,
      categoria_id: i.categoria_id,
    })));
  }, [itensDb]);

  const somaItens = useMemo(() => itens.reduce((s, i) => s + Number(i.valor_total || 0), 0), [itens]);
  const totalLiq = Number(header.valor_total || 0) - Number(header.desconto || 0);
  const diverge = Math.abs(somaItens - totalLiq) > 0.5;

  const updateItem = (idx: number, patch: Partial<Item>) => {
    setItens((prev) => {
      const arr = [...prev];
      const next = { ...arr[idx], ...patch };
      if (patch.quantidade !== undefined || patch.valor_unitario !== undefined) {
        next.valor_total = Number(next.quantidade || 0) * Number(next.valor_unitario || 0);
      }
      arr[idx] = next;
      return arr;
    });
  };

  const salvar = useMutation({
    mutationFn: async (novoStatus?: "aprovada" | "rejeitada") => {
      const { data: u } = await supabase.auth.getUser();
      // diff de header → ia_correcoes
      const correcoes: Array<{ campo: string; valor_antigo: string; valor_novo: string }> = [];
      if (originalSnapshot) {
        for (const k of Object.keys(header) as Array<keyof typeof header>) {
          const a = String(originalSnapshot[k] ?? "");
          const b = String(header[k] ?? "");
          if (a !== b) correcoes.push({ campo: k, valor_antigo: a, valor_novo: b });
        }
      }
      if (correcoes.length > 0 && u.user) {
        await supabase.from("ia_correcoes").insert(correcoes.map((c) => ({ ...c, nota_id: id, user_id: u.user!.id })));
      }

      // Atualiza header
      if (novoStatus === "aprovada" && !header.obra_id) {
        throw new Error("Selecione a obra antes de aprovar.");
      }
      const update = {
        fornecedor_nome: header.fornecedor_nome || null,
        fornecedor_cnpj: header.fornecedor_cnpj || null,
        numero: header.numero || null,
        serie: header.serie || null,
        data_emissao: header.data_emissao || null,
        valor_total: Number(header.valor_total || 0),
        desconto: Number(header.desconto || 0),
        obra_id: header.obra_id || null,
        observacao: header.observacao || null,
        ...(novoStatus === "aprovada"
          ? { status: "aprovada" as const, aprovada_por: u.user?.id ?? null, aprovada_em: new Date().toISOString() }
          : {}),
        ...(novoStatus === "rejeitada" ? { status: "rejeitada" as const } : {}),
      };
      const { error: hErr } = await supabase.from("notas_fiscais").update(update).eq("id", id);
      if (hErr) throw hErr;

      // Sincroniza itens — apaga e reinsere para simplificar
      await supabase.from("itens_nota").delete().eq("nota_id", id);
      if (itens.length > 0) {
        const rows = itens.map((it, i) => ({
          nota_id: id,
          descricao: it.descricao,
          quantidade: Number(it.quantidade || 0),
          unidade: it.unidade,
          valor_unitario: Number(it.valor_unitario || 0),
          valor_total: Number(it.valor_total || 0),
          confianca: it.confianca,
          categoria_id: it.categoria_id,
          ordem: i,
        }));
        const { error: iErr } = await supabase.from("itens_nota").insert(rows);
        if (iErr) throw iErr;
      }
    },
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ["nota", id] });
      qc.invalidateQueries({ queryKey: ["itens", id] });
      qc.invalidateQueries({ queryKey: ["notas-inbox"] });
      qc.invalidateQueries({ queryKey: ["dash-notas-aprov"] });
      if (status === "aprovada") { toast.success("Nota aprovada e lançada no custo da obra."); navigate({ to: "/notas" }); }
      else if (status === "rejeitada") { toast.success("Nota rejeitada."); navigate({ to: "/notas" }); }
      else toast.success("Rascunho salvo.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !nota) return <div className="text-muted-foreground">Carregando…</div>;

  const aprovada = nota.status === "aprovada";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/notas" className="text-sm text-muted-foreground hover:underline">← Notas</Link>
          <h1 className="mt-1 text-2xl font-bold">Conferência da nota</h1>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <Badge variant="secondary">{nota.status}</Badge>
            <span className="text-muted-foreground">Origem: {nota.origem}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => salvar.mutate(undefined)} disabled={salvar.isPending || aprovada}>
            <Save className="mr-2 h-4 w-4" /> Salvar rascunho
          </Button>
          <Button variant="destructive" onClick={() => salvar.mutate("rejeitada")} disabled={salvar.isPending || aprovada}>
            <X className="mr-2 h-4 w-4" /> Rejeitar
          </Button>
          <Button size="lg" onClick={() => salvar.mutate("aprovada")} disabled={salvar.isPending || aprovada}>
            {salvar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />} Aprovar e lançar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_1.4fr]">
        {/* Imagem da nota */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2"><CardTitle className="text-base">Documento original</CardTitle></CardHeader>
          <CardContent className="p-0">
            {imageUrl ? (
              (nota.anexos as Array<{ mime: string }>)?.[0]?.mime === "application/pdf" ? (
                <iframe src={imageUrl} className="h-[80vh] w-full" title="Nota fiscal" />
              ) : (
                <img src={imageUrl} alt="Nota fiscal" className="max-h-[85vh] w-full object-contain bg-muted" />
              )
            ) : <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Sem anexo</div>}
          </CardContent>
        </Card>

        {/* Form de conferência */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Dados da nota</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2">
                <Label>Obra *</Label>
                <Select value={header.obra_id ?? ""} onValueChange={(v) => setHeader({ ...header, obra_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione a obra" /></SelectTrigger>
                  <SelectContent>
                    {(obras ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Fornecedor</Label>
                <Input value={header.fornecedor_nome} onChange={(e) => setHeader({ ...header, fornecedor_nome: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>CNPJ/CPF</Label>
                <Input value={header.fornecedor_cnpj} onChange={(e) => setHeader({ ...header, fornecedor_cnpj: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Data de emissão</Label>
                <Input type="date" value={header.data_emissao} onChange={(e) => setHeader({ ...header, data_emissao: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Número</Label>
                <Input value={header.numero} onChange={(e) => setHeader({ ...header, numero: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Série</Label>
                <Input value={header.serie} onChange={(e) => setHeader({ ...header, serie: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Desconto</Label>
                <Input type="number" step="0.01" value={header.desconto} onChange={(e) => setHeader({ ...header, desconto: Number(e.target.value) })} />
              </div>
              <div className="space-y-1">
                <Label>Total da nota</Label>
                <Input type="number" step="0.01" value={header.valor_total} onChange={(e) => setHeader({ ...header, valor_total: Number(e.target.value) })} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label>Observação</Label>
                <Textarea value={header.observacao} onChange={(e) => setHeader({ ...header, observacao: e.target.value })} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Itens ({itens.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setItens([...itens, { descricao: "", quantidade: 1, unidade: "UN", valor_unitario: 0, valor_total: 0, confianca: 1, categoria_id: null, _new: true }])}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {itens.map((it, idx) => {
                const lowConf = (it.confianca ?? 1) < 0.6;
                return (
                  <div key={idx} className={`grid grid-cols-12 gap-2 rounded-lg border p-2 text-sm ${lowConf ? "border-[var(--color-warning)] bg-[var(--color-warning)]/10" : "border-border"}`}>
                    <Input className="col-span-5" placeholder="Descrição" value={it.descricao} onChange={(e) => updateItem(idx, { descricao: e.target.value })} />
                    <Input className="col-span-1" type="number" step="0.001" value={it.quantidade} onChange={(e) => updateItem(idx, { quantidade: Number(e.target.value) })} />
                    <Input className="col-span-1" placeholder="UN" value={it.unidade ?? ""} onChange={(e) => updateItem(idx, { unidade: e.target.value })} />
                    <Input className="col-span-2" type="number" step="0.0001" value={it.valor_unitario} onChange={(e) => updateItem(idx, { valor_unitario: Number(e.target.value) })} />
                    <Input className="col-span-2" type="number" step="0.01" value={it.valor_total} onChange={(e) => updateItem(idx, { valor_total: Number(e.target.value) })} />
                    <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setItens(itens.filter((_, i) => i !== idx))}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <div className="col-span-12 flex items-center gap-2">
                      <Select value={it.categoria_id ?? ""} onValueChange={(v) => updateItem(idx, { categoria_id: v || null })}>
                        <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Categoria" /></SelectTrigger>
                        <SelectContent>
                          {(categorias ?? []).map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {lowConf && <span className="flex items-center gap-1 text-xs text-[var(--color-warning-foreground)]"><AlertTriangle className="h-3 w-3" /> Confira este item — baixa confiança</span>}
                    </div>
                  </div>
                );
              })}
              {itens.length === 0 && <div className="py-4 text-center text-sm text-muted-foreground">Nenhum item.</div>}

              <div className="flex flex-wrap items-center justify-end gap-4 border-t border-border pt-3 text-sm">
                <div>Soma dos itens: <span className="font-semibold">{brl(somaItens)}</span></div>
                <div>Total líquido: <span className="font-semibold">{brl(totalLiq)}</span></div>
                {diverge && <span className="flex items-center gap-1 rounded-md bg-destructive/15 px-2 py-1 text-destructive"><AlertTriangle className="h-4 w-4" /> Soma diverge do total</span>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
