import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";

interface Topic {
  id: string;
  title: string;
  description: string | null;
}

export default function Topics() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadTopics = async () => {
    const { data, error } = await supabase
      .from("topics")
      .select("id, title, description")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar tópicos", description: error.message, variant: "destructive" });
    }
    setTopics(data ?? []);
  };

  useEffect(() => {
    loadTopics();
  }, []);

  const goToEssay = (id: string) => {
    window.location.href = `/essays?topic=${id}`;
  };

  const createTopic = async () => {
    if (!newTitle.trim()) {
      toast({ title: "Erro", description: "Título é obrigatório", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error("Usuário não autenticado. Faça login novamente.");
      }

      // Buscar tenant_id diretamente da tabela users
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (userDataError || !userData?.tenant_id) {
        throw new Error("Usuário não tem tenant associado. Entre em contato com o suporte.");
      }

      const { error } = await supabase.from("topics").insert({
        title: newTitle,
        description: newDescription || null,
        tenant_id: userData.tenant_id,
        created_by: user.id,
      });

      if (error) throw error;

      toast({ title: "Tópico criado", description: "Tópico criado com sucesso!" });
      setNewTitle("");
      setNewDescription("");
      setDialogOpen(false);
      await loadTopics();
    } catch (err: any) {
      console.error("Erro ao criar tópico:", err);
      toast({ title: "Erro ao criar tópico", description: err.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const goBack = () => {
    window.history.back();
  };

  return (
    <AppLayout>
      <Seo title="Tópicos | Redações" description="Tópicos disponíveis para redação." canonicalPath="/topics" />
      <section className="space-y-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Tópicos</h1>
              <p className="text-muted-foreground">Escolha um tópico para escrever sua redação.</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Criar Tópico
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Tópico</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Título *</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Meio ambiente e sustentabilidade"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Descrição</label>
                  <Textarea
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Descreva o tema ou forneça instruções..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={createTopic} disabled={isCreating || !newTitle.trim()}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando...
                      </>
                    ) : (
                      "Criar"
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
