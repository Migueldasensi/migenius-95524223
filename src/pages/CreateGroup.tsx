import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Users, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface User {
  id: string;
  display_name: string;
  email: string;
}

export default function CreateGroup() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupData, setGroupData] = useState({
    name: "",
    description: "",
  });

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setAvailableUsers([]);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('users')
        .select('id, display_name, email')
        .neq('id', user.id) // Exclude current user
        .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;
      setAvailableUsers(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    searchUsers(value);
  };

  const addUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setSearchQuery("");
    setAvailableUsers([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const createGroup = async () => {
    if (!groupData.name.trim()) {
      toast({
        title: "Erro",
        description: "O nome do grupo é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: "Erro", 
        description: "Adicione pelo menos um membro ao grupo",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get user's tenant
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

      if (!userData?.tenant_id) throw new Error('Tenant não encontrado');

      // Create the chat group
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: groupData.name,
          description: groupData.description,
          is_group: true,
          created_by: user.id,
          tenant_id: userData.tenant_id
        })
        .select()
        .single();

      if (chatError) throw chatError;

      // Add creator as admin member
      const members = [
        {
          chat_id: chat.id,
          user_id: user.id,
          role: 'admin'
        },
        // Add selected users as members
        ...selectedUsers.map(u => ({
          chat_id: chat.id,
          user_id: u.id,
          role: 'member'
        }))
      ];

      const { error: membersError } = await supabase
        .from('chat_members')
        .insert(members);

      if (membersError) throw membersError;

      toast({
        title: "Sucesso!",
        description: "Grupo criado com sucesso",
      });

      navigate(`/chats/${chat.id}`);
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: "Erro",
        description: error.message || "Não foi possível criar o grupo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center px-4 gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/chats">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Criar Grupo</h1>
      </header>

      <main className="p-4 max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Group Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Informações do Grupo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="groupName">Nome do Grupo *</Label>
                <Input
                  id="groupName"
                  placeholder="Digite o nome do grupo"
                  value={groupData.name}
                  onChange={(e) => setGroupData({ ...groupData, name: e.target.value })}
                />
              </div>
              
              <div>
                <Label htmlFor="groupDescription">Descrição (opcional)</Label>
                <Textarea
                  id="groupDescription"
                  placeholder="Descreva o propósito do grupo"
                  value={groupData.description}
                  onChange={(e) => setGroupData({ ...groupData, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Members */}
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Membros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Buscar usuários</Label>
                <Input
                  placeholder="Digite o nome ou email do usuário"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                />
              </div>

              {/* Search Results */}
              {availableUsers.length > 0 && (
                <div className="border rounded-lg p-2 max-h-48 overflow-y-auto">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => addUser(user)}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {(user.display_name || user.email).charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{user.display_name || user.email}</p>
                          {user.display_name && (
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          )}
                        </div>
                      </div>
                      <Plus className="h-4 w-4" />
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Members */}
              <div>
                <Label>Membros selecionados ({selectedUsers.length})</Label>
                {selectedUsers.length > 0 ? (
                  <div className="space-y-2 mt-2">
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-2 border rounded-lg"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>
                              {(user.display_name || user.email).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.display_name || user.email}</p>
                            {user.display_name && (
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeUser(user.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground mt-2">
                    Nenhum membro selecionado ainda
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" asChild>
              <Link to="/chats">Cancelar</Link>
            </Button>
            <Button 
              className="flex-1" 
              onClick={createGroup}
              disabled={loading}
            >
              {loading ? "Criando..." : "Criar Grupo"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}