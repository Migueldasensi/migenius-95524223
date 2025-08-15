import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface Topic {
  id: string;
  title: string;
  description: string | null;
}

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, title, description")
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Erro ao carregar tópicos", description: error.message, variant: "destructive" });
      }
      setTopics(data ?? []);
    };
    load();
  }, []);

  const goToEssay = (id: string) => {
    window.location.href = `/essays?topic=${id}`;
  };

  return (
    <AppLayout>
      <Seo title="Tópicos | Redações" description="Tópicos disponíveis para redação." canonicalPath="/topics" />
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Tópicos</h1>
          <p className="text-muted-foreground">Escolha um tópico para escrever sua redação.</p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {topics.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <CardTitle>{t.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{t.description ?? ""}</p>
                <Button variant="secondary" onClick={() => goToEssay(t.id)}>Escrever redação</Button>
              </CardContent>
            </Card>
          ))}
          {topics.length === 0 && <div className="text-sm text-muted-foreground">Nenhum tópico disponível.</div>}
        </div>
      </section>
    </AppLayout>
  );
}
