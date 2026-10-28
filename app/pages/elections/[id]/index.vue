<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { useElections } from '~/composables/useElections'
  import { usePermissions } from '~/composables/usePermissions'
  import { useToast } from '~/composables/useToast'
  import {
    ELECTION_STATUS_LABELS,
    ELECTION_STATUS_COLORS,
    ELECTION_VOTING_MODE_LABELS,
    ELECTION_VOTING_MODE_COLORS,
  } from '~/constants/elections'
  import type { ElectionStatus, ElectionVotingMode } from '~/types/election'
  import type { CandidateRow } from '~/types/candidate'
  import type { BallotBoxRow } from '~/types/ballot-box'
  import type { ElectionCommitteeMemberRow } from '~/types/election-committee'
  import type { ElectionVoterRow } from '~/types/election-voter'
  import ElectionFormModal from '~/components/elections/ElectionFormModal.vue'
  import CandidateFormModal from '~/components/elections/CandidateFormModal.vue'
  import BallotBoxFormModal from '~/components/elections/BallotBoxFormModal.vue'
  import BallotBoxCard from '~/components/elections/BallotBoxCard.vue'
  import ElectionReportModal from '~/components/elections/ElectionReportModal.vue'
  import { useCandidates } from '~/composables/useCandidates'
  import { useBallotBoxes } from '~/composables/useBallotBoxes'
  import { useElectionCommittee } from '~/composables/useElectionCommittee'
  import { useElectionVotes } from '~/composables/useElectionVotes'
  import { useElectionVoters } from '~/composables/useElectionVoters'
  import { useRealtimeChannel } from '~/composables/useRealtimeChannel'
  import { formatPercentageBr } from '~/composables/useElectionReports'

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
  const {
    fetchCommitteeMembers,
    addCommitteeMember,
    updateCommitteeMember,
    deleteCommitteeMember,
  } = useElectionCommittee()
  const { fetchElectionVotes, computeElectionTally } = useElectionVotes()
  const { fetchVoters, fetchElectionAttendance, subscribeToElectionAttendance } =
    useElectionVoters()
  const { removeRealtimeChannel } = useRealtimeChannel()
  const { canManageElections, canDeleteElections } = usePermissions()

  // Tab State
  const activeTab = ref<'overview' | 'candidates' | 'committee' | 'voters' | 'voting' | 'results'>(
    'overview',
  )

  // Report Modal Ref
  const reportModalRef = ref<InstanceType<typeof ElectionReportModal> | null>(null)

  const openReportModal = (type: 'initial' | 'final') => {
    reportModalRef.value?.open(type)
  }

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

  // Fetch committee members for this election
  const {
    data: committeeMembers,
    pending: committeePending,
    refresh: refreshCommittee,
  } = useAsyncData(`election-committee-${electionId.value}`, async () => {
    return await fetchCommitteeMembers(electionId.value)
  })

  // Fetch votes for this election
  const { data: electionVotes, refresh: refreshVotes } = useAsyncData(
    `election-votes-${electionId.value}`,
    async () => {
      return await fetchElectionVotes(electionId.value)
    },
  )

  const electionTally = computed(() =>
    computeElectionTally(candidates.value || [], electionVotes.value || []),
  )

  // Voters & Attendance state
  const votersSearch = ref('')
  const votersFilter = ref<'all' | 'voted' | 'pending'>('all')

  const {
    data: electionVoters,
    pending: votersPending,
    refresh: refreshVoters,
  } = useAsyncData(`election-voters-${electionId.value}`, async () => {
    return await fetchVoters()
  })

  const {
    data: electionAttendance,
    pending: attendancePending,
    refresh: refreshAttendance,
  } = useAsyncData(`election-attendance-${electionId.value}`, async () => {
    return await fetchElectionAttendance(electionId.value)
  })

  interface VoterWithAttendance extends ElectionVoterRow {
    hasVoted: boolean
    votedAt: string | null
    ballotBoxId: string | null
  }

  interface VoterWithAttendanceAndVote extends VoterWithAttendance {
    isBlank?: boolean
    isNull?: boolean
    candidateName?: string | null
    candidateNumber?: string | null
  }

  const attendanceMap = computed(() => {
    const map = new Map<string, { votedAt: string; ballotBoxId: string | null }>()
    for (const att of electionAttendance.value || []) {
      if (att.voter_id) {
        map.set(att.voter_id, { votedAt: att.voted_at, ballotBoxId: att.ballot_box_id })
      }
      if (att.voter_registration_number) {
        map.set(att.voter_registration_number, {
          votedAt: att.voted_at,
          ballotBoxId: att.ballot_box_id,
        })
      }
    }
    return map
  })

  const candidateByIdMap = computed(() => {
    const map = new Map<string, CandidateRow>()
    for (const c of candidates.value || []) {
      map.set(c.id, c)
      if (c.candidate_number) {
        map.set(c.candidate_number, c)
      }
    }
    return map
  })

  const votesByVoterMap = computed(() => {
    const map = new Map<
      string,
      {
        isBlank: boolean
        isNull: boolean
        candidateId: string | null
        candidateNumber: string | null
      }
    >()
    for (const v of electionVotes.value || []) {
      const voteData = {
        isBlank: v.is_blank,
        isNull: v.is_null,
        candidateId: v.candidate_id,
        candidateNumber: v.candidate_number,
      }
      if (v.voter_id) {
        map.set(v.voter_id, voteData)
      }
      if (v.voter_registration_number) {
        map.set(v.voter_registration_number, voteData)
      }
    }
    return map
  })

  const votersWithAttendance = computed<VoterWithAttendanceAndVote[]>(() => {
    const list = electionVoters.value || []
    const attMap = attendanceMap.value
    const voteMap = votesByVoterMap.value
    const candMap = candidateByIdMap.value
    const isNominal = election.value?.is_anonymous === false

    return list.map((v) => {
      const att = attMap.get(v.id) || attMap.get(v.voter_registration_number)
      const voteInfo = isNominal
        ? voteMap.get(v.id) || voteMap.get(v.voter_registration_number)
        : null
      const candidate = voteInfo?.candidateId
        ? candMap.get(voteInfo.candidateId)
        : voteInfo?.candidateNumber
          ? candMap.get(voteInfo.candidateNumber)
          : null

      return {
        ...v,
        hasVoted: !!att,
        votedAt: att?.votedAt || null,
        ballotBoxId: att?.ballotBoxId || null,
        isBlank: voteInfo?.isBlank ?? false,
        isNull: voteInfo?.isNull ?? false,
        candidateName: candidate?.name || null,
        candidateNumber: candidate?.candidate_number || voteInfo?.candidateNumber || null,
      }
    })
  })

  const filteredVoters = computed<VoterWithAttendanceAndVote[]>(() => {
    let list = votersWithAttendance.value
    const term = votersSearch.value.trim().toLowerCase()
    if (term) {
      list = list.filter(
        (v) =>
          v.name.toLowerCase().includes(term) ||
          v.voter_registration_number.toLowerCase().includes(term),
      )
    }
    if (votersFilter.value === 'voted') {
      list = list.filter((v) => v.hasVoted)
    } else if (votersFilter.value === 'pending') {
      list = list.filter((v) => !v.hasVoted)
    }
    return list
  })

  const totalVotersCount = computed(() => electionVoters.value?.length || 0)
  const votedVotersCount = computed(() => electionAttendance.value?.length || 0)
  const pendingVotersCount = computed(() =>
    Math.max(0, totalVotersCount.value - votedVotersCount.value),
  )
  const turnoutPercentage = computed(() => {
    if (totalVotersCount.value === 0) return 0
    return (votedVotersCount.value / totalVotersCount.value) * 100
  })

  const votersTableHeaders = computed(() => {
    const headers: Array<{
      text: string
      value: string
      align?: 'left' | 'center' | 'right'
      width?: string | number
    }> = [
      { text: 'Nº do Título', value: 'voter_registration_number', width: 140 },
      { text: 'Nome do Eleitor', value: 'name' },
      { text: 'Comparecimento nesta Eleição', value: 'attendance', align: 'center', width: 220 },
    ]

    if (election.value?.is_anonymous === false) {
      headers.push({ text: 'Voto Registrado', value: 'vote', align: 'center', width: 220 })
    }

    headers.push({ text: 'Situação', value: 'is_active', align: 'center', width: 120 })
    return headers
  })

  // Committee Form & Actions state
  const committeeFormName = ref('')
  const committeeFormRole = ref('')
  const isSavingCommitteeMember = ref(false)

  // Edit committee member modal state
  const isEditCommitteeModalOpen = ref(false)
  const editCommitteeFormName = ref('')
  const editCommitteeFormRole = ref('')
  const editingCommitteeMember = ref<ElectionCommitteeMemberRow | null>(null)
  const isSavingEditCommittee = ref(false)

  // Delete committee member modal state
  const isDeleteCommitteeModalOpen = ref(false)
  const committeeMemberToDelete = ref<ElectionCommitteeMemberRow | null>(null)
  const isDeletingCommitteeMember = ref(false)

  const committeeTableHeaders = computed(() => {
    const base: Array<{
      text: string
      value: string
      align?: 'left' | 'center' | 'right'
      width?: string | number
    }> = [
      { text: '#', value: 'order', width: 70 },
      { text: 'Nome do Integrante', value: 'name' },
      { text: 'Cargo na Comissão', value: 'role_name' },
    ]
    if (canManageElections() && election.value?.status !== 'finished') {
      base.push({ text: 'Ações', value: 'actions', align: 'right', width: 130 })
    }
    return base
  })

  const rankingTableHeaders: Array<{
    text: string
    value: string
    align?: 'left' | 'center' | 'right'
    width?: string | number
  }> = [
    { text: 'Classificação', value: 'rank', align: 'center', width: 120 },
    { text: 'Foto', value: 'photo', align: 'center', width: 80 },
    { text: 'Número', value: 'candidate_number', width: 100 },
    { text: 'Candidato', value: 'name' },
    { text: 'Votos', value: 'votesCount', align: 'right', width: 120 },
    { text: 'Porcentagem', value: 'percentage', align: 'right', width: 190 },
  ]

  const openEditCommitteeModal = (member: ElectionCommitteeMemberRow) => {
    editingCommitteeMember.value = member
    editCommitteeFormName.value = member.name
    editCommitteeFormRole.value = member.role_name
    isEditCommitteeModalOpen.value = true
  }

  const closeEditCommitteeModal = () => {
    isEditCommitteeModalOpen.value = false
    editingCommitteeMember.value = null
    editCommitteeFormName.value = ''
    editCommitteeFormRole.value = ''
  }

  const handleSaveEditCommitteeMember = async () => {
    if (!editingCommitteeMember.value) return
    const cleanName = editCommitteeFormName.value.trim()
    const cleanRole = editCommitteeFormRole.value.trim()
    if (!cleanName || !cleanRole) {
      toast.warning('Informe o nome e o cargo do membro da comissão.')
      return
    }

    isSavingEditCommittee.value = true
    try {
      await updateCommitteeMember(editingCommitteeMember.value.id, {
        name: cleanName,
        role_name: cleanRole,
      })
      toast.success('Membro da comissão atualizado com sucesso.')
      closeEditCommitteeModal()
      await refreshCommittee()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao atualizar membro da comissão.'
      toast.error(msg)
    } finally {
      isSavingEditCommittee.value = false
    }
  }

  const handleSaveCommitteeMember = async () => {
    if (!election.value) return
    const cleanName = committeeFormName.value.trim()
    const cleanRole = committeeFormRole.value.trim()
    if (!cleanName || !cleanRole) {
      toast.warning('Informe o nome e o cargo do membro da comissão.')
      return
    }

    isSavingCommitteeMember.value = true
    try {
      await addCommitteeMember({
        election_id: election.value.id,
        name: cleanName,
        role_name: cleanRole,
        sort_order: (committeeMembers.value?.length || 0) + 1,
      })
      toast.success('Membro adicionado à comissão eleitoral.')
      committeeFormName.value = ''
      committeeFormRole.value = ''
      await refreshCommittee()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar membro da comissão.'
      toast.error(msg)
    } finally {
      isSavingCommitteeMember.value = false
    }
  }

  const openDeleteCommitteeModal = (member: ElectionCommitteeMemberRow) => {
    committeeMemberToDelete.value = member
    isDeleteCommitteeModalOpen.value = true
  }

  const closeDeleteCommitteeModal = () => {
    isDeleteCommitteeModalOpen.value = false
    committeeMemberToDelete.value = null
  }

  const handleConfirmDeleteCommitteeMember = async () => {
    if (!committeeMemberToDelete.value) return
    isDeletingCommitteeMember.value = true
    try {
      await deleteCommitteeMember(
        committeeMemberToDelete.value.id,
        committeeMemberToDelete.value.name,
      )
      toast.success(`Membro "${committeeMemberToDelete.value.name}" removido da comissão.`)
      closeDeleteCommitteeModal()
      await refreshCommittee()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover membro da comissão.'
      toast.error(msg)
    } finally {
      isDeletingCommitteeMember.value = false
    }
  }

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

  // Ballot Boxes State & Actions
  const {
    fetchBallotBoxes,
    toggleBallotBoxStatus: toggleBallotBoxStatusApi,
    releaseBallotBoxForVoter: releaseBallotBoxForVoterApi,
    deleteBallotBox: deleteBallotBoxApi,
    subscribeToBallotBoxes,
  } = useBallotBoxes()

  const {
    data: ballotBoxes,
    pending: ballotBoxesPending,
    refresh: refreshBallotBoxes,
  } = useAsyncData(`election-ballot-boxes-${electionId.value}`, async () => {
    return await fetchBallotBoxes(electionId.value)
  })

  const ballotBoxModalRef = ref<InstanceType<typeof BallotBoxFormModal> | null>(null)
  const ballotBoxToDelete = ref<BallotBoxRow | null>(null)
  const isBallotBoxDeleteModalOpen = ref(false)
  const isDeletingBallotBox = ref(false)
  const togglingBoxId = ref<string | null>(null)
  const releasingVoterBoxId = ref<string | null>(null)
  let ballotBoxesChannel: ReturnType<typeof subscribeToBallotBoxes> | null = null
  let attendanceChannel: ReturnType<typeof useSupabaseClient>['channel'] | null = null

  const activeBallotBoxesCount = computed(
    () => ballotBoxes.value?.filter((b) => b.is_active).length || 0,
  )
  const inactiveBallotBoxesCount = computed(
    () => ballotBoxes.value?.filter((b) => !b.is_active).length || 0,
  )

  const openCreateBallotBoxModal = () => {
    ballotBoxModalRef.value?.open()
  }

  const openEditBallotBoxModal = (box: BallotBoxRow) => {
    ballotBoxModalRef.value?.open(box)
  }

  const openDeleteBallotBoxModal = (box: BallotBoxRow) => {
    ballotBoxToDelete.value = box
    isBallotBoxDeleteModalOpen.value = true
  }

  const handleToggleBallotBox = async (box: BallotBoxRow, active: boolean) => {
    togglingBoxId.value = box.id
    try {
      await toggleBallotBoxStatusApi(box.id, active)
      toast.success(`Urna "${box.name}" ${active ? 'ativada' : 'desativada'} com sucesso.`)
      await refreshBallotBoxes()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao alterar status da urna.'
      toast.error(msg)
    } finally {
      togglingBoxId.value = null
    }
  }

  const handleReleaseForVoter = async (box: BallotBoxRow, voterRegistrationNumber: string) => {
    if (!election.value) return
    releasingVoterBoxId.value = box.id
    try {
      await releaseBallotBoxForVoterApi({
        electionId: election.value.id,
        ballotBoxId: box.id,
        voterRegistrationNumber,
      })
      toast.success(
        `Eleitor (Título nº ${voterRegistrationNumber}) validado! Urna "${box.name}" liberada para votação.`,
      )
      await Promise.all([refreshBallotBoxes(), refreshAttendance()])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao validar título do eleitor.'
      toast.error(msg)
    } finally {
      releasingVoterBoxId.value = null
    }
  }

  const handleOpenBallotBoxTerminal = (box: BallotBoxRow) => {
    const terminalUrl = `/elections/${electionId.value}/ballot-box/${box.id}`
    if (typeof window !== 'undefined') {
      const win = window.open(
        terminalUrl,
        `BallotBoxKiosk_${box.id}`,
        'popup=yes,fullscreen=yes,menubar=no,toolbar=no',
      )
      if (!win || win.closed || typeof win.closed === 'undefined') {
        router.push(terminalUrl)
      }
    }
  }

  const handleConfirmDeleteBallotBox = async () => {
    if (!ballotBoxToDelete.value) return
    isDeletingBallotBox.value = true
    try {
      await deleteBallotBoxApi(ballotBoxToDelete.value.id)
      toast.success('Urna virtual removida com sucesso.')
      isBallotBoxDeleteModalOpen.value = false
      ballotBoxToDelete.value = null
      await refreshBallotBoxes()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao remover urna virtual.'
      toast.error(msg)
    } finally {
      isDeletingBallotBox.value = false
    }
  }

  onMounted(() => {
    ballotBoxesChannel = subscribeToBallotBoxes(electionId.value, () => {
      refreshBallotBoxes()
    })

    attendanceChannel = subscribeToElectionAttendance(electionId.value, () => {
      refreshAttendance()
    })
  })

  onUnmounted(() => {
    removeRealtimeChannel(ballotBoxesChannel)
    removeRealtimeChannel(attendanceChannel)
  })

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
      await Promise.all([refresh(), refreshVotes()])
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
              <UiChip
                :color="
                  ELECTION_VOTING_MODE_COLORS[
                    (election.voting_mode || 'simple') as ElectionVotingMode
                  ] || 'teal'
                "
                size="sm"
                variant="soft"
              >
                MODO:
                {{
                  (
                    ELECTION_VOTING_MODE_LABELS[
                      (election.voting_mode || 'simple') as ElectionVotingMode
                    ] || 'Simples'
                  ).toUpperCase()
                }}
              </UiChip>
              <UiChip
                :color="election.is_anonymous !== false ? 'default' : 'deep-orange'"
                size="sm"
                :variant="election.is_anonymous !== false ? 'soft' : 'solid'"
              >
                {{ election.is_anonymous !== false ? 'VOTO: ANÔNIMO' : 'VOTO: NOMINAL' }}
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
          <!-- Relatório Inicial (Zerésima) -->
          <UiButton
            color="info"
            data-testid="btn-open-initial-report"
            prepend-icon="printer"
            variant="soft"
            @click="openReportModal('initial')"
          >
            Relatório Inicial (Zerésima)
          </UiButton>

          <!-- Relatório Final de Apuração -->
          <UiButton
            v-if="election.status === 'tallying' || election.status === 'finished'"
            color="success"
            data-testid="btn-open-final-report"
            prepend-icon="document"
            variant="soft"
            @click="openReportModal('final')"
          >
            Relatório Final
          </UiButton>

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
                      ? 'success'
                      : election.status === 'tallying'
                        ? 'chart'
                        : election.status === 'released'
                          ? 'vote'
                          : 'time'
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
          <UiTab value="committee">Comissão Eleitoral</UiTab>
          <UiTab value="voters">Eleitores Cadastrados</UiTab>
          <UiTab value="voting">Urnas Virtuais & Votação</UiTab>
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

          <!-- ABA: COMISSÃO ELEITORAL -->
          <div v-else-if="activeTab === 'committee'">
            <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-3">
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">Equipe e Comissão Eleitoral</h3>
                <p class="text-caption text-medium-emphasis mb-0">
                  Cadastre os nomes e os cargos dos membros da comissão. Todos os integrantes
                  listarão com local de assinatura nos relatórios Inicial (Zerésima) e Final.
                </p>
              </div>
              <div class="d-flex align-center ga-2">
                <UiButton
                  color="info"
                  prepend-icon="printer"
                  size="sm"
                  variant="soft"
                  @click="openReportModal('initial')"
                >
                  Emitir Relatório Inicial (Zerésima)
                </UiButton>
              </div>
            </div>

            <!-- Formulário de Adição de Membro da Comissão -->
            <UiCard
              v-if="canManageElections() && election.status !== 'finished'"
              class="pa-4 mb-5 bg-surface-variant"
              variant="outline"
            >
              <div class="text-subtitle-2 font-weight-bold mb-3">
                Adicionar Membro à Comissão Eleitoral
              </div>
              <UiRow align="center" dense>
                <UiCol cols="12" md="5">
                  <UiInput
                    v-model="committeeFormName"
                    data-testid="input-committee-member-name"
                    density="compact"
                    hide-details
                    label="Nome Completo da Pessoa *"
                    placeholder="Ex: Maria Aparecida Silva"
                    @keyup.enter="handleSaveCommitteeMember"
                  />
                </UiCol>
                <UiCol cols="12" md="5">
                  <UiInput
                    v-model="committeeFormRole"
                    data-testid="input-committee-member-role"
                    density="compact"
                    hide-details
                    label="Cargo na Comissão (Texto Livre) *"
                    placeholder="Ex: Presidente da Comissão, 1º Mesário, Secretário..."
                    @keyup.enter="handleSaveCommitteeMember"
                  />
                </UiCol>
                <UiCol cols="12" md="2">
                  <UiButton
                    block
                    color="primary"
                    data-testid="btn-save-committee-member"
                    :loading="isSavingCommitteeMember"
                    prepend-icon="add"
                    variant="solid"
                    @click="handleSaveCommitteeMember"
                  >
                    Adicionar
                  </UiButton>
                </UiCol>
              </UiRow>
            </UiCard>

            <!-- Loading de Comissão -->
            <div v-if="committeePending" class="text-center py-8">
              <UiProgressCircular color="primary" indeterminate size="32" />
              <div class="text-caption text-medium-emphasis mt-2">
                Carregando membros da comissão...
              </div>
            </div>

            <!-- Empty State da Comissão -->
            <UiCard
              v-else-if="!committeeMembers || committeeMembers.length === 0"
              class="text-center py-8 px-4"
              variant="outline"
            >
              <UiAvatar class="mb-3" color="primary" rounded="lg" size="48">
                <UiIcon color="white" name="usersGroup" size="24" />
              </UiAvatar>
              <h4 class="text-subtitle-1 font-weight-bold mb-1">
                Nenhum membro cadastrado na comissão
              </h4>
              <p class="text-caption text-medium-emphasis mb-0">
                Utilize os campos acima para informar o nome e o cargo de cada membro da equipe que
                assinará os relatórios oficiais da eleição.
              </p>
            </UiCard>

            <!-- Tabela de Membros da Comissão -->
            <UiCard v-else variant="outline">
              <UiTable
                density="comfortable"
                :headers="committeeTableHeaders"
                :items="(committeeMembers || []) as unknown as Record<string, unknown>[]"
              >
                <template #item-order="{ index }">
                  <span class="text-medium-emphasis font-weight-bold">{{ index + 1 }}</span>
                </template>
                <template #item-name="{ item }">
                  <span class="font-weight-bold">{{
                    (item as unknown as ElectionCommitteeMemberRow).name
                  }}</span>
                </template>
                <template #item-role_name="{ item }">
                  <UiChip color="primary" size="sm" variant="soft">
                    {{ (item as unknown as ElectionCommitteeMemberRow).role_name }}
                  </UiChip>
                </template>
                <template #item-actions="{ item }">
                  <div class="d-inline-flex ga-1">
                    <UiActionButton
                      action="edit"
                      tooltip="Editar membro"
                      variant="ghost"
                      @click="openEditCommitteeModal(item as unknown as ElectionCommitteeMemberRow)"
                    />
                    <UiActionButton
                      action="delete"
                      tooltip="Remover membro"
                      variant="ghost"
                      @click="
                        openDeleteCommitteeModal(item as unknown as ElectionCommitteeMemberRow)
                      "
                    />
                  </div>
                </template>
              </UiTable>
            </UiCard>
          </div>

          <!-- ABA: ELEITORES CADASTRADOS & COMPARECIMENTO -->
          <div v-else-if="activeTab === 'voters'">
            <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-3">
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">
                  Eleitores Cadastrados & Comparecimento
                </h3>
                <p class="text-caption text-medium-emphasis mb-0">
                  Consulte a relação de eleitores aptos e acompanhe o registro de presença em tempo
                  real.
                </p>
              </div>

              <UiButton
                color="primary"
                :loading="votersPending || attendancePending"
                prepend-icon="refresh"
                size="sm"
                variant="tonal"
                @click="
                  async () => {
                    await refreshVoters()
                    await refreshAttendance()
                  }
                "
              >
                Atualizar Lista
              </UiButton>
            </div>

            <!-- Cards de Métricas dos Eleitores -->
            <UiRow class="g-3 mb-4">
              <UiCol cols="12" sm="4">
                <UiCard class="pa-3 text-center" variant="outline">
                  <span class="text-caption text-medium-emphasis d-block mb-1"
                    >Total de Eleitores Aptos</span
                  >
                  <div class="text-h6 font-weight-bold text-primary">
                    {{ totalVotersCount }}
                  </div>
                </UiCard>
              </UiCol>
              <UiCol cols="12" sm="4">
                <UiCard class="pa-3 text-center" variant="outline">
                  <span class="text-caption text-medium-emphasis d-block mb-1"
                    >Compareceram (Votaram)</span
                  >
                  <div class="text-h6 font-weight-bold text-success">
                    {{ votedVotersCount }}
                    <span class="text-caption text-medium-emphasis font-weight-regular">
                      ({{ turnoutPercentage.toFixed(1) }}%)
                    </span>
                  </div>
                </UiCard>
              </UiCol>
              <UiCol cols="12" sm="4">
                <UiCard class="pa-3 text-center" variant="outline">
                  <span class="text-caption text-medium-emphasis d-block mb-1"
                    >Aguardando Votação</span
                  >
                  <div class="text-h6 font-weight-bold text-warning">
                    {{ pendingVotersCount }}
                  </div>
                </UiCard>
              </UiCol>
            </UiRow>

            <!-- Barra de Busca e Filtros -->
            <UiCard class="pa-3 mb-4" variant="outline">
              <UiRow align="center" class="g-2">
                <UiCol cols="12" md="6">
                  <UiInput
                    v-model="votersSearch"
                    clearable
                    density="compact"
                    hide-details
                    placeholder="Buscar por nome ou nº do título..."
                    prepend-inner-icon="search"
                    size="sm"
                    variant="outline"
                  />
                </UiCol>
                <UiCol cols="12" md="6">
                  <div class="d-flex align-center justify-md-end ga-2 flex-wrap">
                    <UiButton
                      :color="votersFilter === 'all' ? 'primary' : 'default'"
                      size="xs"
                      :variant="votersFilter === 'all' ? 'solid' : 'tonal'"
                      @click="votersFilter = 'all'"
                    >
                      Todos ({{ totalVotersCount }})
                    </UiButton>
                    <UiButton
                      :color="votersFilter === 'voted' ? 'success' : 'default'"
                      size="xs"
                      :variant="votersFilter === 'voted' ? 'solid' : 'tonal'"
                      @click="votersFilter = 'voted'"
                    >
                      Já Votaram ({{ votedVotersCount }})
                    </UiButton>
                    <UiButton
                      :color="votersFilter === 'pending' ? 'warning' : 'default'"
                      size="xs"
                      :variant="votersFilter === 'pending' ? 'solid' : 'tonal'"
                      @click="votersFilter = 'pending'"
                    >
                      Pendentes ({{ pendingVotersCount }})
                    </UiButton>
                  </div>
                </UiCol>
              </UiRow>
            </UiCard>

            <!-- Tabela de Eleitores -->
            <UiCard variant="outline">
              <UiTable
                :headers="votersTableHeaders"
                :items="filteredVoters as unknown as Array<Record<string, unknown>>"
                :loading="votersPending || attendancePending"
              >
                <template #item-voter_registration_number="{ item }">
                  <span class="font-weight-bold text-caption font-monospace">
                    {{ (item as unknown as VoterWithAttendanceAndVote).voter_registration_number }}
                  </span>
                </template>

                <template #item-name="{ item }">
                  <span class="font-weight-medium">
                    {{ (item as unknown as VoterWithAttendanceAndVote).name }}
                  </span>
                </template>

                <template #item-attendance="{ item }">
                  <UiChip
                    v-if="(item as unknown as VoterWithAttendanceAndVote).hasVoted"
                    color="success"
                    label
                    size="xs"
                    variant="tonal"
                  >
                    <UiIcon class="mr-1" name="check" size="12" />
                    Votou em
                    {{ formatDateTime((item as unknown as VoterWithAttendanceAndVote).votedAt) }}
                  </UiChip>
                  <UiChip v-else color="warning" label size="xs" variant="tonal">
                    <UiIcon class="mr-1" name="clockOutline" size="12" />
                    Não votou
                  </UiChip>
                </template>

                <template v-if="election.is_anonymous === false" #item-vote="{ item }">
                  <template v-if="(item as unknown as VoterWithAttendanceAndVote).hasVoted">
                    <UiChip
                      v-if="(item as unknown as VoterWithAttendanceAndVote).isBlank"
                      color="default"
                      label
                      size="xs"
                      variant="tonal"
                    >
                      Voto em Branco
                    </UiChip>
                    <UiChip
                      v-else-if="(item as unknown as VoterWithAttendanceAndVote).isNull"
                      color="error"
                      label
                      size="xs"
                      variant="tonal"
                    >
                      Voto Nulo
                    </UiChip>
                    <UiChip
                      v-else-if="
                        (item as unknown as VoterWithAttendanceAndVote).candidateNumber ||
                        (item as unknown as VoterWithAttendanceAndVote).candidateName
                      "
                      color="primary"
                      label
                      size="xs"
                      variant="tonal"
                    >
                      <UiIcon class="mr-1" name="account" size="12" />
                      {{ (item as unknown as VoterWithAttendanceAndVote).candidateNumber }} -
                      {{
                        (item as unknown as VoterWithAttendanceAndVote).candidateName || 'Candidato'
                      }}
                    </UiChip>
                    <span v-else class="text-caption text-medium-emphasis">Voto Registrado</span>
                  </template>
                  <span v-else class="text-caption text-medium-emphasis text-disabled">
                    Aguardando voto
                  </span>
                </template>

                <template #item-is_active="{ item }">
                  <UiChip
                    :color="
                      (item as unknown as VoterWithAttendanceAndVote).is_active
                        ? 'success'
                        : 'error'
                    "
                    label
                    size="xs"
                    variant="tonal"
                  >
                    {{
                      (item as unknown as VoterWithAttendanceAndVote).is_active
                        ? 'Ativo'
                        : 'Inativo'
                    }}
                  </UiChip>
                </template>

                <template #empty>
                  <span v-if="votersSearch"
                    >Nenhum eleitor encontrado para o termo pesquisado.</span
                  >
                  <span v-else>Nenhum eleitor cadastrado no sistema.</span>
                </template>
              </UiTable>
            </UiCard>
          </div>

          <!-- ABA 3: URNAS VIRTUAIS & TERMINAL DE VOTAÇÃO -->
          <div v-else-if="activeTab === 'voting'">
            <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-3">
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">
                  Urnas Virtuais & Cabines de Votação
                </h3>
                <p class="text-caption text-medium-emphasis mb-0">
                  Gerencie os pontos físicos (computadores, tablets ou celulares) dedicados à
                  recepção de votos.
                </p>
              </div>

              <UiButton
                v-if="canManageElections()"
                color="primary"
                prepend-icon="add"
                variant="solid"
                @click="openCreateBallotBoxModal"
              >
                Adicionar Urna Virtual
              </UiButton>
            </div>

            <!-- Alerta Informativo da Fase de Planejamento -->
            <UiAlert
              v-if="election.status === 'awaiting_release'"
              class="mb-4"
              text="Fase de Planejamento: As urnas virtuais podem ser cadastradas previamente e permanecem desativadas. No dia da eleição, cada mesário ativa e abre o terminal no respectivo equipamento físico."
              type="info"
              variant="soft"
            />
            <UiAlert
              v-else-if="election.status === 'released'"
              class="mb-4"
              text="Eleição Liberada: Ative as urnas nos equipamentos físicos para liberar a cabine interativa de votação aos eleitores."
              type="success"
              variant="soft"
            />
            <UiAlert
              v-else
              class="mb-4"
              text="Votação Encerrada: As urnas não recebem novos votos. Prossiga para a aba de Apuração para conferir os resultados."
              type="warning"
              variant="soft"
            />

            <!-- Cards de Métricas das Urnas -->
            <UiRow class="g-3 mb-4">
              <UiCol cols="12" sm="4">
                <UiCard class="pa-3 text-center" variant="tonal">
                  <span class="text-caption text-medium-emphasis d-block mb-1">Total de Urnas</span>
                  <span class="text-h6 font-weight-bold">{{ ballotBoxes?.length || 0 }}</span>
                </UiCard>
              </UiCol>
              <UiCol cols="12" sm="4">
                <UiCard class="pa-3 text-center border-success" variant="tonal">
                  <span class="text-caption text-success font-weight-medium d-block mb-1">
                    Urnas Ativas (Disponíveis)
                  </span>
                  <span class="text-h6 font-weight-bold text-success">{{
                    activeBallotBoxesCount
                  }}</span>
                </UiCard>
              </UiCol>
              <UiCol cols="12" sm="4">
                <UiCard class="pa-3 text-center border-error" variant="tonal">
                  <span class="text-caption text-error font-weight-medium d-block mb-1">
                    Urnas Desativadas (Pausadas)
                  </span>
                  <span class="text-h6 font-weight-bold text-error">{{
                    inactiveBallotBoxesCount
                  }}</span>
                </UiCard>
              </UiCol>
            </UiRow>

            <!-- Loading de Urnas -->
            <div v-if="ballotBoxesPending" class="text-center py-8">
              <UiProgressCircular color="primary" indeterminate size="36" />
              <div class="text-caption text-medium-emphasis mt-2">Carregando urnas virtuais...</div>
            </div>

            <!-- Estado Vazio -->
            <UiCard
              v-else-if="!ballotBoxes || ballotBoxes.length === 0"
              class="text-center py-8 px-4"
              variant="outline"
            >
              <UiAvatar class="mb-3" color="primary" rounded="lg" size="48">
                <UiIcon color="white" name="vote" size="24" />
              </UiAvatar>
              <h4 class="text-subtitle-1 font-weight-bold mb-1">Nenhuma urna virtual cadastrada</h4>
              <p class="text-caption text-medium-emphasis mb-4">
                Cadastre os dispositivos físicos que atuarão como terminais de votação para esta
                eleição.
              </p>
              <UiButton
                v-if="canManageElections()"
                color="primary"
                prepend-icon="add"
                variant="solid"
                @click="openCreateBallotBoxModal"
              >
                Cadastrar Primeira Urna
              </UiButton>
            </UiCard>

            <!-- Grid de Urnas Virtuais -->
            <UiRow v-else class="g-4">
              <UiCol v-for="box in ballotBoxes" :key="box.id" cols="12" lg="4" md="6">
                <BallotBoxCard
                  :ballot-box="box"
                  :can-manage="canManageElections()"
                  :election-status="election.status"
                  :is-releasing-voter="releasingVoterBoxId === box.id"
                  :is-toggling="togglingBoxId === box.id"
                  :voting-mode="election.voting_mode || 'simple'"
                  @delete="openDeleteBallotBoxModal"
                  @edit="openEditBallotBoxModal"
                  @open-terminal="handleOpenBallotBoxTerminal"
                  @release-for-voter="handleReleaseForVoter"
                  @toggle="handleToggleBallotBox"
                />
              </UiCol>
            </UiRow>
          </div>

          <!-- ABA 4: APURAÇÃO & RESULTADOS -->
          <div v-else-if="activeTab === 'results'">
            <div class="d-flex flex-wrap align-center justify-space-between mb-4 ga-3">
              <div>
                <h3 class="text-subtitle-1 font-weight-bold mb-1">
                  Boletim de Urna e Totalização de Votos
                </h3>
                <p class="text-caption text-medium-emphasis mb-0">
                  Contagem de votos nominais, porcentagens, fotos, classificação e emissão de
                  relatórios oficiais.
                </p>
              </div>
              <div class="d-flex align-center ga-2">
                <UiButton
                  color="info"
                  prepend-icon="printer"
                  size="sm"
                  variant="soft"
                  @click="openReportModal('initial')"
                >
                  Relatório Inicial (Zerésima)
                </UiButton>
                <UiButton
                  v-if="election.status === 'tallying' || election.status === 'finished'"
                  color="primary"
                  prepend-icon="document"
                  size="sm"
                  variant="solid"
                  @click="openReportModal('final')"
                >
                  Emitir Relatório Final de Apuração
                </UiButton>
              </div>
            </div>

            <UiAlert
              v-if="election.status === 'awaiting_release' || election.status === 'released'"
              title="Apuração Indisponível no Momento"
              type="info"
              variant="soft"
            >
              Os resultados da apuração serão computados e exibidos assim que a fase de votação for
              concluída e a apuração for iniciada. Antes de iniciar a votação, você pode emitir o
              <strong>Relatório Inicial (Zerésima)</strong> para comprovar a condição inicial da
              urna.
            </UiAlert>

            <div v-else>
              <UiRow class="g-4 mb-5">
                <UiCol cols="12" sm="3">
                  <div class="pa-4 border rounded-lg text-center bg-surface-variant">
                    <div class="text-caption text-medium-emphasis font-weight-bold">
                      VOTOS VÁLIDOS
                    </div>
                    <div class="text-h4 font-weight-bold text-success mt-1">
                      {{ electionTally.validVotes }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ formatPercentageBr(electionTally.validPercentage) }} do total
                    </div>
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="pa-4 border rounded-lg text-center bg-surface-variant">
                    <div class="text-caption text-medium-emphasis font-weight-bold">
                      VOTOS EM BRANCO
                    </div>
                    <div class="text-h4 font-weight-bold text-primary mt-1">
                      {{ electionTally.blankVotes }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ formatPercentageBr(electionTally.blankPercentage) }} do total
                    </div>
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="pa-4 border rounded-lg text-center bg-surface-variant">
                    <div class="text-caption text-medium-emphasis font-weight-bold">
                      VOTOS NULOS
                    </div>
                    <div class="text-h4 font-weight-bold text-warning mt-1">
                      {{ electionTally.nullVotes }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">
                      {{ formatPercentageBr(electionTally.nullPercentage) }} do total
                    </div>
                  </div>
                </UiCol>
                <UiCol cols="12" sm="3">
                  <div class="pa-4 border rounded-lg text-center bg-surface-variant">
                    <div class="text-caption text-medium-emphasis font-weight-bold">
                      TOTAL DE VOTANTES
                    </div>
                    <div class="text-h4 font-weight-bold text-high-emphasis mt-1">
                      {{ electionTally.totalVotes }}
                    </div>
                    <div class="text-caption text-medium-emphasis mt-1">100,00% computados</div>
                  </div>
                </UiCol>
              </UiRow>

              <h4 class="text-subtitle-2 font-weight-bold text-uppercase text-primary mb-3">
                Ordem de Classificação dos Candidatos
              </h4>
              <UiCard class="mb-4" variant="outline">
                <UiTable
                  density="comfortable"
                  :headers="rankingTableHeaders"
                  :items="electionTally.candidatesRanking as unknown as Record<string, unknown>[]"
                >
                  <template #item-rank="{ item }">
                    <UiChip
                      class="font-weight-bold"
                      :color="
                        (item as unknown as (typeof electionTally.candidatesRanking)[0]).rank === 1
                          ? 'warning'
                          : 'secondary'
                      "
                      size="sm"
                      :variant="
                        (item as unknown as (typeof electionTally.candidatesRanking)[0]).rank === 1
                          ? 'solid'
                          : 'soft'
                      "
                    >
                      {{ (item as unknown as (typeof electionTally.candidatesRanking)[0]).rank }}º
                      Lugar
                    </UiChip>
                  </template>
                  <template #item-photo="{ item }">
                    <div class="py-1">
                      <UiAvatar color="primary" size="44">
                        <img
                          :alt="
                            (item as unknown as (typeof electionTally.candidatesRanking)[0])
                              .candidate.name
                          "
                          class="w-100 h-100 object-cover"
                          :src="
                            (item as unknown as (typeof electionTally.candidatesRanking)[0])
                              .candidate.photo_url ||
                            'https://picsum.photos/seed/' +
                              (item as unknown as (typeof electionTally.candidatesRanking)[0])
                                .candidate.candidate_number +
                              '/300/300'
                          "
                        />
                      </UiAvatar>
                    </div>
                  </template>
                  <template #item-candidate_number="{ item }">
                    <UiChip color="primary" label size="sm" variant="outlined">
                      Nº
                      {{
                        (item as unknown as (typeof electionTally.candidatesRanking)[0]).candidate
                          .candidate_number
                      }}
                    </UiChip>
                  </template>
                  <template #item-name="{ item }">
                    <span class="font-weight-bold">{{
                      (item as unknown as (typeof electionTally.candidatesRanking)[0]).candidate
                        .name
                    }}</span>
                  </template>
                  <template #item-votesCount="{ item }">
                    <span class="font-weight-bold text-body-1">
                      {{
                        (item as unknown as (typeof electionTally.candidatesRanking)[0]).votesCount
                      }}
                      voto(s)
                    </span>
                  </template>
                  <template #item-percentage="{ item }">
                    <div class="font-weight-bold text-primary">
                      {{
                        formatPercentageBr(
                          (item as unknown as (typeof electionTally.candidatesRanking)[0])
                            .percentageOfValid,
                        )
                      }}
                      dos válidos
                    </div>
                    <div class="text-caption text-medium-emphasis">
                      {{
                        formatPercentageBr(
                          (item as unknown as (typeof electionTally.candidatesRanking)[0])
                            .percentageOfTotal,
                        )
                      }}
                      do total
                    </div>
                  </template>
                  <template #empty> Nenhum candidato registrado nesta eleição. </template>
                </UiTable>
              </UiCard>

              <UiAlert type="success" variant="soft">
                <div class="d-flex flex-wrap align-center justify-space-between ga-2">
                  <span>
                    Boletim de urna consolidado e pronto para impressão e assinatura da comissão
                    eleitoral.
                  </span>
                  <UiButton
                    color="success"
                    prepend-icon="printer"
                    size="sm"
                    variant="solid"
                    @click="openReportModal('final')"
                  >
                    Visualizar / Imprimir Relatório Final
                  </UiButton>
                </div>
              </UiAlert>
            </div>
          </div>
        </div>
      </UiCard>
    </div>

    <!-- Modal de Edição da Eleição -->
    <ElectionFormModal ref="modalRef" @saved="onElectionSaved" />

    <!-- Modal de Relatórios Oficiais (Inicial / Final) -->
    <ElectionReportModal
      v-if="election"
      ref="reportModalRef"
      :ballot-boxes="ballotBoxes || []"
      :candidates="candidates || []"
      :committee="committeeMembers || []"
      :election="election"
      :tally="electionTally"
      :votes="electionVotes || []"
    />

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

    <!-- Modal de Formulário de Urna Virtual -->
    <BallotBoxFormModal
      v-if="election"
      ref="ballotBoxModalRef"
      :election-id="election.id"
      @saved="refreshBallotBoxes"
    />

    <!-- Modal de Confirmação de Exclusão de Urna Virtual (Safe Delete) -->
    <UiModal
      v-model="isBallotBoxDeleteModalOpen"
      max-width="480px"
      title="Confirmar Exclusão da Urna Virtual"
    >
      <p class="text-body-1">
        Tem certeza que deseja excluir a urna virtual
        <strong>{{ ballotBoxToDelete?.name }}</strong
        >?
      </p>
      <p class="text-caption text-medium-emphasis">
        Esta ação realizará uma exclusão segura (safe delete). A urna não aparecerá mais na lista
        operacional de votação.
      </p>

      <template #actions>
        <UiButton
          color="default"
          :disabled="isDeletingBallotBox"
          variant="outline"
          @click="isBallotBoxDeleteModalOpen = false"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="error"
          :loading="isDeletingBallotBox"
          variant="solid"
          @click="handleConfirmDeleteBallotBox"
        >
          Excluir Urna
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal de Edição de Membro da Comissão -->
    <UiModal v-model="isEditCommitteeModalOpen" max-width="520px" title="Editar Membro da Comissão">
      <div class="py-2 d-flex flex-column ga-3">
        <UiInput
          v-model="editCommitteeFormName"
          label="Nome Completo da Pessoa *"
          placeholder="Ex: Maria Aparecida Silva"
          @keyup.enter="handleSaveEditCommitteeMember"
        />
        <UiInput
          v-model="editCommitteeFormRole"
          label="Cargo na Comissão (Texto Livre) *"
          placeholder="Ex: Presidente da Comissão, 1º Mesário..."
          @keyup.enter="handleSaveEditCommitteeMember"
        />
      </div>

      <template #actions>
        <UiButton
          color="default"
          :disabled="isSavingEditCommittee"
          variant="outline"
          @click="closeEditCommitteeModal"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="primary"
          :loading="isSavingEditCommittee"
          prepend-icon="save"
          variant="solid"
          @click="handleSaveEditCommitteeMember"
        >
          Salvar Alterações
        </UiButton>
      </template>
    </UiModal>

    <!-- Modal de Confirmação de Exclusão de Membro da Comissão -->
    <UiModal
      v-model="isDeleteCommitteeModalOpen"
      max-width="480px"
      title="Confirmar Remoção de Membro"
    >
      <div class="py-2">
        <p class="text-body-1 mb-2">
          Deseja realmente remover
          <strong>"{{ committeeMemberToDelete?.name }}"</strong> ({{
            committeeMemberToDelete?.role_name
          }}) da comissão eleitoral?
        </p>
        <UiAlert color="warning" size="sm" variant="soft">
          O membro não constará mais nos relatórios oficiais e listas de assinatura desta eleição.
        </UiAlert>
      </div>

      <template #actions>
        <UiButton
          color="default"
          :disabled="isDeletingCommitteeMember"
          variant="outline"
          @click="closeDeleteCommitteeModal"
        >
          Cancelar
        </UiButton>
        <UiButton
          color="error"
          :loading="isDeletingCommitteeMember"
          variant="solid"
          @click="handleConfirmDeleteCommitteeMember"
        >
          Confirmar Remoção
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
