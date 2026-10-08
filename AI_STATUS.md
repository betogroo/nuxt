# Contexto do Projeto para o Agente de IA (AI_STATUS)

Este arquivo serve para transferir o contexto de desenvolvimento entre sessões ou máquinas diferentes. Ao iniciar uma nova sessão, o agente deve ler este arquivo para entender o estado atual da arquitetura e os próximos passos.

## Estado da Arquitetura (Antigravity Nuxt 4 / Vuetify 4)

O projeto está passando por uma fase pesada de **Desacoplamento e Clean Architecture**. Estamos removendo lógica de banco de dados (Supabase) de dentro dos componentes Vue (UI) e movendo para **Composables** orientados a domínio. Também estamos substituindo o uso cru de componentes do Vuetify por **Componentes Ui*** encapsulados (`UiModal`, `UiCombobox`, `UiAlert`, `UiChip`, etc.).

### O que acabou de ser concluído:

1. **Strict UI Decoupling (Vuetify Props)**:
   - Uma grande varredura foi feita por todo o projeto utilizando scripts regex via Node. As props nativas do Vuetify (`density="compact"`, `variant="outlined"`, etc.) foram substituídas pelas props semânticas do nosso Design System (`size="sm"`, `variant="outline"`, `variant="soft"`, etc.) nos componentes nas pastas de páginas e layouts.
   - Wrappers como `UiSwitch`, `Avatar` e `Pagination` que injetavam `$attrs` de forma perigosa diretamente nas tags HTML nativas do Vuetify, foram consertados. Agora eles definem explicitamente as props do DS e mapeiam com sucesso para o padrão do framework, evitando bugs de renderização invisíveis.

2. **IIRGD: Liberação de Lote de RGs (Bulk Release)**:
   - Na tela de demandas do IIRGD, a aba 'Consultado' agora possui um gerador inteligente de blocos de 8 RGs (limite legado de emuladores Mainframe) em formato de lista contínua de 72 dígitos (para preenchimento em lote no sistema externo via auto-tab cascade).
   - Implementada a funcionalidade visual que, junto do botão de copiar, oferece um botão 'Check' que abre um modal de confirmação (exibindo RG, CPF e Nome). Após o aceite, todas as 8 demandas daquele grupo recebem status `released` em cascata com um refresh silencioso da UI.
   - Solucionado um bug antigo no `UiModal` de nova demanda que mantinha o form congelado por não esperar a chamada correta do `refresh()` assíncrono do Nuxt.

3. **Validação de Formulários Zod + VeeValidate (Concluído Totalmente)**:
   - Todos os modais de operações CRUD (Produtos, Usuários, Demandas e Itens) rodam com inferência estrita de Schema.

### Próximos Passos Imediatos:

1. **Refinar a Usabilidade das Sub-Telas**:
   - Garantir que todos os campos residuais do Vuetify no ecossistema (se houver algum esquecido) sejam encapsulados.
   - Prestar atenção especial à injeção de fallthrough attributes em componentes `Ui*`.

2. **Testes Unitários**:
   - O projeto atingiu a marca de 145 testes vitest automatizados. Todo novo pull-request ou inserção deve estar devidamente coberto e os mocks no `supabaseMock.ts` atualizados.

---

_Nota para a IA: Após ler este arquivo, confirme que o contexto foi recuperado com sucesso e pergunte ao usuário qual é a prioridade atual para dar prosseguimento._
