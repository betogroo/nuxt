# Nuxt + Supabase Auth

Sistema de autenticação construído com [Nuxt 4](https://nuxt.com/), [Vuetify](https://vuetifyjs.com/) e [Supabase](https://supabase.com/).

## Pré-requisitos

- [Node.js](https://nodejs.org/) (v20+)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (para desenvolvimento local)
- [Docker](https://www.docker.com/) (necessário para o Supabase local)

## Setup

### 1. Instalar dependências

```bash
npm install
```

### 2. Iniciar o Supabase local

```bash
npx supabase start
```

Copie a `anon key` exibida no terminal e configure o arquivo `.env`:

```bash
cp .env.example .env
```

Edite o `.env` e cole a chave:

```env
NUXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NUXT_PUBLIC_SUPABASE_KEY=<sua-anon-key>
```

### 3. Aplicar migrations

```bash
npx supabase db reset
```

### 4. Gerar tipos do banco (opcional)

```bash
npx supabase gen types typescript --local > app/types/database.types.ts
```

## Desenvolvimento

```bash
npm run dev
```

O servidor estará disponível em `http://127.0.0.1:3000`.

## Scripts disponíveis

| Comando              | Descrição                         |
| -------------------- | --------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento       |
| `npm run build`      | Build de produção                 |
| `npm run preview`    | Preview do build                  |
| `npm run lint`       | Verificar código com ESLint       |
| `npm run lint:fix`   | Corrigir código com ESLint        |
| `npm run format`     | Verificar formatação com Prettier |
| `npm run format:fix` | Corrigir formatação com Prettier  |
| `npm run typecheck`  | Verificar tipos com TypeScript    |

## Estrutura do projeto

```
app/
├── components/theme/   # Componente de alternância de tema
├── composables/        # useThemeManager
├── layouts/            # Layout padrão com navbar
├── pages/              # Páginas (login, registro, confirm, home, about)
└── types/              # Tipos TypeScript (theme, database)

supabase/
├── config.toml         # Configuração do Supabase local
└── migrations/         # Migrations SQL
```

## Fluxo de autenticação

1. **Registro** (`/register`) — Cria conta com e-mail e senha
2. **Login** (`/login`) — Duas opções: senha ou magic link
3. **Confirmação** (`/confirm`) — Callback de confirmação de e-mail/magic link
4. **Home** (`/`) — Página protegida (requer autenticação)

## Banco de dados

### Tabela `profiles`

Criada automaticamente via trigger quando um novo usuário é registrado no `auth.users`.

| Coluna       | Tipo          | Descrição                              |
| ------------ | ------------- | -------------------------------------- |
| `id`         | uuid (PK, FK) | Referencia `auth.users.id`             |
| `created_at` | timestamptz   | Data de criação                        |
| `updated_at` | timestamptz   | Data de atualização (auto via trigger) |
| `name`       | text          | Nome do usuário                        |
| `avatar_url` | text          | URL do avatar                          |
| `role`       | user_role     | `'user'` (padrão) ou `'admin'`         |

### RLS (Row Level Security)

- Usuários podem **ler** e **editar** apenas seu próprio perfil
- Admins podem ler todos os perfis
