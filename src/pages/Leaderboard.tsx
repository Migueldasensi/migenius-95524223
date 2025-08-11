import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

interface UserRow {
  id: string;
  display_name: string | null;
  email: string | null;
  xp: number;
}

export default function Leaderboard() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("id, display_name, email, xp")
        .order("xp", { ascending: false })
        .limit(20);
      if (error) {
        setErrorMsg("Requer permissão de professor/admin para visualizar o ranking.");
        toast({ title: "Sem permissão", description: error.message, variant: "destructive" });
      }
      setUsers(data ?? []);
    };
    load();
  }, []);

  return (
    <AppLayout>
      <Seo title="Leaderboard | Ranking" description="Ranking de XP por tenant (somente staff)." canonicalPath="/leaderboard" />
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="text-muted-foreground">Top 20 por XP</p>
        </header>

        {errorMsg && <div className="text-sm text-muted-foreground">{errorMsg}</div>}

        <div className="grid gap-3">
          {users.map((u, idx) => (
            <Card key={u.id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 text-right">{idx + 1}.</div>
                  <div className="font-medium">{u.display_name ?? u.email ?? "Usuário"}</div>
                </div>
                <div className="text-primary font-semibold">{u.xp} XP</div>
              </CardContent>
            </Card>
          ))}
          {users.length === 0 && !errorMsg && (
            <div className="text-sm text-muted-foreground">Nenhum dado disponível.</div>
          )}
        </div>
      </section>
    </AppLayout>
  );
}
