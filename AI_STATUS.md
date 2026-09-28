# Contexto do Projeto para o Agente de IA (AI_STATUS)

Este arquivo serve para transferir o contexto de desenvolvimento entre sessões ou máquinas diferentes. Ao iniciar uma nova sessão, o agente deve ler este arquivo para entender o estado atual da arquitetura e os próximos passos.

## Estado da Arquitetura (Antigravity Nuxt 4)

O projeto está passando por uma fase pesada de **Desacoplamento e Clean Architecture**. Estamos removendo lógica de banco de dados (Supabase) de dentro dos componentes Vue (UI) e movendo para **Composables** orientados a domínio. Também estamos substituindo o uso cru de componentes do Vuetify por **Componentes Ui*** encapsulados (`UiModal`, `UiCombobox`, `UiAlert`, `UiChip`, etc.).

### O que acabou de ser concluído (Final de Semana):

1. **Gestão de Papéis e Dashboards Isolados (Auth & Middlewares)**:
   - Foram adicionadas novas roles/perfis: `iirgd` e `uge`.
   - Criação de Middlewares dedicados (`iirgd.ts` e `uge.ts`) para proteger e isolar as rotas correspondentes.
   - Criação do dashboard independente para IIRGD (`app/pages/iirgd/index.vue`) e isolamento das páginas de disputa (bidding) em relação ao IIRGD.

2. **Novos Módulos e Tabelas (CRUD)**:
   - **Naturezas de Despesa (Expense Natures)**: Adicionado o composable `useExpenseNatures.ts` e a respectiva tela de administração `app/pages/admin/expense-natures.vue`.
   - **Lances/Ofertas de Produtos (Product Bids)**: Adicionado o composable `useProductBids.ts` e scripts de migração no banco (`demand_product_bids`).

3. **Sub-telas de Demanda**:
   - Criação das páginas aninhadas na visualização de Demanda para itens e fornecedores: `app/pages/demands/[id]/items/[itemId].vue` e `app/pages/demands/[id]/suppliers/[supplierId].vue`.

4. **Testes Massivos (Vitest)**:
   - O projeto ganhou uma suíte de testes muito mais robusta, incluindo um arquivo centralizado de mocks: `tests/mocks/supabaseMock.ts`.
   - Cobertura de testes adicionada para: `useAuth`, `useDemandProducts`, `useDemandWorkflow`, `useExpenseNatures`, `useProductBids`, `useSuppliers`, `useThemeManager`, além dos novos middlewares e páginas administrativas.

5. **Limpeza Contínua**:
   - Foram apagados os restos de arquivos temporários (`temp_detail.txt`, `temp_full.txt`).
   - Todos os testes recém adicionados foram validados.

### Próximos Passos Imediatos:

1. **Garantir a Estabilidade do Novo Fluxo**:
   - Validar se o dashboard IIRGD recém-criado possui todas as métricas ou botões de ação que o perfil necessita.
   - Analisar o fluxo de lances (`product_bids`) dentro da etapa de disputa da demanda.

2. **Refatorar Sub-telas e Funcionalidades**:
   - O fluxo de Disputa/Cotação precisará receber a "edição inline" conforme a demanda avança nas etapas, similar ao que foi feito no Planejamento.
   - Utilizar sempre os componentes desacoplados (`UiModal`, `UiChip`, etc.) em vez das tags cruas do Vuetify.

3. **Novas Funcionalidades**:
   - Seguir com as pendências de negócio listadas pelo usuário ou aprimoramentos no fluxo de orçamentos, sempre respeitando as regras estritas descritas no arquivo `GEMINI.md`.

---

_Nota para a IA: Após ler este arquivo, confirme que o contexto foi recuperado com sucesso e pergunte ao usuário qual é a prioridade atual para dar prosseguimento._
