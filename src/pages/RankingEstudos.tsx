import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Square, Trophy, Clock, Users, Medal, Crown, ArrowLeft } from "lucide-react";
import { StudyTimer } from "@/components/StudyTimer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface StudySession {
  id: string;
  user_id: string;
  start_time: string;
  end_time?: string;
  total_minutes: number;
}

interface TimeDisplay {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface RankingUser {
  user_id: string;
  display_name: string;
  email: string;
  total_minutes: number;
  position: number;
}

export default function RankingEstudos() {
  const [isStudying, setIsStudying] = useState(false);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);
  const [studyTime, setStudyTime] = useState(0); // em segundos
  const [ranking, setRanking] = useState<RankingUser[]>([]);
  const [userPosition, setUserPosition] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const goBack = () => {
    window.history.back();
  };

  useEffect(() => {
    loadRanking();
    checkActiveSession();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isStudying && currentSession) {
      interval = setInterval(() => {
        const startTime = new Date(currentSession.start_time).getTime();
        const now = new Date().getTime();
        const diffSeconds = Math.floor((now - startTime) / 1000);
        setStudyTime(diffSeconds);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isStudying, currentSession]);

  const checkActiveSession = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('study_sessions')
        .select('*')
        .eq('user_id', user.id)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1);

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentSession(data[0]);
        setIsStudying(true);
        const startTime = new Date(data[0].start_time).getTime();
        const now = new Date().getTime();
        const diffSeconds = Math.floor((now - startTime) / 1000);
        setStudyTime(diffSeconds);
      }
    } catch (error) {
      console.error('Erro ao verificar sessão ativa:', error);
    }
  };

  const loadRanking = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar tenant_id do usuário atual
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) return;

      // Buscar todas as sessões de estudo finalizadas do tenant
      const { data, error } = await supabase
        .from('study_sessions')
        .select('user_id, total_minutes')
        .not('end_time', 'is', null)
        .eq('tenant_id', userData.tenant_id);

      if (error) throw error;

      // Buscar informações dos usuários
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, display_name, email')
        .eq('tenant_id', userData.tenant_id);

      if (usersError) throw usersError;

      // Agrupar por usuário e somar total de minutos
      const userTotals = new Map<string, { display_name: string; email: string; total_minutes: number }>();
      
      data?.forEach((session: any) => {
        const userId = session.user_id;
        const userData = usersData?.find(u => u.id === userId);
        const existing = userTotals.get(userId);
        const displayName = userData?.display_name || userData?.email || 'Usuário';
        
        if (existing) {
          existing.total_minutes += session.total_minutes || 0;
        } else {
          userTotals.set(userId, {
            display_name: displayName,
            email: userData?.email || '',
            total_minutes: session.total_minutes || 0
          });
        }
      });

      // Converter para array e ordenar
      const rankingArray = Array.from(userTotals.entries())
        .map(([user_id, data]) => ({
          user_id,
          display_name: data.display_name,
          email: data.email,
          total_minutes: data.total_minutes,
          position: 0
        }))
        .sort((a, b) => b.total_minutes - a.total_minutes)
        .map((user, index) => ({ ...user, position: index + 1 }));

      setRanking(rankingArray);
      
      // Encontrar posição do usuário atual
      const userPos = rankingArray.findIndex(u => u.user_id === user.id);
      setUserPosition(userPos + 1);

    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o ranking.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const startStudy = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Erro de autenticação:", userError);
        toast({
          title: "Erro",
          description: "Você precisa estar logado para estudar.",
          variant: "destructive"
        });
        return;
      }

      // Buscar tenant_id diretamente da tabela users
      const { data: userData, error: userDataError } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (userDataError || !userData?.tenant_id) {
        console.error("Erro ao buscar tenant:", userDataError);
        toast({
          title: "Erro",
          description: "Não foi possível verificar suas permissões.",
          variant: "destructive"
        });
        return;
      }

      const { data, error } = await supabase
        .from('study_sessions')
        .insert({
          user_id: user.id,
          tenant_id: userData.tenant_id,
          start_time: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error("Erro ao inserir sessão:", error);
        throw error;
      }

      setCurrentSession(data);
      setIsStudying(true);
      setStudyTime(0);
      
      toast({
        title: "Estudo iniciado!",
        description: "Boa sorte nos seus estudos! 📚",
      });

    } catch (error) {
      console.error('Erro ao iniciar estudo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível iniciar a sessão de estudo.",
        variant: "destructive"
      });
    }
  };

  const stopStudy = async () => {
    if (!currentSession) return;

    try {
      const endTime = new Date().toISOString();
      const startTime = new Date(currentSession.start_time).getTime();
      const endTimeMs = new Date(endTime).getTime();
      const totalMinutes = Math.floor((endTimeMs - startTime) / (1000 * 60));

      const { error } = await supabase
        .from('study_sessions')
        .update({
          end_time: endTime,
          total_minutes: totalMinutes
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      setIsStudying(false);
      setCurrentSession(null);
      setStudyTime(0);
      
      await loadRanking();
      
      toast({
        title: "Estudo finalizado!",
        description: `Parabéns! Você estudou por ${totalMinutes} minutos. 🎉`,
      });

    } catch (error) {
      console.error('Erro ao parar estudo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a sessão de estudo.",
        variant: "destructive"
      });
    }
  };

  const formatTime = (minutes: number) => {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = minutes % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getMotivationalMessage = () => {
    if (ranking.length === 0) return "Seja o primeiro a estudar!";
    
    if (userPosition === 1) {
      return "🎉 Você está no topo do ranking! Continue assim!";
    } else if (userPosition <= 3) {
      return "🔥 Você está entre os top 3! Quase no topo!";
    } else if (userPosition <= 5) {
      return "💪 Você está no top 5! Continue subindo!";
    } else {
      const topUser = ranking[0];
      const difference = topUser.total_minutes - (ranking.find(r => r.position === userPosition)?.total_minutes || 0);
      return `📈 ${topUser.display_name} está ${formatTime(difference)} à sua frente. Você consegue!`;
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
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
              <Trophy className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Ranking de Estudos</h1>
              <Users className="h-8 w-8 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg">
              Compete com outros estudantes e acompanhe seu progresso
            </p>
          </div>
        </div>

        {/* Study Timer */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/20 border-primary/20">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Clock className="h-6 w-6" />
              {isStudying ? "Estudando agora" : "Iniciar sessão de estudo"}
            </CardTitle>
            {isStudying && (
              <CardDescription>
                <StudyTimer seconds={studyTime} className="text-primary justify-center" />
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={isStudying ? stopStudy : startStudy}
              size="lg"
              variant={isStudying ? "destructive" : "default"}
              className="min-w-[160px]"
            >
              {isStudying ? (
                <>
                  <Square className="mr-2 h-5 w-5" />
                  Parar Estudo
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Iniciar Estudo
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Motivational Message */}
        {ranking.length > 0 && (
          <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
            <CardContent className="text-center py-4">
              <p className="text-lg font-medium text-primary">
                {getMotivationalMessage()}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Ranking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-6 w-6" />
              Ranking Geral
            </CardTitle>
            <CardDescription>
              Tempo total de estudo de todos os usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Carregando ranking...</p>
              </div>
            ) : ranking.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum estudo registrado ainda.</p>
                <p className="text-sm text-muted-foreground">Seja o primeiro a estudar!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {ranking.map((user) => (
                  <div
                    key={user.user_id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      user.position <= 3 
                        ? 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20' 
                        : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getPositionIcon(user.position)}
                        <span className="font-bold text-lg">#{user.position}</span>
                      </div>
                      <div>
                        <p className="font-medium">{user.display_name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={user.position <= 3 ? "default" : "secondary"} className="text-lg px-3 py-1">
                        {formatTime(user.total_minutes)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}