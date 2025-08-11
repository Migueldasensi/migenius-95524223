import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

interface CRow { id: string; title: string; target_at: string; }

function daysLeft(targetAt: string) {
  const now = new Date();
  const t = new Date(targetAt);
  // inclusive end-of-day (UTC-3)
  const endOfDayUTC = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 23 + 3, 59, 59); // add 3h to hit UTC-3 23:59
  const diffMs = endOfDayUTC - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function Countdowns() {
  const [rows, setRows] = useState<CRow[]>([]);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [canWrite, setCanWrite] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("countdowns")
      .select("id, title, target_at")
      .order("target_at", { ascending: true });
    if (error) toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
    setRows(data ?? []);
  };

  useEffect(() => {
    (async () => {
      await load();
      const [{ data: userRes }, { data: tenantId }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("current_user_tenant"),
      ]);
      const user = userRes.user;
      const tId = tenantId as unknown as string | null;
      if (user && tId) {
        const { data: isTeacher } = await supabase.rpc("has_role_in_tenant", { _user_id: user.id, _role: "teacher", _tenant_id: tId });
        const { data: isAdmin } = await supabase.rpc("has_role_in_tenant", { _user_id: user.id, _role: "admin", _tenant_id: tId });
        setCanWrite(!!isTeacher || !!isAdmin);
      }
    })();
  }, []);

  const add = async () => {
    try {
      const [{ data: userRes }, { data: tenantId }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("current_user_tenant"),
      ]);
      const user = userRes.user; const tId = tenantId as unknown as string | null;
      if (!user || !tId) throw new Error("Sessão inválida");
      const target_at = new Date(date).toISOString();
      const { error } = await supabase.from("countdowns").insert({ title, target_at, tenant_id: tId, created_by: user.id });
      if (error) throw error;
      setTitle(""); setDate("");
      toast({ title: "Contagem criada" });
      await load();
    } catch (e: any) {
      toast({ title: "Erro ao criar", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AppLayout>
      <Seo title="Contagens | Provas e Simulados" description="Contagens regressivas por data de prova/simulado." canonicalPath="/countdowns" />
      <section className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold">Contagens</h1>
          <p className="text-muted-foreground">Acompanhe as datas importantes.</p>
        </header>

        {canWrite && (
          <Card>
            <CardHeader><CardTitle>Nova contagem</CardTitle></CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="max-w-xs" />
              <Button onClick={add} disabled={!title || !date}>Adicionar</Button>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader><CardTitle>{r.title}</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{Math.max(0, daysLeft(r.target_at))} dias</div>
                <div className="text-sm text-muted-foreground">até {new Date(r.target_at).toLocaleDateString()}</div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && <div className="text-sm text-muted-foreground">Nenhuma contagem criada.</div>}
        </div>
      </section>
    </AppLayout>
  );
}
