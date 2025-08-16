# Migenius - Sistema de Estudos

Sistema modular de estudos com funcionalidades incrementais.

## 🚀 Funcionalidades

### Core (Sempre Ativo)
- ✅ Dashboard com XP e ranking
- ✅ Sistema de redações com IA
- ✅ IA Nutricional 
- ✅ Ranking de estudos com timer
- ✅ Sistema de patentes por XP
- ✅ Autenticação via Supabase

### Módulos Opcionais (Feature Flags)

#### 🎵 Spotify Integration
- Login OAuth PKCE
- Visualização de playlists
- Preview de 30s das músicas
- Integração com Dynamic Island

#### 💬 Social Chat
- Chats 1:1 e grupos estilo WhatsApp
- Mensagens de texto, imagem e áudio
- Status de presença online/offline
- Upload de mídia com compressão

#### 🏝️ Dynamic Island
- Status de música tocando
- Notificações de chat
- Progresso de upload
- Animações suaves

## ⚙️ Configuração

### Variáveis de Ambiente

```env
# Supabase (obrigatório)
VITE_PUBLIC_SUPABASE_URL=sua_url
VITE_PUBLIC_SUPABASE_ANON_KEY=sua_chave

# Feature Flags (opcional)
VITE_ENABLE_SPOTIFY=true
VITE_ENABLE_SOCIAL_CHAT=true  
VITE_ENABLE_DYNAMIC_ISLAND=true
VITE_ENABLE_ENHANCED_PROFILE=true

# Spotify (só se VITE_ENABLE_SPOTIFY=true)
VITE_SPOTIFY_CLIENT_ID=seu_client_id

# Secrets para Edge Functions
SPOTIFY_CLIENT_SECRET=seu_client_secret
GEMINI_API_KEY=sua_chave_gemini
```

### Comandos

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Build para Android (Capacitor)
npm run build
npx cap add android
npx cap sync
npx cap run android

# Build para iOS (Capacitor)
npx cap add ios  
npx cap sync
npx cap run ios
```

## 🏗️ Arquitetura

### Stack Tecnológico
- **Frontend**: React + Vite + TypeScript
- **Styling**: TailwindCSS + Shadcn/UI
- **Animações**: Framer Motion
- **Backend**: Supabase (Auth, DB, Storage, Edge Functions)
- **Mobile**: Capacitor
- **Deploy**: Netlify

### Banco de Dados

#### Tabelas Core
- `users` - Dados dos usuários
- `user_roles` - Papéis (admin/teacher/student)
- `activities` - Log de atividades e XP
- `essays` - Redações dos usuários
- `topics` - Tópicos para redação
- `study_sessions` - Sessões de estudo

#### Tabelas Sociais (se habilitado)
- `user_profiles` - Perfis expandidos
- `chats` - Conversas (1:1 e grupos)
- `chat_members` - Membros dos grupos
- `messages` - Mensagens
- `presence` - Status online/offline

### Sistema de Permissões

```sql
-- Hierarquia de papéis
admin > teacher > student

-- Funcionalidades por papel:
- Student: Estudar, redações, chat
- Teacher: + Gerenciar XP, ver relatórios
- Admin: + Gerenciar usuários, countdowns
```

## 🔧 Desenvolvimento

### Adicionando Nova Funcionalidade

1. **Criar Feature Flag**:
```typescript
// src/lib/featureFlags.ts
export const featureFlags = {
  minhaFuncionalidade: import.meta.env.VITE_ENABLE_MINHA_FUNCIONALIDADE === 'true',
}
```

2. **Criar Componente com Lazy Loading**:
```typescript
// src/pages/MinhaFuncionalidade.tsx
const MinhaFuncionalidade = lazy(() => import("./pages/MinhaFuncionalidade"));
```

3. **Adicionar Rota Condicional**:
```typescript
// src/App.tsx
{isFeatureEnabled('minhaFuncionalidade') && (
  <Route path="/minha-funcionalidade" element={
    <Suspense fallback={<div>Carregando...</div>}>
      <MinhaFuncionalidade />
    </Suspense>
  } />
)}
```

### Testando Features

```bash
# Habilitar todas as features
echo "VITE_ENABLE_SPOTIFY=true
VITE_ENABLE_SOCIAL_CHAT=true
VITE_ENABLE_DYNAMIC_ISLAND=true" > .env.local

# Testar só core
echo "# Todas features desabilitadas" > .env.local
```

## 📱 Deploy Mobile

### Android
```bash
# Primeiro deploy
npm run build
npx cap add android
npx cap sync
npx cap open android

# Updates subsequentes  
npm run build
npx cap sync
```

### iOS
```bash
# Primeiro deploy (requer macOS + Xcode)
npm run build
npx cap add ios
npx cap sync
npx cap open ios
```

## 🔐 Segurança

- **RLS**: Row Level Security habilitado em todas as tabelas
- **Tokens**: Spotify tokens gerenciados via Edge Functions
- **Upload**: Mídia comprimida no cliente
- **Permissões**: Controle granular por papel

## 📊 Monitoramento

- **Logs**: Supabase Edge Function Logs
- **Analytics**: Supabase Analytics Dashboard
- **Errors**: Console logs + Supabase realtime

---

**Criado com ❤️ usando Lovable**