import { ReactNode, useEffect } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import ThemeToggle from "@/components/ThemeToggle";
import DynamicIsland from "@/components/DynamicIsland";
import { isFeatureEnabled } from "@/lib/featureFlags";
import { supabase } from "@/integrations/supabase/client";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  useEffect(() => {
    // Apply saved theme on layout mount
    (async () => {
      const { data } = await supabase.auth.getUser();
      const pref = (data.user?.user_metadata as any)?.theme as 'light' | 'dark' | undefined;
      if (pref) document.documentElement.classList.toggle('dark', pref === 'dark');
    })();
  }, []);

  return (
    <SidebarProvider>
      {isFeatureEnabled('dynamicIsland') && <DynamicIsland />}
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="offcanvas">
          <AppSidebar />
        </Sidebar>

        <SidebarInset>
          <header className="h-14 border-b flex items-center px-3 gap-2 bg-background justify-between">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="text-sm text-muted-foreground">Menu</div>
            </div>
            <ThemeToggle />
          </header>

          <main className="flex-1 p-4">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
