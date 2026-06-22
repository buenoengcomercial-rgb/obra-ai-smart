import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HardHat, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");

  useEffect(() => {
    let active = true;

    const redirectAuthenticatedUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (!active || error || !data.user) return;
        await navigate({ to: "/dashboard", replace: true });
      } catch (error) {
        console.error("Não foi possível verificar a sessão atual.", error);
      }
    };

    void redirectAuthenticatedUser();
    return () => {
      active = false;
    };
  }, [navigate]);

  const signIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard", replace: true });
  };

  const signUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { name: nome },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Verifique seu e-mail se a confirmação estiver ativada.");
    navigate({ to: "/dashboard", replace: true });
  };

  const google = async () => {
    setLoading(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (res.error) {
      setLoading(false);
      return toast.error("Erro ao entrar com Google");
    }
    if (res.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary px-4 py-8">
      <div className="grid w-full max-w-5xl items-center gap-8 lg:grid-cols-2">
        <div className="hidden lg:block">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <HardHat className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-bold tracking-tight">Gestor de Obras</div>
              <div className="text-sm text-muted-foreground">do canteiro ao financeiro</div>
            </div>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-foreground">
            Mande a foto da nota.<br />
            <span className="text-primary">A IA lança o custo</span> na obra certa.
          </h1>
          <p className="mt-4 max-w-md text-muted-foreground">
            Acabou a planilha. Centralize fornecedores, materiais e orçamento — pelo painel ou pelo WhatsApp,
            sem digitar nota por nota.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-foreground/80">
            <li>• Extração automática de fornecedor, itens e valores</li>
            <li>• Conferência humana antes de lançar no custo</li>
            <li>• Dashboard de orçamento × realizado por obra</li>
            <li>• Multi-usuário, multi-obra, com permissões</li>
          </ul>
        </div>

        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Acessar a plataforma</CardTitle>
            <CardDescription>Use seu e-mail ou conta Google.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Criar conta</TabsTrigger>
              </TabsList>
              <TabsContent value="signin" className="space-y-3 pt-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={signIn} disabled={loading || !email || !password}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Entrar
                </Button>
              </TabsContent>
              <TabsContent value="signup" className="space-y-3 pt-4">
                <div className="space-y-2">
                  <Label>Seu nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Maria Construção" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
                </div>
                <div className="space-y-2">
                  <Label>Senha</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button className="w-full" onClick={signUp} disabled={loading || !email || !password}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Criar conta
                </Button>
              </TabsContent>
            </Tabs>

            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" /> ou <div className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google} disabled={loading}>
              Entrar com Google
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
