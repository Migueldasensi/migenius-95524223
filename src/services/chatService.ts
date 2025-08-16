import { supabase } from "@/integrations/supabase/client";

export interface ChatMember {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  user?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  type: 'text' | 'image' | 'audio' | 'system';
  content?: string;
  media_url?: string;
  media_thumb_url?: string;
  duration_ms?: number;
  reply_to?: string;
  status: 'sent' | 'delivered' | 'read';
  created_at: string;
  edited_at?: string;
  user?: {
    display_name?: string;
    avatar_url?: string;
  };
}

export interface Chat {
  id: string;
  is_group: boolean;
  name?: string;
  avatar_url?: string;
  description?: string;
  created_by?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  members?: ChatMember[];
  last_message?: Message;
}

class ChatService {
  async getUserChats(): Promise<Chat[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: chats, error } = await supabase
        .from('chats')
        .select(`
          *,
          chat_members!inner(
            id,
            user_id,
            role,
            joined_at
          )
        `)
        .eq('chat_members.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (chats || []) as Chat[];
    } catch (error) {
      console.error('Error in getUserChats:', error);
      throw error;
    }
  }

  async getChat(chatId: string): Promise<Chat | null> {
    const { data: chat, error } = await supabase
      .from('chats')
      .select(`
        *,
        members:chat_members(
          id,
          chat_id,
          user_id,
          role,
          joined_at
        )
      `)
      .eq('id', chatId)
      .single();

    if (error) throw error;
    return chat as Chat;
  }

  async createDirectChat(userId: string): Promise<Chat> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data: tenant } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.user.id)
      .single();

    if (!tenant) throw new Error('User not found');

    // Check if direct chat already exists
    const { data: existingChats } = await supabase
      .from('chat_members')
      .select(`
        chat_id,
        chat:chats(*)
      `)
      .eq('user_id', user.user.id);

    if (existingChats) {
      for (const chatMember of existingChats) {
        const { data: otherMembers } = await supabase
          .from('chat_members')
          .select('user_id')
          .eq('chat_id', chatMember.chat_id)
          .neq('user_id', user.user.id);

        if (otherMembers?.length === 1 && otherMembers[0].user_id === userId) {
          return chatMember.chat as Chat;
        }
      }
    }

    // Create new direct chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: false,
        created_by: user.user.id,
        tenant_id: tenant.tenant_id,
      })
      .select()
      .single();

    if (chatError) throw chatError;

    // Add both users as members
    const { error: membersError } = await supabase
      .from('chat_members')
      .insert([
        { chat_id: chat.id, user_id: user.user.id, role: 'member' },
        { chat_id: chat.id, user_id: userId, role: 'member' },
      ]);

    if (membersError) throw membersError;

    return chat;
  }

  async createGroup(name: string, description?: string, memberIds: string[] = []): Promise<Chat> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const { data: tenant } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.user.id)
      .single();

    if (!tenant) throw new Error('User not found');

    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert({
        is_group: true,
        name,
        description,
        created_by: user.user.id,
        tenant_id: tenant.tenant_id,
      })
      .select()
      .single();

    if (chatError) throw chatError;

    // Add creator as owner
    const members = [
      { chat_id: chat.id, user_id: user.user.id, role: 'owner' as const },
      ...memberIds.map(userId => ({
        chat_id: chat.id,
        user_id: userId,
        role: 'member' as const,
      })),
    ];

    const { error: membersError } = await supabase
      .from('chat_members')
      .insert(members);

    if (membersError) throw membersError;

    return chat;
  }

  async getChatMessages(chatId: string, limit = 50, offset = 0): Promise<Message[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return (messages || []).reverse() as Message[];
  }

  async sendMessage(
    chatId: string,
    content: string,
    type: 'text' | 'image' | 'audio' = 'text',
    mediaUrl?: string,
    replyTo?: string
  ): Promise<Message> {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) throw new Error('Not authenticated');

    const messageData: any = {
      chat_id: chatId,
      user_id: user.user.id,
      type,
      content,
      status: 'sent',
    };

    if (mediaUrl) {
      messageData.media_url = mediaUrl;
    }

    if (replyTo) {
      messageData.reply_to = replyTo;
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select('*')
      .single();

    if (error) throw error;

    // Update chat's updated_at
    await supabase
      .from('chats')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', chatId);

    return message as Message;
  }

  async markMessageAsRead(messageId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('id', messageId);

    if (error) throw error;
  }

  async searchMessages(chatId: string, query: string): Promise<Message[]> {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return (messages || []) as Message[];
  }

  subscribeToChat(chatId: string, onMessage: (message: Message) => void) {
    const channel = supabase
      .channel(`chat:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload) => {
          onMessage(payload.new as Message);
        }
      )
      .subscribe();
    
    return channel;
  }

  unsubscribeFromChat(channel: any) {
    supabase.removeChannel(channel);
  }
}

export const chatService = new ChatService();