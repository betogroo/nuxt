# Contexto do Projeto para o Agente de IA (AI_STATUS)

Este arquivo serve para transferir o contexto de desenvolvimento entre sessões ou máquinas diferentes. Ao iniciar uma nova sessão, o agente deve ler este arquivo para entender o estado atual da arquitetura e os próximos passos.

## Estado da Arquitetura (Antigravity Nuxt 4 / Vuetify 4)

O projeto adota uma arquitetura de **Desacoplamento e Clean Architecture**:

- **UI Desacoplada (`Ui*`)**: Proibido o uso de tags diretas do Vuetify (`<v-*>`) ou ícones nativos fora de `app/components/`. Todos os componentes usam os wrappers semânticos (`UiRow`, `UiCard`, `UiButton`, `UiModal`, `UiCombobox`, `UiAlert`, `UiChip`, `UiSwitch`, etc.).
- **Supabase & Realtime Desacoplados**: Chamadas de banco e canais realtime residem exclusivamente em composables de domínio (`app/composables/use*.ts` e `useRealtimeChannel.ts`).
- **Permissões Centralizadas**: Todas as checagens de autorização utilizam `usePermissions` (`app/composables/usePermissions.ts`).
- **Seleção de Linhas**: Tabelas com seleção múltipla usam `useRowSelection` (`app/composables/useRowSelection.ts`).
- **Modais e CRUD**: Gestão de modais padronizada via `useAdminCrud`, `useFormModal` e `useModal`.
- **Validação de Formulários**: Zod + VeeValidate com inferência estrita de Schema em todas as operações CRUD.
- **Relatórios**: Utilitários compartilhados em `app/utils/` (`reportHtml.ts`, `reportCsv.ts`, `reportPdf.ts`, `reportFilename.ts`, `download.ts`) sem acoplamento cruzado entre domínios.
- **Banco de Dados & Backup**: Padrões estritos de nomenclatura em inglês. Sincronização obrigatória com as rotinas `generate_system_backup` e `restore_system_backup` a cada alteração de schema.

---

### O que acabou de ser concluído recentemente:

1. **Módulo de Demandas (Refatorações e Novas Funcionalidades)**:
   - **Navegação Determinística e UX de Itens**: Botão de voltar determinístico para a lista de demandas (`fix/demand-back-button-navigation`), redesenho da página de detalhe do item (`demands/[id]/items/[itemId].vue`) com melhor aproveitamento de espaço e navegação sequencial ("Anterior" e "Próximo").
   - **Tabela de Saldo por Classe de Material**: Exibição da tabela de saldo por classe de produto durante a fase de cotação.
   - **Intervalo de Lances**: Obrigatoriedade de intervalo de lances antes do edital de pregão e suporte a valores decimais inferiores a 0,1.
   - **Dashboard Operacional**: Redesenho da página inicial de demandas (`demands/index.vue`) transformando-a em dashboard operacional interativo.
   - **Demandas Históricas e Legadas**: Liberação para registro de demandas históricas sem bloqueio de restrições de datas futuras.
   - **Relatório Anual de Gastos**: Geração de relatório anual de gastos por classe de produto e configuração de tetos anuais (`demands/class-spending.vue`).

2. **Catálogo de Produtos e Materiais**:
   - **Duplicação de Produtos**: Funcionalidade completa para duplicar produtos incluindo suas unidades de apresentação e características associadas.
   - **Características de Produto**: Suporte completo a características adicionais de produtos no schema, composables e sincronização no backup/restore.

3. **Módulo IIRGD**:
   - **Liberação de Lote de RGs (Bulk Release)**: Geração de blocos de 8 RGs contínuos (72 dígitos para terminal legado) e confirmação visual em lote via modal com transição direta para status `released`.
   - **Relatório de Demandas com Erro**: Relatório amigável de erros de demandas do IIRGD com suporte a impressão e exportação em CSV.

4. **Módulo de Eleições**:
   - Urna virtual com máquina de estados desacoplada (`useVirtualBallot.ts`), sons da urna via sintetizador/Web Audio (`useUrnaSounds.ts`), cartões de eleitor e gerenciamento completo de cabines/seções.

5. **Backup & Restore**:
   - Alinhamento da assinatura da função `restore_system_backup` e suporte integral à restauração de características de produto, eleições e demandas históricas.
   - Última migration aplicada: `20261029181000_fix_restore_system_backup_product_characteristics.sql`.

---

## Setup do Ambiente em Novo Computador

Para configurar e rodar o projeto nesta ou em outra máquina:

1. **Instalar dependências**:
   ```bash
   npm install
   ```
2. **Configurar variáveis de ambiente**:
   Copiar `.env.example` para `.env` e ajustar as chaves do Supabase.
3. **Iniciar Supabase local** (requer Docker rodando):
   ```bash
   npx supabase start
   npm run db-reset # aplica migrations, seeds e gera os types/schemas
   ```
4. **Executar em desenvolvimento**:
   ```bash
   npm run dev
   ```

---

## Suíte de Testes Automatizados

- O projeto possui **141 arquivos de teste (`tests/**/*.spec.ts`)** e mais de **920 testes unitários/integração** configurados com Vitest e Happy-DOM.
- Para rodar a suíte completa:
  ```bash
  npm run test
  # ou individualmente:
  npx vitest run tests/composables/useDemands.spec.ts
  ```
- _Atenção_: Manter os mocks em `tests/mocks/` atualizados sempre que alterar schemas de tabelas ou métodos de composables.

---

## Próximos Passos Imediatos:

1. **Validar e Estabilizar Testes Pontuais**:
   - 5 arquivos de testes apresentaram falhas residuais devido a redesigns recentes de telas e atualizações de parâmetros (`tests/pages/elections/[id].spec.ts`, `tests/pages/demands/demand-items.spec.ts`, `tests/constants/admin-modules.spec.ts`, `tests/composables/useBallotBoxes.spec.ts`, `tests/composables/useDemandWorkflow.test.ts`).
2. **Refinar a Usabilidade das Telas Restantes**:
   - Garantir que todos os componentes continuem estritamente aderentes às regras de desacoplamento do `GEMINI.md`.
3. **Nova Prioridade de Desenvolvimento**:
   - _A definir com o usuário conforme as demandas de negócio atuais._

---

_Nota para a IA: Após ler este arquivo, confirme que o contexto foi recuperado com sucesso e pergunte ao usuário qual é a prioridade atual para dar prosseguimento._
