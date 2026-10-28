# Git Commits

Always write git commit messages in English. Use the conventional commits format (e.g., `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`).

# Logging

Whenever a new feature is implemented, use the `logAction` function to record the event if it makes sense to store logs for it. This includes CRUD operations (Create, Read, Update, Delete) and any other significant actions performed by users.

# Database Naming

All database table names, column names, functions, triggers, and any other database artifacts MUST be written in English. Use English for enum types and values as well (e.g., use `'consumption'` instead of `'consumo'`).
Furthermore, all Route names, URL parameters and their programmatic mappings (e.g. `/status/in-progress` instead of `/status/em-andamento`) MUST ALWAYS be in English.

# Database & Backup Synchronization (CRITICAL / MANDATORY)

**STOP AND READ THIS**: Whenever any database schema modification is made (creating, altering, or dropping tables, columns, constraints, foreign keys, enums, or triggers):

1. **Backup Generation (`generate_system_backup`)**: Verify and ensure that new tables and modified columns are properly included in the exported backup payload and summary count.
2. **Backup Restoration (`restore_system_backup`)**: You MUST ALWAYS update the `restore_system_backup` procedure to align with the new reality:
   - Ensure table dependency levels and restoration order are respected.
   - Column lists in `INSERT` and `ON CONFLICT` clauses MUST exactly match existing database columns (no non-existent columns, mismatched types, or invalid casts).
   - Foreign keys and deletion checks (`DELETE FROM ... WHERE ...`) must avoid blocking restores or causing cascade/restrict violations.
3. **Tests & Validation**: Corresponding backup tests (e.g. `tests/composables/useBackup.spec.ts`) and database migration tests MUST be updated and executed to prove backup generation and restoration work seamlessly with the new schema.

# Planning (CRITICAL / MANDATORY)

**STOP AND READ THIS**: YOU MUST ALWAYS show what will be done before applying changes. CREATE an implementation plan and WAIT FOR THE USER'S APPROVAL BEFORE executing modifications, creating new features, or writing code. Skipping this step is strictly forbidden.

# TypeScript Types

Always strictly type your variables and functions. Do NOT use the `any` type under any circumstances. If the exact type is complex or unknown, use `unknown` or define a precise interface/type.

# Pending Items Feature & Demand Item Dependencies

When working on modals or pages where users can select Product Categories, Expense Natures, Product Classes, Document Types, or Measurement Units (e.g. Demands, Products, or IIRGD), ALWAYS preserve and implement the feature that allows users to type in a NEW item that doesn't exist yet. The new item must be inserted into the database with `is_pending = true` and `is_active = false`, so that administrators can review them later. Do NOT force users to select only existing items via strict dropdowns.

- **Centralized Pending Catalog Helpers (`app/utils/pendingCatalog.ts`)**:
  - When registering a user-suggested catalog entry (`expense_natures`, `product_classes`, `iirgd_document_types`, etc.), ALWAYS use `PENDING_ITEM_FLAGS` (`{ is_pending: true, is_active: false }`) and `registerPendingItem(insertFn, afterInsertHook)`.
  - When approving a pending catalog entry, ALWAYS use `APPROVED_ITEM_FLAGS` (`{ is_pending: false, is_active: true }`) and `buildApprovePayload(newName)` so blank names are safely ignored and non-empty names are trimmed.
- **Demand Item Dependency Resolvers (`app/utils/demandItemDependencies.ts`)**:
  - When resolving or creating products, expense natures, product classes, measurement units, or unit aliases inside demand item flows (`useDemandProducts`), ALWAYS delegate to the modular functions in `app/utils/demandItemDependencies.ts` (`resolveDemandExpenseNature`, `resolveDemandProductClass`, `createProductForDemand`, `resolveDemandUnitAlias`, `ensureUnitAliasLink`, `ensureProductDefaultAndFinalUnits`, `upsertDemandProductItem`, and `mapProductDuplicateError`). Do NOT inline multi-table resolution logic inside `useDemandProducts`.

# File Encoding

Always use and enforce UTF-8 encoding when creating or modifying files. This is particularly critical in Windows environments where tools like PowerShell might default to Windows-1252, ANSI, or UTF-16, leading to broken accents and special characters (mojibake like `ÃƒÂ£` instead of `Ã£`). When using terminal commands to pipe or write output to files (e.g., `Out-File`, `>`), ALWAYS explicitly specify `-Encoding utf8`.

# Tests (CRITICAL / MANDATORY)

**STOP AND READ THIS**: For every feature created, altered, or deleted, the corresponding unit and/or integration tests MUST be updated or created to reflect the changes. Code modifications are NOT considered complete until tests are written and passing. You MUST execute the tests and prove they pass before finalizing your turn. Skipping this step is strictly forbidden.

# UI Layer & Architectural Decoupling (CRITICAL / MANDATORY)

**STOP AND READ THIS**: O projeto implementa um desacoplamento total do Vuetify, de bibliotecas de ícones e de acesso direto a infraestrutura na sua camada de apresentação (Páginas, Modais e Layouts).

## 1. UI Wrappers (`Ui*`)

- É **ESTRITAMENTE PROIBIDO** utilizar tags brutas do Vuetify (e.g. `<v-row>`, `<v-btn>`, `<v-card>`) ou strings/classes de ícones nativos (e.g. `mdi-home`, `<v-icon>`) fora da pasta `app/components/`.
- Você deve SEMPRE usar os componentes wrappers desacoplados com o prefixo genérico `Ui` (e.g. `<UiRow>`, `<UiButton>`, `<UiCard>`, `<UiIcon>`).
- Caso sinta a necessidade de um componente do Vuetify que ainda não possua wrapper, seu dever é **criar o wrapper** na pasta `app/components/ui/` e utilizar o wrapper.

## 2. Supabase & Realtime Decoupling (`useRealtimeChannel`)

- Páginas (`app/pages/**`) e componentes/modais (`app/components/**`) **NÃO DEVEM** importar nem chamar `useSupabaseClient()` diretamente para executar queries SQL inline ou criar canais `.channel(...)` manualmente.
- **Queries de banco de dados** devem residir exclusivamente nos composables de domínio (`app/composables/use*.ts`).
- **Assinaturas Realtime (`postgres_changes`)** devem SEMPRE utilizar o composable `useRealtimeChannel` (`app/composables/useRealtimeChannel.ts`) através de `subscribeToPostgresChanges(channelName, listeners)` e `removeRealtimeChannel(channel)`.

## 3. Domain Permissions (`usePermissions`)

- É proibido espalhar comparações diretas `profile.value?.role === ROLES.*` em templates ou scripts de páginas e componentes.
- Utilize SEMPRE o composable centralizado `usePermissions` (`app/composables/usePermissions.ts`), que expõe os computeds e helpers de domínio (`isAdmin`, `isIirgdUser`, `canManageIirgd`, `canEditIirgdStatus`, `canEditDemand`, `canDeleteDemand`, `canManageElections`, `canDeleteElections`).
- Ao criar uma nova regra de permissão por perfil ou propriedade (`user_id`), adicione-a primeiro em `usePermissions.ts`.

## 4. Table Row Selection (`useRowSelection`)

- Qualquer tabela paginada que suporte seleção múltipla de linhas ou ações em lote deve utilizar o composable `useRowSelection` (`app/composables/useRowSelection.ts`) em vez de reimplementar `selectedIds`, `isAllPageSelected`, `isSomePageSelected`, `toggleSelectRow` ou `toggleSelectAllPage`.
- Quando for necessário preservar os objetos completos dos itens selecionados ao navegar entre páginas (ex.: emissão de cartões de eleitores), passe a opção `{ keepItems: true }` e utilize `selectedItemsMap` / `toggleSelectItem`.

## 5. Modal State Management (`useAdminCrud` / `useFormModal` / `useModal`)

- Não declare manualmente conjuntos repetitivos de refs (`isModalOpen`, `isEditing`, `isSaving`, `saveError`) com blocos `try/catch/finally` nas páginas:
  - Para páginas administrativas de CRUD padrão de catálogos, utilize `useAdminCrud` (`app/composables/useAdminCrud.ts`).
  - Para modais de formulário (Add/Edit) ou modais baseados em item-alvo (Aprovar Pendência, Resolver, Unificar/Mesclar), utilize `useFormModal<TTarget>()` (`app/composables/useFormModal.ts`) com `openAdd`, `openEdit`, `openForTarget`, `close` e `executeSave`.

## 6. Static Constants & IIRGD Status Mapping (`app/constants/`)

- Configurações estáticas de páginas, opções de filtros/selects, mapeamento de badges de perfil e definições de cards/módulos administrativos devem ficar em `app/constants/`:
  - `app/constants/iirgd-status.ts`: Fonte única de verdade para status do módulo IIRGD. Sempre utilize `IIRGD_STATUS_BY_GROUP`, `IIRGD_ACTIVE_STATUSES`, `IIRGD_SLA_IGNORED_STATUSES`, `IIRGD_STATUS_GROUP_TITLES` e `getIirgdStatusSelectOptions()` — nunca crie listas de status hardcoded em composables ou páginas.
  - `app/constants/roles.ts`: Constantes `ROLES`, `ROLE_OPTIONS` e `USER_ROLE_CONFIG`.
  - `app/constants/elections.ts`: Rótulos, cores e `ELECTION_VOTER_STATUS_OPTIONS`.
  - `app/constants/admin-modules.ts`: Builders `buildAdminMetricCards` e `buildAdminModules` do painel administrativo.

## 7. Complex Interactive Widgets & Side Effects

- Componentes interativos complexos que envolvam máquinas de estado, atalhos de teclado físico, timers de ciclo ou APIs de navegador (como Web Audio API) devem extrair essa lógica para composables dedicados em `app/composables/` (a exemplo de `useVirtualBallot.ts` e `useUrnaSounds.ts` usados por `VirtualBallotBox.vue`), mantendo o componente `.vue` focado na camada visual e permitindo testes unitários diretos do composable.

# Reports & Document Export Infrastructure

Composables de geração de relatórios e documentos (`useDemandReports`, `useElectionReports`, `useElectionVoterCards`, `useIirgdReports`) **NÃO DEVEM** importar funções uns dos outros (zero acoplamento cruzado entre domínios) nem duplicar helpers de HTML, CSV, PDF ou sanitização de nomes de arquivos.

Utilize SEMPRE os utilitários compartilhados na raiz de `app/utils/` (mantidos em estrutura plana para suporte ao auto-import do Nuxt):

- **`app/utils/reportHtml.ts`**: `escapeHtml(str)` para sanitização de interpolações HTML e `printHtmlViaIframe(html)` para impressão nativa via iframe oculto.
- **`app/utils/reportCsv.ts`**: `escapeCsvField(value)` para formatação de campos CSV compatíveis com RFC 4180.
- **`app/utils/reportFilename.ts`**: `toSafeFilename(name, fallback)` para geração de slugs seguros de nomes de arquivo (`[a-z0-9_-]`).
- **`app/utils/reportPdf.ts`**: `createA4Doc()`, `appendPageFooters(doc, leftText, centerText)`, `PDF_PAGE_WIDTH_MM` e `PDF_MARGIN_X_MM` para documentos `jsPDF` padronizados em A4.
- **`app/utils/download.ts`**: `downloadBlob(blob, filename)` para disparo de downloads no navegador.

# Elections Module (Eleições)

The system includes a dedicated Elections module accessible via the `/elections` route.

## Access Control & Roles

Access to the `/elections` route and its navigation links in the drawer and home page is strictly restricted to the following roles:

- `admin`: Full system administrator with unrestricted access.
- `user-election`: Standard user/voter for the election system.
- `manager-election`: Election manager with operational oversight on elections and processes.
- `admin-election`: Administrator dedicated to managing the election module.

Users with other roles (`user`, `uge`, `iirgd_user`, `iirgd_manager`) MUST NOT see the election navigation link and MUST be blocked by the `elections` middleware (redirected to `/`).

## Standard Seed Accounts

The development seed (`supabase/seed.sql`) provides dedicated test accounts with password `123456`:

- `user@election.com` (role: `user-election`)
- `manager@election.com` (role: `manager-election`)
- `admin@election.com` (role: `admin-election`)
- `admin@admin.com` (role: `admin`)
