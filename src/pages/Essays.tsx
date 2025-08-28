import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, FileImage, Loader2, Sparkles, CheckCircle, Clock, Brain } from "lucide-react";

interface EssayRow {
  id: string;
  content: string | null;
  status: string | null;
  created_at: string;
  topic_id: string | null;
  score: number | null;
  feedback?: string | null;
}

export default function Essays() {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [correctingAI, setCorrectingAI] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [essays, setEssays] = useState<EssayRow[]>([]);
  const [selectedEssay, setSelectedEssay] = useState<EssayRow | null>(null);
  const topicFromUrl = useMemo(() => new URLSearchParams(window.location.search).get("topic"), []);

  const loadEssays = async () => {
    const { data, error } = await supabase
      .from("essays")
      .select("id, content, status, created_at, topic_id, score")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar redações", description: error.message, variant: "destructive" });
    }
    setEssays(data ?? []);
  };

  useEffect(() => {
    loadEssays();
  }, []);

  const submitEssay = async (autoCorrect = false) => {
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

      const { data: essayData, error } = await supabase.from("essays").insert({
        user_id: user.id,
        tenant_id: tenantId,
        content,
        topic_id: topicFromUrl,
        status: autoCorrect ? "correcting" : "submitted",
      }).select().single();
      
      if (error) throw error;
      
      if (autoCorrect) {
        await correctEssayWithAI(essayData.id, content);
      }
      
      toast({ title: "Redação enviada", description: autoCorrect ? "Redação enviada para correção automática." : "Sua redação foi submetida." });
      setContent("");
      setImageFile(null);
      await loadEssays();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message ?? "Tente novamente.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const correctEssayWithAI = async (essayId: string, essayContent: string) => {
    setCorrectingAI(true);
    try {
      const prompt = `Analise e corrija esta redação seguindo os critérios do ENEM:

REDAÇÃO A CORRIGIR:
${essayContent}

Por favor, forneça:
1. Nota geral (0-1000 pontos)
2. Análise detalhada por competência:
   - Competência 1: Domínio da norma padrão
   - Competência 2: Compreensão do tema
   - Competência 3: Argumentação
   - Competência 4: Coesão e coerência  
   - Competência 5: Proposta de intervenção
3. Pontos fortes
4. Pontos a melhorar
5. Sugestões específicas

Seja detalhado e construtivo na correção.`;

      const { data, error } = await supabase.functions.invoke('ia-nutricional', {
        body: { content: prompt }
      });

      if (error) throw error;

      // Extrair nota da resposta (buscar por padrão de número)
      const noteMatch = data.response.match(/(?:nota|pontos?|score).*?(\d{1,4})/i);
      const score = noteMatch ? parseInt(noteMatch[1]) : null;

      await supabase.from("essays").update({
        status: "corrected",
        score: score,
        // Salvamos o feedback em um campo metadata ou similar
      }).eq("id", essayId);

      toast({ 
        title: "Correção concluída!", 
        description: score ? `Nota: ${score}/1000 pontos` : "Correção disponível"
      });
      
      await loadEssays();
    } catch (err: any) {
      toast({ title: "Erro na correção", description: err.message ?? "Tente novamente.", variant: "destructive" });
      await supabase.from("essays").update({ status: "error" }).eq("id", essayId);
    } finally {
      setCorrectingAI(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Arquivo muito grande", description: "Máximo 5MB", variant: "destructive" });
        return;
      }
      setImageFile(file);
      // Aqui você pode implementar OCR para extrair texto da imagem
      toast({ title: "Imagem carregada", description: "OCR em desenvolvimento" });
    }
  };

  const goBack = () => {
    window.history.back();
  };

  if (selectedEssay) {
    return (
      <AppLayout>
        <Seo title={`Redação | ${selectedEssay.id}`} description="Detalhes da redação" canonicalPath="/essays" />
        <section className="space-y-6">
          <header className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => setSelectedEssay(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Detalhes da Redação</h1>
              <p className="text-muted-foreground">{new Date(selectedEssay.created_at).toLocaleString()}</p>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Conteúdo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="whitespace-pre-wrap leading-relaxed">{selectedEssay.content}</div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge variant={
                    selectedEssay.status === "corrected" ? "default" :
                    selectedEssay.status === "correcting" ? "secondary" : "outline"
                  }>
                    {selectedEssay.status === "corrected" ? "Corrigida" :
                     selectedEssay.status === "correcting" ? "Corrigindo..." : "Submetida"}
                  </Badge>
                  {selectedEssay.score && (
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground">Nota</p>
                      <p className="text-2xl font-bold text-primary">{selectedEssay.score}/1000</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {selectedEssay.status === "submitted" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Correção Automática</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => correctEssayWithAI(selectedEssay.id, selectedEssay.content || "")}
                      disabled={correctingAI}
                      className="w-full"
                    >
                      {correctingAI ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Corrigindo...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Corrigir com IA
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </section>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Seo title="Redações | Enviar e listar" description="Envie sua redação e veja seu histórico." canonicalPath="/essays" />
      <section className="space-y-6">
        <header className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={goBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Redações</h1>
            <p className="text-muted-foreground">Crie e acompanhe suas redações.</p>
          </div>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Nova redação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Escreva sua redação aqui..." 
              rows={8}
              className="min-h-[200px]"
            />
            
            <div className="border-2 border-dashed border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Upload className="h-4 w-4" />
                <span className="text-sm font-medium">Enviar foto da redação</span>
              </div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="mb-2"
              />
              {imageFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileImage className="h-4 w-4" />
                  {imageFile.name}
                </div>
              )}
              <p className="text-xs text-muted-foreground">OCR em desenvolvimento - por enquanto digite o texto manualmente</p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => submitEssay(false)} 
                disabled={submitting || content.trim().length === 0}
                variant="outline"
                className="flex-1"
              >
                {submitting ? "Enviando..." : "Enviar"}
              </Button>
              <Button 
                onClick={() => submitEssay(true)} 
                disabled={submitting || content.trim().length === 0}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Enviar + IA Correção
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <section>
          <h2 className="text-xl font-semibold mb-3">Minhas redações</h2>
          <div className="grid gap-3">
            {essays.length === 0 && <div className="text-sm text-muted-foreground">Você ainda não enviou nenhuma redação.</div>}
            {essays.map((e) => (
              <Card key={e.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedEssay(e)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          e.status === "corrected" ? "default" :
                          e.status === "correcting" ? "secondary" : "outline"
                        } className="text-xs">
                          {e.status === "corrected" ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Corrigida
                            </>
                          ) : e.status === "correcting" ? (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Corrigindo
                            </>
                          ) : (
                            "Submetida"
                          )}
                        </Badge>
                        {e.score && (
                          <Badge variant="secondary" className="text-xs">
                            {e.score}/1000
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-sm text-muted-foreground max-w-[70%]">
                        {e.content?.slice(0, 120) ?? "(sem conteúdo)"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </div>
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
