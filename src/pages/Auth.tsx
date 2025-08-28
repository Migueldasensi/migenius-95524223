import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap } from "lucide-react";

const Auth = () => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = mode === "signin" ? "Entrar | Migenius" : "Criar conta | Migenius";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Acesse sua conta do Migenius para continuar seus estudos.");
    document.head.appendChild(meta);

    const linkCanonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    linkCanonical.setAttribute("rel", "canonical");
    linkCanonical.setAttribute("href", window.location.origin + "/auth");
    document.head.appendChild(linkCanonical);
  }, [mode]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard", { replace: true });
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [navigate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "Bem-vindo(a) de volta!", description: "Login realizado com sucesso." });
        navigate("/dashboard", { replace: true });
      } else {
        const redirectUrl = `${window.location.origin}/`;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: redirectUrl },
        });
        if (error) throw error;
        toast({ title: "Conta criada!", description: "Verifique seu e-mail para confirmar o cadastro." });
      }
    } catch (err: any) {
      toast({ title: "Erro de autenticação", description: err.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-migenius-gradient-from to-migenius-gradient-to flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center">
            <GraduationCap className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Migenius</h1>
          <p className="text-white/80 text-lg">Miguel da sensi</p>
        </div>

        {/* Auth Form */}
        <Card className="backdrop-blur-sm bg-white/10 border-white/20">
          <CardContent className="p-6">
            <form className="space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-white text-primary hover:bg-white/90" 
                disabled={loading}
              >
                {loading ? "Processando..." : mode === "signin" ? "Entrar" : "Cadastrar"}
              </Button>
            </form>
            <div className="mt-4 text-sm text-white/80 text-center">
              {mode === "signin" ? (
                <button 
                  className="underline hover:text-white" 
                  onClick={() => setMode("signup")}
                >
                  Não tem conta? Cadastre-se
                </button>
              ) : (
                <button 
                  className="underline hover:text-white" 
                  onClick={() => setMode("signin")}
                >
                  Já tem conta? Entrar
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Auth;