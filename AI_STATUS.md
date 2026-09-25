# Contexto do Projeto para o Agente de IA (AI_STATUS)

Este arquivo serve para transferir o contexto de desenvolvimento entre sessões ou máquinas diferentes. Ao iniciar uma nova sessão, o agente deve ler este arquivo para entender o estado atual da arquitetura e os próximos passos.

## Estado da Arquitetura (Antigravity Nuxt 4)

O projeto está passando por uma fase pesada de **Desacoplamento e Clean Architecture**. Estamos removendo lógica de banco de dados (Supabase) de dentro dos componentes Vue (UI) e movendo para **Composables** orientados a domínio. Também estamos substituindo o uso cru de componentes do Vuetify por **Componentes Ui*** encapsulados (`UiModal`, `UiCombobox`, `UiAlert`, `UiChip`, etc.).

### O que acabou de ser concluído (Sessão Atual):

1. **Bugfix de Autenticação e Redirecionamento**:
   - Corrigido o loop/flash de redirecionamento para login no ambiente local ajustando `cookieOptions: { secure: false }` no ambiente de desenvolvimento no `nuxt.config.ts`.
   
2. **Refatoração das Regras de Negócio de Demandas (Planejamento)**:
   - Adicionadas novas colunas via migrations: `internal_process_number` (automático por ano), `process_number`, `id_pca` e `contract_number`.
   - **Regra de Negócio implementada**: A inserção de itens (produtos) em uma demanda agora é bloqueada enquanto ela estiver na fase de planejamento (`status === 'planning'`).
   - **Regra de Avanço implementada**: Não é possível avançar a demanda para "Cotação" caso os campos obrigatórios do planejamento (Processo, ID PCA e Nº Contratação) não estejam preenchidos.
   
3. **Redesign da Tela de Detalhes da Demanda (`[id]/index.vue`)**:
   - Os dados foram reestruturados visualmente em blocos elegantes: "Dados do Planejamento" e "Dados da Disputa e Contratação".
   - Implementada a **Edição Inline** dos dados do planejamento na própria tela de detalhes da demanda por meio de um `UiModal`.
   
4. **Desacoplamento Visual e Limpeza de Código**:
   - Criados os componentes base `<UiChip>`, `<UiTooltip>` e `<UiOtpInput>`.
   - Feita uma varredura em todo o projeto, substituindo o uso direto de `<v-alert>`, `<v-dialog>`, `<v-chip>`, `<v-tooltip>` e `<v-otp-input>` para suas respectivas versões `Ui*`.
   - Removidas variáveis inúteis acusadas pelo ESLint (ex: em `useDemandProducts`, `useProducts`, e `profile.vue`).
   - Mock dos testes de `usePendingTasks` consertado para cobrir a consulta recém-adicionada à tabela `demands` (24/24 testes rodando limpos).
   - Deletados todos os scripts `.cjs` e arquivos temporários `.txt` gerados na raiz do repositório.

### Próximos Passos Imediatos:

1. **Continuar a varredura por Acoplamento**:
   - Verificar se ainda restam componentes Vuetify isolados que seriam úteis se tornarem genéricos (ex: tabelas complexas, steppers).
   - Manter a regra de não escrever `supabase.from()` dentro de arquivos `.vue`.
2. **Refatorar Sub-telas e Funcionalidades**:
   - O fluxo de Disputa/Cotação ("Dados da Disputa e Contratação") precisará em breve receber a mesma possibilidade de "edição inline" conforme a demanda avança nas etapas (Cotação, Disputa, etc).
3. **Novas Funcionalidades**:
   - Seguir com as pendências de negócio listadas pelo usuário ou aprimoramentos no fluxo de orçamentos, sempre respeitando as regras estritas descritas no arquivo `GEMINI.md`.

---

_Nota para a IA: Após ler este arquivo, confirme que o contexto foi recuperado com sucesso e pergunte ao usuário qual é a prioridade atual para dar prosseguimento._
