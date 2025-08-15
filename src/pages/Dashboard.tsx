import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import RankSystem, { getProgressToNextRank, calculateStreak } from "@/components/RankSystem";
import { CalendarDays, Flame, Target } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  reason: string | null;
  xp: number;
  created_at: string;
}

interface Countdown {
  id: string;
  title: string;
  description: string | null;
  target_at: string;
  color: string;
}

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [xp, setXp] = useState<number>(0);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [streak, setStreak] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? null);
      if (!user) return;

      const { data: me } = await supabase
        .from("users")
        .select("xp, display_name")
        .eq("id", user.id)
        .maybeSingle();
      setXp(me?.xp ?? 0);

      const { data: acts } = await supabase
        .from("activities")
        .select("id, type, reason, xp, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setActivities(acts ?? []);
      
      // Calculate streak
      const currentStreak = calculateStreak(acts ?? []);
      setStreak(currentStreak);
      
      // Load countdowns
      const { data: countdownsData } = await supabase
        .from("countdowns")
        .select("id, title, description, target_at, color")
        .order("target_at", { ascending: true })
        .limit(3);
      setCountdowns(countdownsData ?? []);
    };
    load();
  }, []);

  return (
    <AppLayout>
      <Seo title="Dashboard | XP e Atividades" description="Seu progresso e atividades recentes." canonicalPath="/dashboard" />
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Olá{email ? `, ${email}` : ""}! Aqui está seu progresso.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de XP</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{xp}</div>
              <RankSystem xp={xp} className="mt-2" />
              {(() => {
                const { progress, xpNeeded } = getProgressToNextRank(xp);
                return progress < 100 ? (
                  <div className="mt-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {Math.round(progress)}% • {xpNeeded} XP restantes
                    </p>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ofensiva</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{streak}</div>
              <p className="text-xs text-muted-foreground">
                {streak === 0 ? "Comece hoje!" : streak === 1 ? "dia consecutivo" : "dias consecutivos"}
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Countdowns Section */}
        {countdowns.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Próximas Contagens
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {countdowns.map((countdown) => {
                const targetDate = new Date(countdown.target_at);
                const now = new Date();
                const timeDiff = targetDate.getTime() - now.getTime();
                
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                
                const isExpired = timeDiff <= 0;
                
                return (
                  <Card key={countdown.id} className={`border-l-4 ${
                    countdown.color === 'red' ? 'border-l-red-500' :
                    countdown.color === 'blue' ? 'border-l-blue-500' :
                    countdown.color === 'green' ? 'border-l-green-500' :
                    countdown.color === 'yellow' ? 'border-l-yellow-500' :
                    countdown.color === 'purple' ? 'border-l-purple-500' :
                    'border-l-gray-500'
                  }`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{countdown.title}</CardTitle>
                      {countdown.description && (
                        <p className="text-sm text-muted-foreground">{countdown.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      {isExpired ? (
                        <div className="text-red-500 font-semibold">Expirado</div>
                      ) : (
                        <div className="text-center">
                          <div className="flex justify-center gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-2xl font-bold">{days}</div>
                              <div className="text-muted-foreground">dias</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">{hours}</div>
                              <div className="text-muted-foreground">horas</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold">{minutes}</div>
                              <div className="text-muted-foreground">min</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        <Separator />

        <section>
          <h2 className="text-xl font-semibold mb-2">Atividades recentes</h2>
          <div className="grid gap-3">
            {activities.length === 0 && (
              <div className="text-sm text-muted-foreground">Sem atividades ainda.</div>
            )}
            {activities.map((a) => (
              <Card key={a.id}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{a.type}</div>
                      {a.reason && <div className="text-sm text-muted-foreground">{a.reason}</div>}
                    </div>
                    <div className="text-primary font-semibold">+{a.xp} XP</div>
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
