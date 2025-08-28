import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: req.headers.get("Authorization") ?? "" },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Não autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const body = await req.json();
    const targetUserId: string | undefined = body.user_id;
    const xp: number | undefined = body.xp;
    const reason: string | undefined = body.reason;
    const metadata = body.metadata ?? null;

    if (!targetUserId || !Number.isFinite(xp) || xp! <= 0) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Discover tenant
    const { data: tenantId, error: tenantErr } = await supabase.rpc("current_user_tenant");
    if (tenantErr || !tenantId) {
      return new Response(JSON.stringify({ error: "Tenant não encontrado" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check role: teacher or admin
    const { data: isTeacher } = await supabase.rpc("has_role_in_tenant", {
      _user_id: user.id,
      _role: "teacher",
      _tenant_id: tenantId,
    });
    const { data: isAdmin } = await supabase.rpc("has_role_in_tenant", {
      _user_id: user.id,
      _role: "admin",
      _tenant_id: tenantId,
    });

    if (!isTeacher && !isAdmin) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Insert activity record
    const { data: activity, error: actErr } = await supabase
      .from("activities")
      .insert([
        {
          type: "xp_award",
          tenant_id: tenantId,
          user_id: targetUserId,
          xp,
          reason,
          metadata,
        },
      ])
      .select("id")
      .maybeSingle();

    if (actErr) {
      return new Response(JSON.stringify({ error: actErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Update user's total XP: read then write
    const { data: uRow, error: uSelErr } = await supabase
      .from("users")
      .select("xp")
      .eq("id", targetUserId)
      .maybeSingle();

    if (uSelErr) {
      return new Response(JSON.stringify({ error: uSelErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const currentXp = uRow?.xp ?? 0;
    const newXp = currentXp + xp!;

    const { error: updErr } = await supabase
      .from("users")
      .update({ xp: newXp })
      .eq("id", targetUserId);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({ success: true, activity_id: activity?.id ?? null, new_xp: newXp }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? "Erro desconhecido" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
