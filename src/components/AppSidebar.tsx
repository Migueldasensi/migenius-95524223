import { useEffect, useState } from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { 
  Gauge, 
  BookOpen, 
  FileText, 
  Trophy, 
  LogOut, 
  Users, 
  Settings, 
  Calendar, 
  Brain, 
  Timer,
  Music,
  MessageSquare,
  UserPlus,
  Zap,
  CalendarDays
} from "lucide-react";
import { SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { isFeatureEnabled } from "@/lib/featureFlags";

interface UserRole {
  role: 'admin' | 'teacher' | 'student';
}

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        setUserRole({ role: 'student' }); // Default to student
      } else if (roles && roles.length > 0) {
        // Get the highest role
        const roleHierarchy = { admin: 3, teacher: 2, student: 1 };
        const highestRole = roles.reduce((prev, current) => 
          roleHierarchy[current.role as keyof typeof roleHierarchy] > roleHierarchy[prev.role as keyof typeof roleHierarchy] ? current : prev
        );
        setUserRole({ role: highestRole.role as 'admin' | 'teacher' | 'student' });
      } else {
        setUserRole({ role: 'student' }); // Default to student
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setUserRole({ role: 'student' }); // Default to student
    } finally {
      setLoading(false);
    }
  };

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Erro ao sair", description: error.message, variant: "destructive" });
    } else {
      navigate("/auth", { replace: true });
    }
  };

  const isAdmin = userRole?.role === 'admin';
  const isTeacher = userRole?.role === 'teacher' || isAdmin;

  // Core menu items
  const coreItems = [
    { title: "Dashboard", url: "/dashboard", icon: Gauge },
    { title: "Tópicos", url: "/topics", icon: BookOpen },
    { title: "Redações", url: "/essays", icon: FileText },
    { title: "Relatórios", url: "/reports", icon: Calendar },
    { title: "IA Nutricional", url: "/ia-nutricional", icon: Brain },
    { title: "Ranking de Estudos", url: "/ranking-estudos", icon: Timer },
  ];

  // Spotify features (if enabled)
  const spotifyItems = isFeatureEnabled('spotify') ? [
    { title: "Playlists", url: "/playlists", icon: Music },
  ] : [];

  // Social features (if enabled)
  const socialItems = isFeatureEnabled('socialChat') ? [
    { title: "Conversas", url: "/chats", icon: MessageSquare },
  ] : [];

  // Admin items (only for teachers and admins)
  const adminItems = isTeacher ? [
    { title: "Contagens Regressivas", url: "/admin/countdowns", icon: CalendarDays },
    { title: "Leaderboard", url: "/admin/leaderboard", icon: Trophy },
    ...(isAdmin ? [{ title: "Gerenciar Usuários", url: "/admin/users", icon: UserPlus }] : [])
  ] : [];

  if (loading) {
    return (
      <SidebarContent>
        <div className="p-4">Carregando...</div>
      </SidebarContent>
    );
  }

  return (
    <SidebarContent>
      {/* Core Features */}
      <SidebarGroup>
        <SidebarGroupLabel>Estudos</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {coreItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink to={item.url} end className={getNavCls}>
                    <item.icon className="mr-2 h-4 w-4" />
                    <span>{item.title}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* Spotify Section */}
      {spotifyItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>
            <Music className="h-4 w-4 mr-2" />
            Spotify
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {spotifyItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* Social Section */}
      {socialItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>
            <MessageSquare className="h-4 w-4 mr-2" />
            Social
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {socialItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* Admin Section - Only for teachers and admins */}
      {adminItems.length > 0 && (
        <SidebarGroup>
          <SidebarGroupLabel>
            <Zap className="h-4 w-4 mr-2" />
            Administração
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className={getNavCls}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      )}

      {/* Settings */}
      <SidebarGroup>
        <SidebarGroupLabel>Configurações</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild>
                <NavLink to="/settings" end className={getNavCls}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Configurações</span>
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <div className="p-2 pt-0">
        <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
          <LogOut className="mr-2 h-4 w-4" /> Sair
        </Button>
      </div>
    </SidebarContent>
  );
}