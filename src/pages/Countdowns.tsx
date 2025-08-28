import { useEffect, useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import Seo from "@/components/Seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Plus, Edit, Trash2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CRow {
  id: string;
  title: string;
  target_at: string;
  color?: string;
  description?: string;
}

function daysLeft(targetAt: string): { days: number; hours: number; minutes: number } {
  const target = new Date(targetAt);
  const now = new Date();
  const diffTime = target.getTime() - now.getTime();
  
  if (diffTime <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }
  
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
}

export default function Countdowns() {
  const [rows, setRows] = useState<CRow[]>([]);
  const [title, setTitle] = useState("");
  const [targetAt, setTargetAt] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("blue");
  const [canWrite, setCanWrite] = useState(false);
  const [editingItem, setEditingItem] = useState<CRow | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const colorOptions = [
    { value: "blue", label: "Azul", gradient: "from-blue-500 to-blue-600" },
    { value: "green", label: "Verde", gradient: "from-green-500 to-green-600" },
    { value: "purple", label: "Roxo", gradient: "from-purple-500 to-purple-600" },
    { value: "orange", label: "Laranja", gradient: "from-orange-500 to-orange-600" },
    { value: "red", label: "Vermelho", gradient: "from-red-500 to-red-600" },
    { value: "pink", label: "Rosa", gradient: "from-pink-500 to-pink-600" },
  ];

  const load = async () => {
    const { data, error } = await supabase
      .from("countdowns")
      .select("*")
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

  const resetForm = () => {
    setTitle("");
    setTargetAt("");
    setDescription("");
    setColor("blue");
    setEditingItem(null);
  };

  const openDialog = (item?: CRow) => {
    if (item) {
      setEditingItem(item);
      setTitle(item.title);
      setTargetAt(item.target_at.split('T')[0]);
      setDescription(item.description || "");
      setColor(item.color || "blue");
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const save = async () => {
    if (!title.trim() || !targetAt) {
      toast({
        title: "Erro",
        description: "Preencha título e data",
        variant: "destructive"
      });
      return;
    }

    try {
      const [{ data: userRes }, { data: tenantId }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("current_user_tenant"),
      ]);
      const user = userRes.user;
      const tId = tenantId as unknown as string | null;
      if (!user || !tId) throw new Error("Sessão inválida");

      if (editingItem) {
        // Update existing
        const { error } = await supabase
          .from("countdowns")
          .update({
            title,
            target_at: targetAt,
            description,
            color,
          })
          .eq("id", editingItem.id);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Contagem regressiva atualizada!",
        });
      } else {
        // Create new
        const target_at = new Date(targetAt).toISOString();
        const { error } = await supabase
          .from("countdowns")
          .insert({
            title,
            target_at,
            description,
            color,
            tenant_id: tId,
            created_by: user.id,
          });

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Contagem regressiva criada!",
        });
      }
      
      setIsDialogOpen(false);
      resetForm();
      await load();
    } catch (e: any) {
      console.error("Erro ao salvar:", e);
      toast({
        title: "Erro",
        description: e.message,
        variant: "destructive"
      });
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("countdowns")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Contagem regressiva removida!",
      });
      await load();
    } catch (error) {
      console.error("Erro ao deletar:", error);
      toast({
        title: "Erro",
        description: "Não foi possível remover",
        variant: "destructive"
      });
    }
  };

  const getColorGradient = (colorName: string) => {
    const colorOption = colorOptions.find(c => c.value === colorName);
    return colorOption?.gradient || "from-blue-500 to-blue-600";
  };

  return (
    <AppLayout>
      <Seo title="Contagens | Provas e Simulados" description="Contagens regressivas por data de prova/simulado." canonicalPath="/countdowns" />
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Calendar className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Contagens Regressivas</h1>
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-lg">
            Acompanhe os dias restantes para datas importantes
          </p>
        </div>

        {canWrite && (
          <Card className="border-dashed border-2 border-primary/30">
            <CardContent className="text-center py-6">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => openDialog()} size="lg" className="gap-2">
                    <Plus className="h-5 w-5" />
                    Adicionar Contagem Regressiva
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>
                      {editingItem ? "Editar" : "Adicionar"} Contagem Regressiva
                    </DialogTitle>
                    <DialogDescription>
                      {editingItem ? "Atualize" : "Crie"} uma contagem regressiva para uma data importante
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Título</Label>
                      <Input
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Ex: Prova do ENEM"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Descrição (opcional)</Label>
                      <Textarea
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Adicione mais detalhes..."
                        className="min-h-[80px]"
                      />
                    </div>
                    <div>
                      <Label htmlFor="date">Data</Label>
                      <Input
                        id="date"
                        type="date"
                        value={targetAt}
                        onChange={(e) => setTargetAt(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="color">Cor do card</Label>
                      <Select value={color} onValueChange={setColor}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colorOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center gap-2">
                                <div 
                                  className={`w-4 h-4 rounded-full bg-gradient-to-r ${option.gradient}`}
                                />
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button onClick={save} className="flex-1">
                        {editingItem ? "Atualizar" : "Criar"}
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => setIsDialogOpen(false)}
                        className="flex-1"
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rows.length === 0 ? (
            <div className="col-span-full">
              <Card className="border-dashed border-2">
                <CardContent className="text-center py-12">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground text-lg">
                    Nenhuma contagem regressiva cadastrada.
                  </p>
                  {canWrite && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Clique no botão acima para criar uma!
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            rows.map((row) => {
              const timeLeft = daysLeft(row.target_at);
              const isExpired = timeLeft.days <= 0 && timeLeft.hours <= 0 && timeLeft.minutes <= 0;
              
              return (
                <Card 
                  key={row.id} 
                  className={`overflow-hidden relative ${isExpired ? 'opacity-75' : ''}`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${getColorGradient(row.color || 'blue')} opacity-90`} />
                  <div className="relative z-10 text-white">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-white text-lg leading-tight">
                            {row.title}
                          </CardTitle>
                          {row.description && (
                            <p className="text-white/80 text-sm mt-1">
                              {row.description}
                            </p>
                          )}
                        </div>
                        {canWrite && (
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openDialog(row)}
                              className="h-8 w-8 p-0 text-white hover:bg-white/20"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteItem(row.id)}
                              className="h-8 w-8 p-0 text-white hover:bg-white/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      {isExpired ? (
                        <div className="text-center">
                          <div className="text-3xl font-bold text-white mb-1">
                            Expirado
                          </div>
                          <p className="text-white/80 text-sm">
                            {new Date(row.target_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-4xl font-bold text-white mb-1">
                            {timeLeft.days}
                          </div>
                          <p className="text-white/90 text-sm mb-2">
                            dias restantes
                          </p>
                          <div className="flex justify-center gap-4 text-xs text-white/80">
                            <span>{timeLeft.hours}h</span>
                            <span>{timeLeft.minutes}m</span>
                          </div>
                          <p className="text-white/80 text-xs mt-2">
                            {new Date(row.target_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}