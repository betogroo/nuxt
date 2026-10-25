<script setup lang="ts">
  import { ref, computed, onMounted, onUnmounted } from 'vue'
  import { useElections } from '~/composables/useElections'
  import { useBallotBoxes } from '~/composables/useBallotBoxes'
  import { useCandidates } from '~/composables/useCandidates'
  import { useElectionVotes } from '~/composables/useElectionVotes'
  import { useSupabaseClient } from '#imports'
  import type { BallotBoxRow } from '~/types/ballot-box'
  import type { ElectionRow } from '~/types/election'
  import type { CandidateRow } from '~/types/candidate'
  import type { RealtimeChannel } from '@supabase/supabase-js'
  import VirtualBallotBox from '~/components/elections/VirtualBallotBox.vue'

  definePageMeta({
    middleware: ['elections'],
    layout: false,
    roles: ['admin', 'manager-election', 'admin-election', 'user-election'],
  })

  const route = useRoute()
  const router = useRouter()
  const supabase = useSupabaseClient()

  const electionId = computed(() => route.params.id as string)
  const boxId = computed(() => route.params.boxId as string)

  const { fetchElectionById } = useElections()
  const { fetchBallotBoxById, toggleBallotBoxStatus } = useBallotBoxes()
  const { fetchCandidates } = useCandidates()
  const { castVote } = useElectionVotes()

  const election = ref<ElectionRow | null>(null)
  const ballotBox = ref<BallotBoxRow | null>(null)
  const candidates = ref<CandidateRow[]>([])
  const loading = ref(true)
  const errorMessage = ref<string | null>(null)

  const isFullscreen = ref(false)
  const isExitModalOpen = ref(false)
  const isPostVoteCooldown = ref(false)
  let cooldownTimer: ReturnType<typeof setTimeout> | null = null
  let realtimeChannel: RealtimeChannel | null = null

  const isBoxActive = computed(() => !!ballotBox.value?.is_active)
  const isElectionReleased = computed(() => election.value?.status === 'released')
  const isMonitoredMode = computed(() => election.value?.voting_mode === 'monitored')

  const electionDisplayName = computed(() => {
    if (!election.value) return ''
    return election.value.is_uppercase ? election.value.name.toUpperCase() : election.value.name
  })

  const loadData = async () => {
    loading.value = true
    errorMessage.value = null

    try {
      const [electionData, boxData, candidatesData] = await Promise.all([
        fetchElectionById(electionId.value),
        fetchBallotBoxById(boxId.value),
        fetchCandidates(electionId.value),
      ])

      if (!electionData) {
        throw new Error('Eleição não encontrada.')
      }

      if (!boxData) {
        throw new Error('Urna virtual não encontrada.')
      }

      election.value = electionData
      ballotBox.value = boxData
      candidates.value = candidatesData
    } catch (e: unknown) {
      errorMessage.value = e instanceof Error ? e.message : 'Falha ao carregar dados da urna.'
    } finally {
      loading.value = false
    }
  }

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen()
        isFullscreen.value = true
      } else {
        await document.exitFullscreen()
        isFullscreen.value = false
      }
    } catch (err) {
      console.warn('Erro ao alternar modo tela cheia:', err)
    }
  }

  const handleExitTerminal = () => {
    isExitModalOpen.value = true
  }

  const confirmExit = () => {
    isExitModalOpen.value = false
    if (window.opener) {
      window.close()
    } else {
      router.push(`/elections/${electionId.value}`)
    }
  }

  const handleVoteConfirmed = async (payload: {
    candidateId?: string | null
    candidateNumber?: string | null
    isBlank: boolean
    isNull: boolean
  }) => {
    if (!ballotBox.value) return

    const isNominal = isMonitoredMode.value && election.value?.is_anonymous === false

    try {
      await castVote({
        election_id: electionId.value,
        ballot_box_id: ballotBox.value.id,
        candidate_id: payload.candidateId ?? null,
        candidate_number: payload.candidateNumber ?? null,
        is_blank: payload.isBlank,
        is_null: payload.isNull,
        voter_id: isNominal ? (ballotBox.value.current_voter_id ?? null) : null,
        voter_registration_number: isNominal
          ? (ballotBox.value.current_voter_registration_number ?? null)
          : null,
        voter_name: isNominal ? (ballotBox.value.current_voter_name ?? null) : null,
      })
    } catch (err) {
      console.warn('Falha ao registrar voto no banco:', err)
    }

    if (!isMonitoredMode.value) {
      // Modo Simples: desativa a urna no banco e reativa após 3 segundos
      isPostVoteCooldown.value = true
      try {
        await toggleBallotBoxStatus(ballotBox.value.id, false)
      } catch (err) {
        console.warn('Falha ao pausar urna no modo simples:', err)
      }

      if (cooldownTimer) clearTimeout(cooldownTimer)
      cooldownTimer = setTimeout(async () => {
        try {
          if (ballotBox.value) {
            const updated = await toggleBallotBoxStatus(ballotBox.value.id, true)
            ballotBox.value = updated
          }
        } catch (err) {
          console.warn('Falha ao reativar urna no modo simples:', err)
        } finally {
          isPostVoteCooldown.value = false
        }
      }, 3000)
    } else {
      // Modo Monitorado: mantém tela de FIM por 3s (isPostVoteCooldown) e desativa a urna aguardando próximo eleitor
      isPostVoteCooldown.value = true
    }
  }

  const handleVoteCycleCompleted = async () => {
    if (!ballotBox.value) return

    if (isMonitoredMode.value) {
      try {
        const updated = await toggleBallotBoxStatus(ballotBox.value.id, false)
        ballotBox.value = updated
      } catch (err) {
        console.warn('Falha ao desativar urna após voto monitorado:', err)
      } finally {
        isPostVoteCooldown.value = false
      }
    } else {
      isPostVoteCooldown.value = false
    }
  }

  onMounted(async () => {
    await loadData()

    // Monitoramento Realtime do status desta urna específica e da eleição
    realtimeChannel = supabase
      .channel(`ballot_box_${boxId.value}_realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ballot_boxes',
          filter: `id=eq.${boxId.value}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            errorMessage.value = 'Esta urna foi excluída pelo administrador.'
            ballotBox.value = null
          } else if (payload.new) {
            ballotBox.value = payload.new as BallotBoxRow
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'elections',
          filter: `id=eq.${electionId.value}`,
        },
        (payload) => {
          if (payload.new && election.value) {
            election.value = {
              ...election.value,
              ...(payload.new as Partial<ElectionRow>),
            }
          }
        },
      )
      .subscribe()

    // Listener para tecla Esc e saída de fullscreen
    document.addEventListener('fullscreenchange', () => {
      isFullscreen.value = !!document.fullscreenElement
    })
  })

  onUnmounted(() => {
    if (cooldownTimer) {
      clearTimeout(cooldownTimer)
    }
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
    }
  })

  useHead({
    title: computed(() =>
      ballotBox.value ? `${ballotBox.value.name} - Terminal de Votação` : 'Terminal de Votação',
    ),
  })
</script>

<template>
  <UiApp>
    <UiMain class="terminal-container fill-height bg-grey-lighten-4">
      <!-- Loading State -->
      <div v-if="loading" class="d-flex fill-height align-center justify-center flex-column ga-3">
        <UiProgressCircular color="primary" indeterminate size="56" />
        <span class="text-subtitle-1 text-medium-emphasis"
          >Conectando terminal à urna virtual...</span
        >
      </div>

      <!-- Error State -->
      <div v-else-if="errorMessage" class="d-flex fill-height align-center justify-center pa-4">
        <UiCard class="pa-6 text-center" max-width="480" variant="elevated">
          <UiAvatar class="mb-4" color="error" size="64">
            <UiIcon color="white" name="alert" size="36" />
          </UiAvatar>
          <h2 class="text-h6 font-weight-bold mb-2">Terminal Indisponível</h2>
          <p class="text-body-2 text-medium-emphasis mb-6">
            {{ errorMessage }}
          </p>
          <UiButton color="primary" prepend-icon="arrowLeft" variant="solid" @click="confirmExit">
            Voltar ao Sistema
          </UiButton>
        </UiCard>
      </div>

      <!-- Main Kiosk Screen -->
      <div v-else-if="ballotBox && election" class="d-flex flex-column fill-height">
        <!-- Top Kiosk Bar -->
        <header
          class="terminal-header px-4 py-2 bg-surface border-b d-flex align-center justify-space-between"
        >
          <div class="d-flex align-center ga-3">
            <UiAvatar
              :color="isBoxActive && isElectionReleased ? 'success' : 'error'"
              rounded="md"
              size="36"
            >
              <UiIcon color="white" name="vote" size="20" />
            </UiAvatar>
            <div>
              <div class="text-subtitle-2 font-weight-bold line-height-tight">
                {{ electionDisplayName }}
              </div>
              <div class="text-caption text-medium-emphasis">
                {{ ballotBox.name }}
                <span v-if="ballotBox.device_info"> • {{ ballotBox.device_info }}</span>
              </div>
            </div>
          </div>

          <!-- Ações do Mesário / Terminal -->
          <div class="d-flex align-center ga-2">
            <UiChip
              :color="isBoxActive && isElectionReleased ? 'success' : 'error'"
              label
              size="sm"
              variant="flat"
            >
              <UiIcon
                class="mr-1"
                :name="isBoxActive && isElectionReleased ? 'check' : 'close'"
                size="14"
              />
              {{ isBoxActive && isElectionReleased ? 'Urna Ativa / Pronta' : 'Urna Pausada' }}
            </UiChip>

            <UiButton
              :icon="isFullscreen ? 'fullscreenExit' : 'fullscreen'"
              size="sm"
              title="Tela Cheia"
              variant="ghost"
              @click="toggleFullscreen"
            />

            <UiButton
              color="default"
              icon="logout"
              size="sm"
              title="Encerrar Terminal"
              variant="ghost"
              @click="handleExitTerminal"
            />
          </div>
        </header>

        <!-- Bloqueio Realtime: Urna Desativada -->
        <div
          v-if="!isBoxActive && !isPostVoteCooldown"
          class="flex-grow-1 d-flex align-center justify-center pa-6 text-center bg-grey-lighten-4"
        >
          <UiCard class="pa-8 text-center border-error" max-width="540" variant="elevated">
            <UiAvatar class="mb-4" color="error" size="72">
              <UiIcon color="white" name="lock" size="40" />
            </UiAvatar>
            <h2 class="text-h5 font-weight-bold mb-3 text-error">
              {{
                isMonitoredMode && isElectionReleased
                  ? 'Aguardando Liberação do Mesário'
                  : 'Urna Desativada pelo Administrador'
              }}
            </h2>
            <p class="text-body-1 text-medium-emphasis mb-4">
              {{
                isMonitoredMode && isElectionReleased
                  ? 'Informe o número do seu título ao mesário para validação e liberação desta urna para o seu voto.'
                  : 'Esta urna virtual foi desativada na central de gerenciamento. A recepção de votos está temporariamente suspensa neste equipamento.'
              }}
            </p>
            <UiAlert
              class="text-left"
              :text="
                isMonitoredMode && isElectionReleased
                  ? 'Assim que o mesário validar o título na central, esta tela será liberada automaticamente em tempo real.'
                  : 'A tela será desbloqueada automaticamente assim que o mesário ou administrador ativar a urna na central.'
              "
              type="info"
              variant="soft"
            />
          </UiCard>
        </div>

        <!-- Bloqueio: Eleição Não Liberada -->
        <div
          v-else-if="!isElectionReleased"
          class="flex-grow-1 d-flex align-center justify-center pa-6 text-center bg-grey-lighten-4"
        >
          <UiCard class="pa-8 text-center border-warning" max-width="540" variant="elevated">
            <UiAvatar class="mb-4" color="warning" size="72">
              <UiIcon color="white" name="clockAlert" size="40" />
            </UiAvatar>
            <h2 class="text-h5 font-weight-bold mb-3 text-warning">Eleição Não Liberada</h2>
            <p class="text-body-1 text-medium-emphasis mb-4">
              A eleição ainda não foi liberada pelo gestor para recebimento de votos.
            </p>
            <UiAlert
              class="text-left"
              text="Aguarde o horário oficial de abertura da votação e a liberação na central."
              type="warning"
              variant="soft"
            />
          </UiCard>
        </div>

        <!-- Urna Ativa e Pronta -->
        <div v-else class="flex-grow-1 d-flex flex-column align-center justify-center pa-2 pa-sm-4">
          <UiAlert
            v-if="election?.is_anonymous === false && ballotBox?.current_voter_name"
            class="nominal-voter-alert mb-3 px-4 py-1 text-caption text-center"
            :icon="false"
            size="sm"
            style="flex: 0 0 auto"
            type="warning"
            variant="soft"
          >
            <div class="d-flex align-center justify-center ga-2">
              <UiIcon name="userBadge" size="16" />
              <span>
                <strong>Votação Nominal:</strong> Eleitor
                <strong>{{ ballotBox.current_voter_name }}</strong> (Título nº
                {{ ballotBox.current_voter_registration_number }}) &mdash;
                <span class="text-medium-emphasis">Voto identificado</span>
              </span>
            </div>
          </UiAlert>

          <VirtualBallotBox
            :candidates="candidates"
            :election="election"
            @vote-confirmed="handleVoteConfirmed"
            @vote-cycle-completed="handleVoteCycleCompleted"
          />
        </div>
      </div>
    </UiMain>

    <!-- Modal de Confirmação para Saída da Urna -->
    <UiModal v-model="isExitModalOpen" max-width="440px" title="Encerrar Terminal de Votação">
      <template #default>
        <p class="text-body-1 mb-2">Deseja realmente sair da cabine de votação desta urna?</p>
        <p class="text-caption text-medium-emphasis mb-0">
          Apenas mesários e administradores autorizados devem fechar este terminal.
        </p>
      </template>
      <template #actions>
        <UiButton variant="ghost" @click="isExitModalOpen = false"> Cancelar </UiButton>
        <UiButton color="error" prepend-icon="logout" variant="solid" @click="confirmExit">
          Encerrar Terminal
        </UiButton>
      </template>
    </UiModal>
  </UiApp>
</template>

<style scoped>
  .terminal-container {
    min-height: 100vh;
  }
  :deep(.nominal-voter-alert) {
    flex: 0 0 auto !important;
    width: auto !important;
    max-width: 580px;
    min-height: unset !important;
    padding-top: 6px !important;
    padding-bottom: 6px !important;
    border-radius: 9999px !important;
  }
  .pulse-success {
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
    animation: pulse 2s infinite;
  }
  @keyframes pulse {
    0% {
      transform: scale(0.98);
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
    }
    70% {
      transform: scale(1);
      box-shadow: 0 0 0 14px rgba(76, 175, 80, 0);
    }
    100% {
      transform: scale(0.98);
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
    }
  }
</style>
