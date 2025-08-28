import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Brain, Sparkles, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export default function IANutricional() {
  const [content, setContent] = useState("");
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const goBack = () => {
    window.history.back();
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast({
        title: "Atenção",
        description: "Por favor, digite um conteúdo para analisar.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setResponse("");

    try {
      const { data, error } = await supabase.functions.invoke('ia-nutricional', {
        body: { content: content.trim() }
      });

      if (error) {
        throw error;
      }

      if (data?.response) {
        setResponse(data.response);
      } else {
        throw new Error('Resposta inválida da IA');
      }

    } catch (error) {
      console.error('Erro ao chamar IA:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua solicitação. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Brain className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">IA Nutricional</h1>
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg">
              Descubra como qualquer assunto pode potencializar seus estudos e memória
            </p>
          </div>
        </div>

        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Conte-me sobre seu interesse
            </CardTitle>
            <CardDescription>
              Digite qualquer conteúdo (matemática, redação, física, biologia, etc.) e descubra conexões com produtividade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Ex: matemática, física quântica, literatura brasileira, programação..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] resize-none"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {content.length}/500 caracteres
              </span>
              <Button 
                onClick={handleSubmit}
                disabled={isLoading || !content.trim()}
                className="min-w-[120px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analisando...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analisar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Response Section */}
        {response && (
          <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Sparkles className="h-5 w-5" />
                Insights da IA Nutricional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                  {response}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tips Section */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-sm font-medium">💡 Dicas de uso</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="space-y-1">
              <li>• Seja específico: "trigonometria" vs "matemática"</li>
              <li>• Experimente temas variados: desde culinária até programação</li>
              <li>• Use as dicas da IA para criar cronogramas de estudo eficazes</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}