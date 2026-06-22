import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentEmpresa } from "@/lib/empresa";
import { extrairNotaFn } from "@/lib/notas.functions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, FileImage, FilePlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notas/upload")({
  component: UploadNota,
});

function UploadNota() {
  const emp = useCurrentEmpresa();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [obraId, setObraId] = useState<string>("");
  const [progress, setProgress] = useState<string>("");
  const extrair = useServerFn(extrairNotaFn);

  const { data: obras } = useQuery({
    queryKey: ["obras-select", emp.data?.id],
    enabled: !!emp.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("obras").select("id, nome").eq("empresa_id", emp.data!.id).order("nome");
      if (error) throw error;
      return data;
    },
  });

  const m = useMutation({
    mutationFn: async () => {
      if (!file || !emp.data) throw new Error("Selecione um arquivo.");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      setProgress("Enviando arquivo…");
      const ext = file.name.split(".").pop() || "bin";
      const path = `${emp.data.id}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("notas-fiscais").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      setProgress("Criando registro…");
      const { data: nota, error: nErr } = await supabase
        .from("notas_fiscais")
        .insert({
          empresa_id: emp.data.id,
          obra_id: obraId || null,
          status: "pendente",
          origem: "web",
          criada_por: u.user.id,
        })
        .select("id")
        .single();
      if (nErr) throw nErr;

      const { error: aErr } = await supabase
        .from("anexos")
        .insert({ nota_id: nota.id, path, mime: file.type, tamanho: file.size });
      if (aErr) throw aErr;

      setProgress("Lendo nota com inteligência artificial… isso leva alguns segundos.");
      await extrair({ data: { notaId: nota.id } });
      return nota.id;
    },
    onSuccess: (id) => {
      toast.success("Nota processada! Confira os dados.");
      navigate({ to: "/notas/$id", params: { id } });
    },
    onError: (e: Error) => { setProgress(""); toast.error(e.message); },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FilePlus className="h-5 w-5" /> Enviar nota fiscal</CardTitle>
          <CardDescription>Envie a foto ou PDF da nota. A IA vai ler e você confere antes de lançar no custo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Obra (opcional)</Label>
            <Select value={obraId} onValueChange={setObraId}>
              <SelectTrigger><SelectValue placeholder="Você pode definir depois" /></SelectTrigger>
              <SelectContent>
                {(obras ?? []).map((o) => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <label
            htmlFor="file"
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/40 p-8 text-center transition hover:border-primary"
          >
            <FileImage className="mb-2 h-10 w-10 text-primary" />
            <div className="font-medium">{file ? file.name : "Clique para escolher imagem ou PDF"}</div>
            <div className="text-xs text-muted-foreground">PNG, JPG, HEIC ou PDF até 10 MB</div>
            <input
              id="file"
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {progress && (
            <div className="flex items-center gap-2 rounded-md bg-secondary p-3 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> {progress}
            </div>
          )}

          <Button size="lg" className="w-full" onClick={() => m.mutate()} disabled={!file || m.isPending}>
            {m.isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Upload className="mr-2 h-5 w-5" />}
            {m.isPending ? "Processando…" : "Enviar e ler com IA"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
