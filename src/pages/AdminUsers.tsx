import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

interface URow { id: string; email: string | null; display_name: string | null; xp: number; }

export default function AdminUsers() {
  const [users, setUsers] = useState<URow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [adjust, setAdjust] = useState<Record<string, number>>({});

  const load = async () => {
    const { data, error } = await supabase
      .from("users")
      .select("id, email, display_name, xp")
      .order("xp", { ascending: false });
    if (error) {
      setErrorMsg("Requer permissão de professor/admin.");
      toast({ title: "Sem permissão", description: error.message, variant: "destructive" });
    }
    setUsers(data ?? []);
  };

  useEffect(() => { (async () => { await load(); setLoading(false); })(); }, []);

  const exportCsv = () => {
    const header = ['id','email','display_name','xp'];
    const rows = users.map(u => [u.id, u.email ?? '', u.display_name ?? '', String(u.xp)]);
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const applyAdjust = async (userId: string) => {
    const delta = Number(adjust[userId] || 0);
    if (!delta) return;
    const reason = delta > 0 ? 'Adjust XP +' + delta : 'Adjust XP ' + delta;
    const { error } = await supabase.functions.invoke('award-xp', {
      body: { user_id: userId, xp: delta, reason }
    });
    if (error) {
      toast({ title: 'Erro ao ajustar XP', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'XP ajustado' });
      setAdjust(prev => ({ ...prev, [userId]: 0 }));
      await load();
    }
  };

  return (
    <AppLayout>
      <Seo title="Admin | Usuários" description="Gerencie usuários e XP." canonicalPath="/admin/users" />
      <section className="space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Usuários</h1>
            <p className="text-muted-foreground">Gerencie XP e exporte CSV.</p>
          </div>
          <Button variant="secondary" onClick={exportCsv}>Exportar CSV</Button>
        </header>

        {errorMsg && <div className="text-sm text-muted-foreground">{errorMsg}</div>}

        <div className="grid gap-3">
          {users.map((u) => (
            <Card key={u.id}>
              <CardContent className="py-4 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <div className="font-medium">{u.display_name ?? u.email ?? 'Usuário'}</div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-primary font-semibold min-w-[80px] text-right">{u.xp} XP</div>
                  <Input type="number" className="w-28" value={adjust[u.id] ?? 0} onChange={(e) => setAdjust(a => ({ ...a, [u.id]: Number(e.target.value) }))} />
                  <Button onClick={() => applyAdjust(u.id)}>Aplicar</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {users.length === 0 && !errorMsg && <div className="text-sm text-muted-foreground">Sem usuários</div>}
        </div>
      </section>
    </AppLayout>
  );
}
