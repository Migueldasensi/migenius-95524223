import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

interface EssayRow {
  id: string;
  content: string | null;
  status: string | null;
  created_at: string;
  topic_id: string | null;
}

export default function Essays() {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [essays, setEssays] = useState<EssayRow[]>([]);
  const topicFromUrl = useMemo(() => new URLSearchParams(window.location.search).get("topic"), []);

  const loadEssays = async () => {
    const { data, error } = await supabase
      .from("essays")
      .select("id, content, status, created_at, topic_id")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar redações", description: error.message, variant: "destructive" });
    }
    setEssays(data ?? []);
  };

  useEffect(() => {
    loadEssays();
  }, []);

  const submitEssay = async () => {
    setSubmitting(true);
    try {
      const [{ data: userRes }, { data: tenantRes }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("current_user_tenant"),
      ]);
      const user = userRes.user;
      const tenantId = tenantRes as unknown as string | null;
      if (!user || !tenantId) {
        throw new Error("Sessão inválida ou tenant não encontrado.");
      }

      const { error } = await supabase.from("essays").insert({
        user_id: user.id,
        tenant_id: tenantId,
        content,
        topic_id: topicFromUrl,
        status: "submitted",
      });
      if (error) throw error;
      toast({ title: "Redação enviada", description: "Sua redação foi submetida." });
      setContent("");
      await loadEssays();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <Seo title="Redações | Enviar e listar" description="Envie sua redação e veja seu histórico." canonicalPath="/essays" />
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Redações</h1>
          <p className="text-muted-foreground">Crie e acompanhe suas redações.</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Nova redação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Escreva aqui..." rows={6} />
            <Button onClick={submitEssay} disabled={submitting || content.trim().length === 0}>
              {submitting ? "Enviando..." : "Enviar"}
            </Button>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-xl font-semibold mb-3">Minhas redações</h2>
          <div className="grid gap-3">
            {essays.length === 0 && <div className="text-sm text-muted-foreground">Você ainda não enviou nenhuma redação.</div>}
            {essays.map((e) => (
              <Card key={e.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="truncate text-sm text-muted-foreground max-w-[70%]">{e.content?.slice(0, 120) ?? "(sem conteúdo)"}</div>
                    <div className="text-xs">{new Date(e.created_at).toLocaleString()}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </section>
    </AppLayout>
  );
}
