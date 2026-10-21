<script setup lang="ts">
  import { ref, computed } from 'vue'
  import { useElections } from '~/composables/useElections'
  import { usePermissions } from '~/composables/usePermissions'
  import { useToast } from '~/composables/useToast'
  import { ELECTION_STATUS_LABELS, ELECTION_STATUS_COLORS } from '~/constants/elections'
  import type { ElectionStatus } from '~/types/election'
  import type { CandidateRow } from '~/types/candidate'
  import ElectionFormModal from '~/components/elections/ElectionFormModal.vue'
  import CandidateFormModal from '~/components/elections/CandidateFormModal.vue'
  import { useCandidates } from '~/composables/useCandidates'

  definePageMeta({
    middleware: ['elections'],
    layout: 'default',
    roles: ['admin', 'user-election', 'manager-election', 'admin-election'],
  })

  const route = useRoute()
  const router = useRouter()
  const toast = useToast()

  const electionId = computed(() => route.params.id as string)

  const { fetchElectionById, updateElection, deleteElection } = useElections()
  const { fetchCandidates, deleteCandidate: deleteCandidateApi } = useCandidates()
  const { canManageElections, canDeleteElections } = usePermissions()

  // Tab State
  const activeTab = ref<'overview' | 'candidates' | 'voting' | 'results'>('overview')

  // Modals state
  const modalRef = ref<InstanceType<typeof ElectionFormModal> | null>(null)
  const isDeleteModalOpen = ref(false)
  const isDeleting = ref(false)

  const isStatusModalOpen = ref(false)
  const isUpdatingStatus = ref(false)
  const targetStatus = ref<ElectionStatus | null>(null)

  // Candidate Modals & Actions state
  const candidateModalRef = ref<InstanceType<typeof CandidateFormModal> | null>(null)
  const candidateToDelete = ref<CandidateRow | null>(null)
  const isCandidateDeleteModalOpen = ref(false)
  const isDeletingCandidate = ref(false)

  // Fetch election details
  const {
    data: election,
    pending,
    error,
    refresh,
  } = useAsyncData(`election-detail-${electionId.value}`, async () => {
    return await fetchElectionById(electionId.value)
  })

  // Fetch candidates for this election
  const {
    data: candidates,
    pending: candidatesPending,
    refresh: refreshCandidates,
  } = useAsyncData(`election-candidates-${electionId.value}`, async () => {
    return await fetchCandidates(electionId.value)
  })

  const openCreateCandidateModal = () => {
    candidateModalRef.value?.open()
  }

  const openEditCandidateModal = (cand: CandidateRow) => {
    candidateModalRef.value?.open(cand)
  }

  const openDeleteCandidateModal = (cand: CandidateRow) => {
    candidateToDelete.value = cand
    isCandidateDeleteModalOpen.value = true
  }

  const handleConfirmDeleteCandidate = async () => {
    if (!candidateToDelete.value) return
    isDeletingCandidate.value = true
    try {
      await deleteCandidateApi(candidateToDelete.value.id)
      toast.success('Candidato removido com sucesso.')
      isCandidateDeleteModalOpen.value = false
      candidateToDelete.value = null
      await refreshCandidates()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao remover candidato.'
      toast.error(msg)
    } finally {
      isDeletingCandidate.value = false
    }
  }

  useHead({
    title: computed(() =>
      election.value?.name ? `${election.value.name} - Detalhes da Eleição` : 'Detalhes da Eleição',
    ),
  })

  // Date formatting helpers
  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR')
  }

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString('pt-BR')
  }

  const relativeDateInfo = computed(() => {
    if (!election.value?.election_date) return null
    const target = new Date(election.value.election_date)
    if (isNaN(target.getTime())) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    target.setHours(0, 0, 0, 0)

    const diffMs = target.getTime() - today.getTime()
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return { label: 'Hoje', color: 'success' }
    if (diffDays > 0)
      return {
        label: `Faltam ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`,
        color: 'info',
      }
    return {
      label: `Realizada há ${Math.abs(diffDays)} ${Math.abs(diffDays) === 1 ? 'dia' : 'dias'}`,
      color: 'default',
    }
  })

  // Status transition logic
  const nextStatusAction = computed(() => {
    if (!election.value) return null
    switch (election.value.status) {
      case 'awaiting_release':
        return {
          status: 'released' as ElectionStatus,
          label: 'Liberar Eleição',
          description: 'A urna será liberada para receber os votos dos eleitores.',
          color: 'success',
          icon: 'vote',
        }
      case 'released':
        return {
          status: 'tallying' as ElectionStatus,
          label: 'Iniciar Apuração',
          description: 'A votação será encerrada e a contagem de votos será iniciada.',
          color: 'info',
          icon: 'trending',
        }
      case 'tallying':
        return {
          status: 'finished' as ElectionStatus,
          label: 'Finalizar Eleição',
          description: 'O pleito será concluído e o resultado final será consolidado.',
          color: 'secondary',
          icon: 'checkCircle',
        }
      default:
        return null
    }
  })

  const openStatusModal = (status: ElectionStatus) => {
    targetStatus.value = status
    isStatusModalOpen.value = true
  }

  const handleConfirmStatusChange = async () => {
    if (!election.value || !targetStatus.value) return
    isUpdatingStatus.value = true
    try {
      await updateElection(election.value.id, { status: targetStatus.value })
      toast.success(
        `Situação alterada para "${ELECTION_STATUS_LABELS[targetStatus.value]}" com sucesso!`,
      )
      isStatusModalOpen.value = false
      targetStatus.value = null
      await refresh()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar situação.'
      toast.error(msg)
    } finally {
      isUpdatingStatus.value = false
    }
  }

  const openEditModal = () => {
    if (election.value) {
      modalRef.value?.open(election.value, (candidates.value?.length || 0) > 0)
    }
  }

  const onElectionSaved = async () => {
    await refresh()
  }

  const openDeleteModal = () => {
    isDeleteModalOpen.value = true
  }

  const handleConfirmDelete = async () => {
    if (!election.value) return
    isDeleting.value = true
    try {
      await deleteElection(election.value.id)
      toast.success('Eleição excluída com sucesso.')
      isDeleteModalOpen.value = false
      router.push('/elections')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao excluir eleição.'
      toast.error(msg)
    } finally {
      isDeleting.value = false
    }
  }

  const goBack = () => {
    router.push('/elections')
  }
</script>

<template>
  <UiContainer class="py-6" max-width="1400px">
    <!-- Estado de Carregamento -->
    <div v-if="pending" class="text-center py-12">
      <UiProgressCircular color="primary" indeterminate size="48" />
      <div class="text-caption text-medium-emphasis mt-3">Carregando dados da eleição...</div>
    </div>

    <!-- Estado de Erro ou Não Encontrada -->
    <UiCard v-else-if="!election || error" class="text-center py-8">
      <UiIcon class="text-warning mb-2" name="alert" size="48" />
      <h2 class="text-h6 font-weight-bold">Eleição não encontrada</h2>
      <p class="text-body-2 text-medium-emphasis mt-1 mb-4">
        A eleição solicitada não existe ou foi removida do sistema.
      </p>
      <UiButton color="primary" prepend-icon="arrowLeft" @click="goBack">
        Voltar ao Dashboard
      </UiButton>
    </UiCard>

    <!-- Conteúdo Principal -->
    <div v-else>
      <!-- Barra Superior com Navegação e Ações -->
      <div class="d-flex flex-wrap align-center justify-space-between mb-6 ga-3">
        <div class="d-flex align-center ga-3">
          <UiButton
            color="default"
            icon="arrowLeft"
            size="sm"
            tooltip="Voltar ao Dashboard"
            variant="ghost"
            @click="goBack"
          />
          <div>
            <div class="d-flex align-center ga-2 flex-wrap">
              <h1 class="text-h5 font-weight-bold mb-0">
                {{ election.name }}
              </h1>
              <UiChip
                :color="ELECTION_STATUS_COLORS[election.status as ElectionStatus] || 'primary'"
                size="sm"
                variant="solid"
              >
                {{ ELECTION_STATUS_LABELS[election.status as ElectionStatus] || election.status }}
              </UiChip>
              <UiChip
                :color="election.is_uppercase ? 'indigo' : 'default'"
                size="sm"
                :variant="election.is_uppercase ? 'solid' : 'soft'"
              >
                {{ election.is_uppercase ? 'CAIXA ALTA: SIM' : 'CAIXA ALTA: NÃO' }}
              </UiChip>
            </div>
            <div class="d-flex align-center ga-2 text-caption text-medium-emphasis mt-1">
              <span>Data do Pleito: {{ formatDate(election.election_date) }}</span>
              <span>•</span>
              <span>Dígitos: {{ election.digits_count }}</span>
              <span v-if="election.creator_name">•</span>
              <span v-if="election.creator_name">Criado por: {{ election.creator_name }}</span>
            </div>
          </div>
        </div>

        <!-- Ações no Topo -->
        <div class="d-flex align-center ga-2 flex-wrap">
          <!-- Botão de Transição de Status Contextual -->
          <UiButton
            v-if="canManageElections() && nextStatusAction"
            :color="nextStatusAction.color"
            :prepend-icon="nextStatusAction.icon"
            variant="solid"
            @click="openStatusModal(nextStatusAction.status)"
          >
            {{ nextStatusAction.label }}
          </UiButton>

          <!-- Editar Eleição -->
          <UiButton
            v-if="canManageElections()"
            color="primary"
            prepend-icon="edit"
            variant="outline"
            @click="openEditModal"
          >
            Editar Eleição
          </UiButton>

          <!-- Excluir Eleição (Safe Delete) -->
          <UiButton
            v-if="canDeleteElections()"
            color="error"
            prepend-icon="delete"
            variant="ghost"
            @click="openDeleteModal"
          >
            Excluir
          </UiButton>
        </div>
      </div>

      <!-- Cards de Parâmetros / Métricas -->
      <UiRow class="g-4 mb-6">
        <!-- Data do Pleito -->
        <UiCol cols="12" md="3" sm="6">
          <UiCard>
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                  Data do Pleito
                </div>
                <div class="text-h6 font-weight-bold mt-1 text-high-emphasis">
                  {{ formatDate(election.election_date) }}
                </div>
                <div v-if="relativeDateInfo" class="mt-1">
                  <UiChip :color="relativeDateInfo.color" size="xs" variant="soft">
                    {{ relativeDateInfo.label }}
                  </UiChip>
                </div>
              </div>
              <UiAvatar color="primary" size="48" variant="soft">
                <UiIcon name="calendar" size="24" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>

        <!-- Dígitos de Votação -->
        <UiCol cols="12" md="3" sm="6">
          <UiCard>
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                  Dígitos por Voto
                </div>
                <div class="text-h6 font-weight-bold mt-1 text-primary">
                  {{ election.digits_count }}
                  {{ election.digits_count === 1 ? 'dígito' : 'dígitos' }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  Comprimento do nº do candidato
                </div>
              </div>
              <UiAvatar color="indigo" size="48" variant="soft">
                <UiIcon name="vote" size="24" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>

        <!-- Modo Caixa Alta -->
        <UiCol cols="12" md="3" sm="6">
          <UiCard>
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                  Acessibilidade / Caixa Alta
                </div>
                <div class="text-h6 font-weight-bold mt-1 text-high-emphasis">
                  {{ election.is_uppercase ? 'ATIVADA' : 'DESATIVADA' }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  {{ election.is_uppercase ? 'Nomes em maiúsculas na urna' : 'Caixa mista padrão' }}
                </div>
              </div>
              <UiAvatar
                :color="election.is_uppercase ? 'success' : 'default'"
                size="48"
                variant="soft"
              >
                <UiIcon name="edit" size="24" />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>

        <!-- Situação Atual -->
        <UiCol cols="12" md="3" sm="6">
          <UiCard>
            <div class="d-flex align-center justify-space-between pa-4">
              <div>
                <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
                  Situação Operacional
                </div>
                <div
                  class="text-h6 font-weight-bold mt-1"
                  :class="`text-${ELECTION_STATUS_COLORS[election.status as ElectionStatus] || 'primary'}`"
                >
                  {{ ELECTION_STATUS_LABELS[election.status as ElectionStatus] || election.status }}
                </div>
                <div class="text-caption text-medium-emphasis mt-1">
                  {{
                    election.status === 'released'
                      ? 'Urna liberada para votação'
                      : election.status === 'tallying'
                        ? 'Urna fechada, votos em apuração'
                        : election.status === 'finished'
                          ? 'Pleito concluído e homologado'
                          : 'Aguardando liberação da urna'
                  }}
                </div>
              </div>
              <UiAvatar
                :color="ELECTION_STATUS_COLORS[election.status as ElectionStatus] || 'primary'"
                size="48"
                variant="soft"
              >
                <UiIcon
                  :name="
                    election.status === 'finished'
                      ? 'checkCircle'
                      : election.status === 'tallying'
                        ? 'trending'
                        : 'vote'
                  "
                  size="24"
                />
              </UiAvatar>
            </div>
          </UiCard>
        </UiCol>
      </UiRow>

      <!-- Navegação por Abas -->
      <UiCard class="mb-6">
        <UiTabs v-model="activeTab" color="primary">
          <UiTab value="overview">Visão Geral & Diretrizes</UiTab>
          <UiTab value="candidates">Candidatos & Chapas</UiTab>
          <UiTab value="voting">Urna Eletrônica</UiTab>
          <UiTab value="results">Apuração & Resultados</UiTab>
        </UiTabs>

        <div class="pa-6">
          <!-- ABA 1: VISÃO GERAL -->
          <div v-if="activeTab === 'overview'">
            <UiRow class="g-4">
              <UiCol cols="12" md="8">
                <h3 class="text-subtitle-1 font-weight-bold mb-2">
                  Descrição e Instruções do Pleito
                </h3>
                <p
                  v-if="election.description"
                  class="text-body-1 text-high-emphasis whitespace-pre-wrap"
                >
                  {{ election.description }}
                </p>
                <UiAlert v-else type="info" variant="soft">
                  Nenhuma descrição ou instrução detalhada informada para esta eleição. Clique em
                  "Editar Eleição" para adicionar diretrizes aos votantes e mesários.
                </UiAlert>

                <div class="mt-6">
                  <h3 class="text-subtitle-1 font-weight-bold mb-3">
                    Diretrizes da Urna Eletrônica
                  </h3>
                  <UiRow class="g-3">
                    <UiCol cols="12" sm="6">
                      <div class="pa-3 border rounded-lg bg-surface-variant">
                        <div class="text-caption text-medium-emphasis font-weight-bold">
                          PADRÃO DE DÍGITOS
                        </div>
                        <div class="text-body-2 mt-1">
                          Os eleitores digitarão exatamente
                          <strong>{{ election.digits_count }}</strong> números para selecionar o
                          candidato desejado.
                        </div>
                      </div>
                    </UiCol>
                    <UiCol cols="12" sm="6">
                      <div class="pa-3 border rounded-lg bg-surface-variant">
                        <div class="text-caption text-medium-emphasis font-weight-bold">
                          LEGIBILIDADE VISUAL
                        </div>
                        <div class="text-body-2 mt-1">
                          {{
                            election.is_uppercase
                              ? 'A interface da urna exibirá textos em LETRAS MAIÚSCULAS para facilitar o reconhecimento por crianças em fase de alfabetização.'
                              : 'A interface da urna exibirá nomes em formatação textual regular (Caixa Alta e Baixa).'
                          }}
                        </div>
                      </div>
                    </UiCol>
                  </UiRow>
                </div>
              </UiCol>

              <UiCol cols="12" md="4">
                <div class="pa-4 border rounded-lg bg-surface-variant">
                  <h4 class="text-subtitle-2 font-weight-bold mb-3">Metadados de Auditoria</h4>
                  <div class="d-flex flex-column ga-2 text-caption">
                    <div>
                      <span class="text-medium-emphasis">Identificador (UUID):</span>
                      <div class="font-mono text-truncate">{{ election.id }}</div>
                    </div>
                    <UiDivider class="my-1" />
                    <div>
                      <span class="text-medium-emphasis">Criado em:</span>
                      <div>{{ formatDateTime(election.created_at) }}</div>
                    </div>
                    <div v-if="election.updated_at">
                      <span class="text-medium-emphasis">Última atualização:</span>
                      <div>{{ formatDateTime(election.updated_at) }}</div>
                    </div>
                    <div v-if="election.creator_name">
                      <span class="text-medium-emphasis">Criado por:</span>
                      <div class="font-weight-medium">{{ election.creator_name }}</div>
                    </div>
                  </div>
                </div>
              </UiCol>
            </UiRow>
          </div>

          <!-- ABA 2: CANDIDATOS E CHAPAS -->
          <div v-else-if="activeTab === 'candidates'">
            <div class="d-flex align-center justify-space-between mb-4 flex-wrap ga-2">
              <div>
                <h3 class="text-subtitle-1 font-weight-bold">Cargos e Candidatos Registrados</h3>
                <p class="text-caption text-medium-emphasis mb-0">
                  {{ candidates?.length || 0 }}
                  {{
                    (candidates?.length || 0) === 1
                      ? 'candidato registrado'
                      : 'candidatos registrados'
                  }}
                  nesta eleição.
                </p>
              </div>
              <UiButton
                v-if="canManageElections() && election.status !== 'finished'"
                color="primary"
                prepend-icon="add"
                size="sm"
                variant="solid"
                @click="openCreateCandidateModal"
              >
                Adicionar Candidato
              </UiButton>
            </div>

            <!-- Loading de Candidatos -->
            <div v-if="candidatesPending" class="text-center py-8">
              <UiProgressCircular color="primary" indeterminate size="32" />
              <div class="text-caption text-medium-emphasis mt-2">Carregando candidatos...</div>
            </div>

            <!-- Empty State de Candidatos -->
            <UiCard v-else-if="!candidates?.length" class="text-center py-8" variant="outline">
              <UiIcon class="text-medium-emphasis mb-2" name="vote" size="40" />
              <div class="text-body-1 font-weight-medium">Nenhum candidato registrado ainda</div>
              <p class="text-caption text-medium-emphasis mt-1 mb-4">
                Os números de urna de cada candidato devem ser configurados com exatamente
                {{ election.digits_count }}
                {{ election.digits_count === 1 ? 'dígito' : 'dígitos' }}.
              </p>
              <UiButton
                v-if="canManageElections() && election.status !== 'finished'"
                color="primary"
                prepend-icon="add"
                size="sm"
                variant="solid"
                @click="openCreateCandidateModal"
              >
                Cadastrar Primeiro Candidato
              </UiButton>
            </UiCard>

            <!-- Grid de Candidatos -->
            <UiRow v-else class="g-4">
              <UiCol v-for="cand in candidates" :key="cand.id" cols="12" lg="3" md="4" sm="6">
                <UiCard class="h-100 d-flex flex-column overflow-hidden" hover variant="outline">
                  <div
                    class="position-relative bg-surface-variant text-center"
                    style="height: 180px"
                  >
                    <img
                      :alt="cand.name"
                      class="w-100 h-100 object-cover"
                      :src="
                        cand.photo_url ||
                        'https://picsum.photos/seed/' + cand.candidate_number + '/300/300'
                      "
                    />
                    <div class="position-absolute" style="top: 8px; right: 8px">
                      <UiChip
                        class="font-weight-bold font-mono"
                        color="primary"
                        size="sm"
                        variant="solid"
                      >
                        Nº {{ cand.candidate_number }}
                      </UiChip>
                    </div>
                  </div>

                  <div class="pa-4 flex-grow-1 d-flex flex-column justify-space-between">
                    <div>
                      <div
                        class="text-subtitle-1 font-weight-bold line-clamp-2"
                        :class="{ 'text-uppercase': election.is_uppercase }"
                      >
                        {{ election.is_uppercase ? cand.name.toUpperCase() : cand.name }}
                      </div>
                      <div class="text-caption text-medium-emphasis mt-1">
                        Número:
                        <span class="font-mono font-weight-bold text-primary">{{
                          cand.candidate_number
                        }}</span>
                      </div>
                    </div>

                    <div
                      v-if="canManageElections() && election.status !== 'finished'"
                      class="d-flex align-center justify-end ga-1 mt-4 pt-2 border-top"
                    >
                      <UiActionButton
                        action="edit"
                        tooltip="Editar candidato"
                        variant="ghost"
                        @click="openEditCandidateModal(cand)"
                      />
                      <UiActionButton
                        v-if="canDeleteElections()"
                        action="delete"
                        tooltip="Excluir candidato"
                        variant="ghost"
                        @click="openDeleteCandidateModal(cand)"
                      />
                    </div>
                  </div>
                </UiCard>
              </UiCol>
            </UiRow>
          </div>

          <!-- ABA 3: URNA ELETRÔNICA -->
          <div v-else-if="activeTab === 'voting'">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">
              Terminal de Votação (Urna Eletrônica)
            </h3>
            <p class="text-caption text-medium-emphasis mb-4">
              Acesso ao terminal interativo de votação para recepção de votos dos eleitores.
            </p>

            <UiAlert
              v-if="election.status === 'released'"
              class="mb-4"
              title="Urna Pronta para Votação"
              type="success"
              variant="soft"
            >
              A eleição está liberada e os eleitores já podem votar através da cabine de votação.
            </UiAlert>

            <UiAlert
              v-else-if="election.status === 'awaiting_release'"
              class="mb-4"
              title="Urna Bloqueada"
              type="warning"
              variant="soft"
            >
              Esta eleição ainda está "Aguardando Liberação". A urna eletrônica somente poderá
              receber votos após o gestor liberar o pleito.
            </UiAlert>

            <UiAlert v-else class="mb-4" title="Votação Encerrada" type="info" variant="soft">
              A votação desta eleição foi finalizada e a urna não aceita mais novos votos.
            </UiAlert>

            <div class="d-flex ga-3 mt-4">
              <UiButton
                :color="election.status === 'released' ? 'success' : 'default'"
                :disabled="election.status !== 'released'"
                prepend-icon="vote"
                size="lg"
                variant="solid"
              >
                Abrir Urna de Votação
              </UiButton>

              <UiButton
                v-if="canManageElections() && election.status === 'awaiting_release'"
                color="success"
                prepend-icon="checkCircle"
                size="lg"
                variant="outline"
                @click="openStatusModal('released')"
              >
                Liberar Urna Agora
              </UiButton>
            </div>
          </div>

          <!-- ABA 4: APURAÇÃO & RESULTADOS -->
          <div v-else-if="activeTab === 'results'">
            <h3 class="text-subtitle-1 font-weight-bold mb-2">
              Boletim de Urna e Totalização de Votos
            </h3>
            <p class="text-caption text-medium-emphasis mb-4">
              Contagem de votos nominais, votos em branco e nulos.
            </p>

            <UiAlert
              v-if="election.status === 'awaiting_release' || election.status === 'released'"
              title="Apuração Indisponível no Momento"
              type="info"
              variant="soft"
            >
              Os resultados da apuração serão computados e exibidos assim que a fase de votação for
              concluída e a apuração for iniciada.
            </UiAlert>

            <div v-else>
              <UiRow class="g-4 mb-4">
                <UiCol cols="12" sm="3">
                  <div class="pa-4 border rounded-lg text-center bg-surface-variant">
                    <div class="text-caption text-medium-emphasis font-weight-bold">
                      VOTOS VÁLIDOS
                    </div>
                    <div class="text-h4 font-weight-bold text-success mt-1">0</div>
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="pa-4 border rounded-lg text-center bg-surface-variant">
                    <div class="text-caption text-medium-emphasis font-weight-bold">
                      VOTOS EM BRANCO
                    </div>
                    <div class="text-h4 font-weight-bold text-primary mt-1">0</div>
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="pa-4 border rounded-lg text-center bg-surface-variant">
                    <div class="text-caption text-medium-emphasis font-weight-bold">
                      VOTOS NULOS
                    </div>
                    <div class="text-h4 font-weight-bold text-warning mt-1">0</div>
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="pa-4 border rounded-lg text-center bg-surface-variant">
                    <div class="text-caption text-medium-emphasis font-weight-bold">
                      TOTAL DE VOTANTES
                    </div>
                    <div class="text-h4 font-weight-bold text-high-emphasis mt-1">0</div>
                  </div>
                </UiCol>
              </UiRow>

              <UiAlert type="success" variant="soft">
                Boletim de urna pronto para emissão e homologação dos resultados.
              </UiAlert>
            </div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Modal de Edição da Eleição -->
    <ElectionFormModal ref="modalRef" @saved="onElectionSaved" />

    <!-- Modal de Confirmação de Transição de Situação -->
    <UiModal v-model="isStatusModalOpen" max-width="480px" title="Confirmar Alteração de Situação">
      <div v-if="targetStatus">
        <p class="text-body-1">
          Deseja alterar a situação da eleição para
          <strong>"{{ ELECTION_STATUS_LABELS[targetStatus] }}"</strong>?
        </p>
        <p class="text-caption text-medium-emphasis">
          {{
            targetStatus === 'released'
              ? 'Ao liberar a eleição, a urna eletrônica estará disponível para votação imediata.'
              : targetStatus === 'tallying'
                ? 'Ao iniciar a apuração, a votação será encerrada e a urna deixará de receber novos votos.'
                : 'Ao finalizar a eleição, o pleito será homologado e não aceitará novas alterações.'
          }}
        </p>
      </div>

      <template #actions>
        <UiButton
          color="default"
          :disabled="isUpdatingStatus"
          variant="outline"
          @click="isStatusModalOpen = false"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="primary"
          :loading="isUpdatingStatus"
          variant="solid"
          @click="handleConfirmStatusChange"
        >
          Confirmar Mudança
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal de Confirmação de Safe Delete -->
    <UiModal v-model="isDeleteModalOpen" max-width="480px" title="Confirmar Exclusão da Eleição">
      <p class="text-body-1">
        Tem certeza que deseja excluir a eleição
        <strong>{{ election?.name }}</strong
        >?
      </p>
      <p class="text-caption text-medium-emphasis">
        Esta ação realizará uma exclusão segura (safe delete). O registro será desativado e não
        aparecerá nas listagens operacionais.
      </p>

      <template #actions>
        <UiButton
          color="default"
          :disabled="isDeleting"
          variant="outline"
          @click="isDeleteModalOpen = false"
        >
          Cancelar
        </UiButton>
        <UiButton color="error" :loading="isDeleting" variant="solid" @click="handleConfirmDelete">
          Excluir Eleição
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal de Formulário de Candidato -->
    <CandidateFormModal
      v-if="election"
      ref="candidateModalRef"
      :digits-count="election.digits_count"
      :election-id="election.id"
      :is-uppercase="election.is_uppercase"
      @saved="refreshCandidates"
    />

    <!-- Modal de Confirmação de Exclusão de Candidato (Safe Delete) -->
    <UiModal
      v-model="isCandidateDeleteModalOpen"
      max-width="480px"
      title="Confirmar Exclusão do Candidato"
    >
      <p class="text-body-1">
        Tem certeza que deseja excluir o candidato
        <strong>{{ candidateToDelete?.name }}</strong> (Nº
        {{ candidateToDelete?.candidate_number }})?
      </p>
      <p class="text-caption text-medium-emphasis">
        Esta ação realizará uma exclusão segura (safe delete). O candidato será desativado e não
        participará da apuração e votação.
      </p>

      <template #actions>
        <UiButton
          color="default"
          :disabled="isDeletingCandidate"
          variant="outline"
          @click="isCandidateDeleteModalOpen = false"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="error"
          :loading="isDeletingCandidate"
          variant="solid"
          @click="handleConfirmDeleteCandidate"
        >
          Excluir Candidato
        </UiButton>
      </template>
    </UiModal>
  </UiContainer>
</template>

<style scoped>
  .object-cover {
    object-fit: cover;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
