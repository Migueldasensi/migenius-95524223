import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      const userEmail = session?.user?.email ?? null;
      setEmail(userEmail);
      if (!session) {
        navigate("/auth", { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      const userEmail = session?.user?.email ?? null;
      setEmail(userEmail);
      if (!session) {
        navigate("/auth", { replace: true });
      }
      setLoading(false);
    });

    return () => subscription.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    document.title = "Home | App";
    const meta = document.querySelector('meta[name="description"]') || document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", "Home page of the app with authentication.");
    document.head.appendChild(meta);

    const linkCanonical = document.querySelector('link[rel="canonical"]') || document.createElement("link");
    linkCanonical.setAttribute("rel", "canonical");
    linkCanonical.setAttribute("href", window.location.origin + "/");
    document.head.appendChild(linkCanonical);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Carregando…</h1>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold">Bem-vindo(a)!</h1>
        <p className="text-xl text-muted-foreground">Você está autenticado.</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Button asChild>
            <Link to="/dashboard">Ir ao Dashboard</Link>
          </Button>
          <Button
            variant="secondary"
            onClick={async () => {
              const { error } = await supabase.auth.signOut();
              if (error) {
                toast({ title: "Erro ao sair", description: error.message, variant: "destructive" });
              } else {
                navigate("/auth", { replace: true });
              }
            }}
          >
            Sair
          </Button>
        </div>
      </section>
    </main>
  );
};

export default Index;
