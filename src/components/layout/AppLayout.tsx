import { ReactNode } from "react";
import { SidebarProvider, Sidebar, SidebarContent, SidebarInset, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="offcanvas">
          <AppSidebar />
        </Sidebar>

        <SidebarInset>
          <header className="h-14 border-b flex items-center px-3 gap-2 bg-background">
            <SidebarTrigger />
            <div className="text-sm text-muted-foreground">Menu</div>
          </header>

          <main className="flex-1 p-4">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
