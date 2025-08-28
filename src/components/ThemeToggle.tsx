import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    // Load preference from Supabase user metadata
    (async () => {
      const { data } = await supabase.auth.getUser();
      const pref = (data.user?.user_metadata as any)?.theme as 'light' | 'dark' | undefined;
      if (pref) {
        setTheme(pref);
        document.documentElement.classList.toggle('dark', pref === 'dark');
      }
    })();
  }, []);

  const toggle = async () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    try {
      await supabase.auth.updateUser({ data: { theme: next } });
    } catch {}
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Alternar tema">
      {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </Button>
  );
}
