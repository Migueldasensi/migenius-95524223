import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Send, MoreVertical, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  user?: {
    display_name: string;
    email: string;
  };
}

interface Chat {
  id: string;
  name?: string;
  is_group: boolean;
  members?: Array<{
    user_id: string;
    role: string;
    user?: {
      display_name: string;
      email: string;
    };
  }>;
}

export default function ChatDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadChat();
      loadMessages();
      getCurrentUser();
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const loadChat = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          name,
          is_group,
          chat_members (
            user_id,
            role,
            users (
              display_name,
              email
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setChat(data);
    } catch (error) {
      console.error('Error loading chat:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a conversa",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          id,
          content,
          user_id,
          created_at,
          users (
            display_name,
            email
          )
        `)
        .eq('chat_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_id: id,
          user_id: currentUserId,
          content: newMessage.trim(),
          type: 'text'
        });

      if (error) throw error;

      setNewMessage("");
      loadMessages(); // Reload messages to show the new one
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar a mensagem",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getChatName = () => {
    if (!chat) return "";
    
    if (chat.is_group) {
      return chat.name || "Grupo sem nome";
    }
    
    // For direct chats, show the other user's name
    const otherMember = chat.members?.find(m => m.user_id !== currentUserId);
    return otherMember?.user?.display_name || otherMember?.user?.email || "Usuário";
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p>Carregando conversa...</p>
        </div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p>Conversa não encontrada</p>
          <Button asChild className="mt-4">
            <Link to="/chats">Voltar às conversas</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-14 border-b flex items-center px-4 gap-3 bg-background">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/chats">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {chat.is_group ? (
                <Users className="h-4 w-4" />
              ) : (
                getChatName().charAt(0).toUpperCase()
              )}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-medium truncate">{getChatName()}</h1>
            {chat.is_group && (
              <p className="text-xs text-muted-foreground">
                {chat.members?.length || 0} membros
              </p>
            )}
          </div>
        </div>

        <Button variant="ghost" size="sm">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma mensagem ainda</p>
            <p className="text-sm text-muted-foreground">Seja o primeiro a enviar uma mensagem!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.user_id === currentUserId;
            const userName = message.user?.display_name || message.user?.email || "Usuário";
            
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : 'order-2'}`}>
                  {!isOwn && chat.is_group && (
                    <p className="text-xs text-muted-foreground mb-1 px-2">
                      {userName}
                    </p>
                  )}
                  
                  <Card className={`p-3 ${
                    isOwn 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      isOwn 
                        ? 'text-primary-foreground/70' 
                        : 'text-muted-foreground'
                    }`}>
                      {formatTime(message.created_at)}
                    </p>
                  </Card>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4 bg-background">
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}