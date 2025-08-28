import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare, Plus, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { chatService, Chat } from "@/services/chatService";
import { useToast } from "@/hooks/use-toast";

export default function Chats() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    loadChats();
  }, []);

  const loadChats = async () => {
    try {
      setLoading(true);
      const data = await chatService.getUserChats();
      setChats(data);
    } catch (error) {
      console.error('Error loading chats:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as conversas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    const chatName = chat.name?.toLowerCase() || '';
    const memberNames = chat.members?.map(m => m.user?.display_name?.toLowerCase() || '').join(' ') || '';
    
    return chatName.includes(query) || memberNames.includes(query);
  });

  const getChatName = (chat: Chat) => {
    if (chat.is_group) {
      return chat.name || 'Grupo sem nome';
    }
    
    // For direct chats, show the other user's name
    const otherMember = chat.members?.find(m => m.user_id !== 'current-user-id'); // Replace with actual user ID check
    return otherMember?.user?.display_name || 'Usuário';
  };

  const getChatAvatar = (chat: Chat) => {
    if (chat.avatar_url) {
      return chat.avatar_url;
    }
    
    if (!chat.is_group) {
      const otherMember = chat.members?.find(m => m.user_id !== 'current-user-id');
      return otherMember?.user?.avatar_url;
    }
    
    return null;
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (days === 1) {
      return 'Ontem';
    } else if (days < 7) {
      return date.toLocaleDateString('pt-BR', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center px-4 gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Conversas</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/groups/new">
              <Users className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="p-4">
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="space-y-2">
          {loading ? (
            // Loading skeletons
            [...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                    <Skeleton className="h-3 w-12" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filteredChats.length > 0 ? (
            filteredChats.map((chat) => {
              const chatName = getChatName(chat);
              const avatarUrl = getChatAvatar(chat);
              
              return (
                <Card key={chat.id} className="hover:bg-muted/50 transition-colors">
                  <CardContent className="p-4">
                    <Link 
                      to={`/chats/${chat.id}`}
                      className="flex items-center gap-3 w-full"
                    >
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={avatarUrl || undefined} />
                          <AvatarFallback>
                            {chat.is_group ? (
                              <Users className="h-6 w-6" />
                            ) : (
                              getInitials(chatName)
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {chat.is_group && (
                          <Badge 
                            variant="secondary" 
                            className="absolute -bottom-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                          >
                            {chat.members?.length || 0}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-sm truncate">
                            {chatName}
                          </h3>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(chat.updated_at)}
                          </span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground truncate">
                          {chat.last_message?.content || 
                           (chat.is_group ? `Grupo com ${chat.members?.length || 0} membros` : 'Toque para conversar')}
                        </p>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'Nenhuma conversa encontrada' : 'Nenhuma conversa ainda'}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery 
                  ? 'Tente buscar por outro termo'
                  : 'Comece uma conversa para aparecer aqui'
                }
              </p>
              {!searchQuery && (
                <Button asChild>
                  <Link to="/groups/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Criar grupo
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}