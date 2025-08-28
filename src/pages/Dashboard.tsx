import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface Activity {
  id: string;
  type: string;
  reason: string | null;
  xp: number;
  created_at: string;
}

export default function Dashboard() {
  const [email, setEmail] = useState<string | null>(null);
  const [xp, setXp] = useState<number>(0);
  const [activities, setActivities] = useState<Activity[]>([]);

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
        .limit(5);
      setActivities(acts ?? []);
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Total de XP</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-semibold">{xp}</CardContent>
          </Card>
        </div>

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
