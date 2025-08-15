import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Calendar, FileText, Plus, Save } from "lucide-react";

interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  xp_earned: number;
  summary: string | null;
  created_at: string;
}

const WeeklyReports = () => {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [currentSummary, setCurrentSummary] = useState("");
  const [saving, setSaving] = useState(false);

  const getCurrentWeek = () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    
    return {
      start: monday.toISOString().split('T')[0],
      end: sunday.toISOString().split('T')[0]
    };
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false });

      if (error) {
        console.error("Error loading reports:", error);
      } else {
        setReports(data || []);
        
        // Load current week summary if exists
        const currentWeek = getCurrentWeek();
        const currentReport = data?.find(r => r.week_start === currentWeek.start);
        if (currentReport) {
          setCurrentSummary(currentReport.summary || "");
        }
      }
    };
    load();
  }, []);

  const saveCurrentWeekReport = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: userTenant } = await supabase
      .from("users")
      .select("tenant_id")
      .eq("id", user.id)
      .single();

    if (!userTenant?.tenant_id) {
      toast({ title: "Erro", description: "Usuário não possui tenant", variant: "destructive" });
      return;
    }

    setSaving(true);
    
    const currentWeek = getCurrentWeek();
    
    try {
      const { error } = await supabase
        .from("weekly_reports")
        .upsert({
          user_id: user.id,
          tenant_id: userTenant.tenant_id,
          week_start: currentWeek.start,
          week_end: currentWeek.end,
          summary: currentSummary,
          xp_earned: 0 // This should be calculated from activities
        }, {
          onConflict: 'user_id,week_start'
        });

      if (error) throw error;
      
      toast({ title: "Sucesso", description: "Relatório semanal salvo!" });
      
      // Reload reports
      const { data } = await supabase
        .from("weekly_reports")
        .select("*")
        .eq("user_id", user.id)
        .order("week_start", { ascending: false });
      
      setReports(data || []);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const currentWeek = getCurrentWeek();

  return (
    <AppLayout>
      <Seo title="Relatórios Semanais | Migenius" description="Documente seus aprendizados semanais" canonicalPath="/reports" />
      
      <div className="space-y-6">
        <header className="text-center py-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Relatórios Semanais</h1>
          <p className="text-muted-foreground">Documente seus aprendizados e reflexões</p>
        </header>

        {/* Current Week Report */}
        <Card className="border-migenius-difficulty-easy/20 bg-migenius-green-light">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-migenius-difficulty-easy">
              <Calendar className="w-5 h-5" />
              📗 Relatório da Semana Atual
            </CardTitle>
            <p className="text-sm text-migenius-difficulty-easy/80">
              Semana de {formatDate(currentWeek.start)} até {formatDate(currentWeek.end)}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-white/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-migenius-difficulty-easy">0</div>
                  <div className="text-sm text-migenius-difficulty-easy/70">Tópicos Concluídos</div>
                </CardContent>
              </Card>
              <Card className="bg-white/50">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-migenius-difficulty-easy">0m</div>
                  <div className="text-sm text-migenius-difficulty-easy/70">Tempo Total</div>
                </CardContent>
              </Card>
            </div>

            <div>
              <label className="text-sm font-medium text-migenius-difficulty-easy mb-2 block">
                O que você aprendeu esta semana?
              </label>
              <Textarea
                placeholder="Descreva o que você estudou, principais aprendizados, dificuldades encontradas e reflexões..."
                value={currentSummary}
                onChange={(e) => setCurrentSummary(e.target.value)}
                className="min-h-[120px] bg-white/50 border-migenius-difficulty-easy/30"
              />
            </div>

            <Button 
              onClick={saveCurrentWeekReport}
              disabled={saving}
              className="w-full bg-migenius-difficulty-easy hover:bg-migenius-difficulty-easy/90 text-white"
            >
              {saving ? (
                <>Salvando...</>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Relatório
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Previous Reports */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Relatórios Anteriores</h2>
          
          {reports.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium text-muted-foreground">Nenhum relatório anterior</p>
                <p className="text-sm text-muted-foreground">Seus relatórios semanais aparecerão aqui</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      📊 Relatório Semanal
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Semana de {formatDate(report.week_start)} até {formatDate(report.week_end)}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">{report.xp_earned}</div>
                        <div className="text-xs text-muted-foreground">XP Ganhos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-primary">0</div>
                        <div className="text-xs text-muted-foreground">Atividades</div>
                      </div>
                    </div>
                    
                    {report.summary && (
                      <div className="bg-muted/50 p-3 rounded-lg">
                        <h4 className="font-medium mb-2">Resumo da Semana:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                          {report.summary}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default WeeklyReports;