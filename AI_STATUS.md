# Contexto do Projeto para o Agente de IA (AI_STATUS)

Este arquivo serve para transferir o contexto de desenvolvimento entre sessões ou máquinas diferentes. Ao iniciar uma nova sessão, o agente deve ler este arquivo para entender o estado atual da arquitetura e os próximos passos.

## 🏗️ Estado da Arquitetura (Antigravity Nuxt 4)

O projeto está passando por uma fase pesada de **Desacoplamento e Clean Architecture**. Estamos removendo lógica de banco de dados (Supabase) de dentro dos componentes Vue (UI) e movendo para **Composables** orientados a domínio. Também estamos substituindo o uso cru de componentes do Vuetify por **Componentes Ui*** encapsulados (`UiModal`, `UiCombobox`, etc.).

### 🎯 O que acabou de ser concluído:

1. **Bugfix em Unidades de Medida (`admin/units.vue`)**:
   - Corrigido o bug onde as unidades pendentes não apareciam por conta de cache no `useAsyncData`. Adicionado `refresh()` no `onMounted`.
   - Implementado recurso que permite ao administrador **editar o texto** de uma unidade pendente antes de aprová-la ou fundi-la.

2. **Componentes Base Criados e Aplicados**:
   - `UiModal`, `UiAlert`, `UiCombobox`, `UiSwitch`, `UiInput`, `UiSelect`.
   - Já substituídos com sucesso nas telas de Admin (Categorias/Unidades), Produtos e Demandas.

3. **Composables de Negócio Criados**:
   - `useAdminDashboard`: Agrega as lógicas e cálculos pesados do painel administrativo.
   - `useProducts`: Lida com o CRUD e status dos produtos.
   - `useDemands`: Lida com requisições gerais de demandas, avanços de status e adição/remoção de usuários responsáveis.
   - `useDemandProducts`: Possui a função super-complexa `addDemandItemWithDependencies` que orquestra a criação de produto novo, criação de unidade pendente, vínculo entre eles, e adição na demanda em uma única transaction lógica.

4. **Refatoração Massiva no Frontend**:
   - O arquivo `app/pages/products/index.vue` foi totalmente limpo.
   - O arquivo `app/pages/demands/[id]/index.vue` (que possuía 45KB e dezenas de acessos brutos ao Supabase) foi migrado para chamar os Composables nativos. Nenhum acesso direto ao Supabase permaneceu nos métodos cruciais (salvar item, editar item, alterar status, remover responsáveis).

5. **Testes e Tipagem (Vitest & TS)**:
   - Configurado o mock global do Nuxt/Supabase para resolver erros de contexto (`NUXT_E1001`).
   - Todos os problemas de TypeScript rigoroso (`no-explicit-any`) foram sanados.
   - **Suíte de Testes atual: 24/24 passando 100% verde.**

### 🚀 Próximos Passos Imediatos:

1. **Continuar a varredura por Acoplamento**:
   - Verificar se ainda restam arquivos `*.vue` gigantes que acessam o banco `supabase.from(...)` diretamente e extraí-los para seus devidos composables.
2. **Refatorar Sub-telas**:
   - Verificar se `app/pages/demands/[id]/items/[itemId].vue` (ou similares) precisam da mesma limpeza visual substituindo tags nativas pelo padrão `<Ui...>` e abstraindo as requisições.
3. **Novas Funcionalidades**:
   - Seguir com as pendências do backlog do usuário sempre respeitando as regras estritas descritas no arquivo `GEMINI.md`.

---

_Nota para a IA: Após ler este arquivo, pergunte ao usuário se ele deseja seguir com os próximos passos acima ou se ele tem uma nova demanda prioritária._
