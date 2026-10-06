# Contexto do Projeto para o Agente de IA (AI_STATUS)

Este arquivo serve para transferir o contexto de desenvolvimento entre sessÃµes ou mÃ¡quinas diferentes. Ao iniciar uma nova sessÃ£o, o agente deve ler este arquivo para entender o estado atual da arquitetura e os prÃ³ximos passos.

## Estado da Arquitetura (Antigravity Nuxt 4)

O projeto estÃ¡ passando por uma fase pesada de **Desacoplamento e Clean Architecture**. Estamos removendo lÃ³gica de banco de dados (Supabase) de dentro dos componentes Vue (UI) e movendo para **Composables** orientados a domÃ­nio. TambÃ©m estamos substituindo o uso cru de componentes do Vuetify por **Componentes Ui*** encapsulados (`UiModal`, `UiCombobox`, `UiAlert`, `UiChip`, etc.).

### O que acabou de ser concluÃ­do (Final de Semana):

1. **GestÃ£o de PapÃ©is e Dashboards Isolados (Auth & Middlewares)**:
   - Foram adicionadas novas roles/perfis: `iirgd` e `uge`.
   - CriaÃ§Ã£o de Middlewares dedicados (`iirgd.ts` e `uge.ts`) para proteger e isolar as rotas correspondentes.
   - CriaÃ§Ã£o do dashboard independente para IIRGD (`app/pages/iirgd/index.vue`) e isolamento das pÃ¡ginas de disputa (bidding) em relaÃ§Ã£o ao IIRGD.

2. **Novos MÃ³dulos e Tabelas (CRUD)**:
   - **Naturezas de Despesa (Expense Natures)**: Adicionado o composable `useExpenseNatures.ts` e a respectiva tela de administraÃ§Ã£o `app/pages/admin/expense-natures.vue`.
   - **Lances/Ofertas de Produtos (Product Bids)**: Adicionado o composable `useProductBids.ts` e scripts de migraÃ§Ã£o no banco (`demand_product_bids`).

3. **Sub-telas de Demanda**:
   - Interfaces quebradas e modais centralizados usando UiModal.
4. **Módulo IIRGD (Demandas e Status Histórico)**:
   - Adicionado rastreio de histórico (iirgd_demand_status_history) com exibição via <UiTimeline>.
   - Transição do status para ENUM em inglês (
     ew, issued, etc.) com labels em português no Frontend.
   - Refatorada a página de listagem (/iirgd) para usar <UiTabs> (Em Andamento, Emitidos, Erros) com cores e ícones semânticos ( ime, success, lert).
   - Implementada validação matemática estrita para o Dígito Verificador de RG de SP (isValidRgSP) bloqueando cadastros incorretos.

5. **Testes Massivos (Vitest)**:
   - O projeto ganhou uma suÃ­te de testes muito mais robusta, incluindo um arquivo centralizado de mocks: `tests/mocks/supabaseMock.ts`.
   - Cobertura de testes adicionada para: `useAuth`, `useDemandProducts`, `useDemandWorkflow`, `useExpenseNatures`, `useProductBids`, `useSuppliers`, `useThemeManager`, alÃ©m dos novos middlewares e pÃ¡ginas administrativas.

6. **Limpeza ContÃ­nua**:
   - Foram apagados os restos de arquivos temporÃ¡rios (`temp_detail.txt`, `temp_full.txt`).
   - Todos os testes recÃ©m adicionados foram validados.

### PrÃ³ximos Passos Imediatos:

1. **Garantir a Estabilidade do Novo Fluxo**:
   - Validar se o dashboard IIRGD recÃ©m-criado possui todas as mÃ©tricas ou botÃµes de aÃ§Ã£o que o perfil necessita.
   - Analisar o fluxo de lances (`product_bids`) dentro da etapa de disputa da demanda.

2. **Refatorar Sub-telas e Funcionalidades**:
   - O fluxo de Disputa/CotaÃ§Ã£o precisarÃ¡ receber a "ediÃ§Ã£o inline" conforme a demanda avanÃ§a nas etapas, similar ao que foi feito no Planejamento.
   - Utilizar sempre os componentes desacoplados (`UiModal`, `UiChip`, etc.) em vez das tags cruas do Vuetify.

3. **Novas Funcionalidades**:
   - Seguir com as pendÃªncias de negÃ³cio listadas pelo usuÃ¡rio ou aprimoramentos no fluxo de orÃ§amentos, sempre respeitando as regras estritas descritas no arquivo `GEMINI.md`.

---

_Nota para a IA: ApÃ³s ler este arquivo, confirme que o contexto foi recuperado com sucesso e pergunte ao usuÃ¡rio qual Ã© a prioridade atual para dar prosseguimento._
