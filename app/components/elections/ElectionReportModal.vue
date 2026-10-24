<script setup lang="ts">
  import { ref, computed } from 'vue'
  import {
    useElectionReports,
    formatPercentageBr,
    type FinalNominalVoteItem,
  } from '~/composables/useElectionReports'
  import { formatDateTime } from '~/utils/formatters'
  import { ELECTION_STATUS_LABELS, ELECTION_VOTING_MODE_LABELS } from '~/constants/elections'
  import type { ElectionRow } from '~/types/election'
  import type { CandidateRow } from '~/types/candidate'
  import type { BallotBoxRow } from '~/types/ballot-box'
  import type { ElectionCommitteeMemberRow } from '~/types/election-committee'
  import type { ElectionTallySummary, ElectionVoteRow } from '~/types/election-vote'

  const props = defineProps<{
    election: ElectionRow
    candidates: CandidateRow[]
    ballotBoxes: BallotBoxRow[]
    committee: ElectionCommitteeMemberRow[]
    tally: ElectionTallySummary
    votes?: ElectionVoteRow[]
  }>()

  const isOpen = ref(false)
  const reportType = ref<'initial' | 'final'>('initial')
  const generatedAt = ref<Date>(new Date())
  const isExporting = ref(false)
  const isPrinting = ref(false)

  const toast = useToast()
  const { printInitialReport, exportInitialReportToPdf, printFinalReport, exportFinalReportToPdf } =
    useElectionReports()

  const modalTitle = computed(() =>
    reportType.value === 'initial'
      ? 'Relatório Inicial — Condição da Urna (Zerésima)'
      : 'Relatório Final — Ata de Apuração e Classificação',
  )

  const formattedGeneratedAt = computed(() => formatDateTime(generatedAt.value))
  const formattedElectionDate = computed(() => formatDateTime(props.election.election_date))
  const statusLabel = computed(
    () => ELECTION_STATUS_LABELS[props.election.status] || props.election.status,
  )
  const votingModeLabel = computed(
    () => ELECTION_VOTING_MODE_LABELS[props.election.voting_mode] || props.election.voting_mode,
  )

  const getInitials = (name: string): string => {
    if (!name) return '#'
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('')
  }

  const nominalVotes = computed<FinalNominalVoteItem[]>(() => {
    if (props.election.is_anonymous !== false) return []
    const candidateMap = new Map<string, CandidateRow>()
    for (const c of props.candidates) {
      candidateMap.set(c.id, c)
    }
    return (props.votes || [])
      .filter((v) => v.voter_name || v.voter_registration_number)
      .map((v) => {
        let voteDesc = 'Desconhecido'
        if (v.vote_type === 'nominal') {
          const c = v.candidate_id ? candidateMap.get(v.candidate_id) : null
          voteDesc = c ? `${c.candidate_number} - ${c.name}` : 'Candidato'
        } else if (v.vote_type === 'blank') {
          voteDesc = 'Voto em Branco'
        } else if (v.vote_type === 'null') {
          voteDesc = 'Voto Nulo'
        }
        return {
          voterRegistrationNumber: v.voter_registration_number || '-',
          voterName: v.voter_name || 'Eleitor identificado',
          voteDescription: voteDesc,
          votedAt: formatDateTime(v.created_at),
        }
      })
  })

  const open = (type: 'initial' | 'final') => {
    reportType.value = type
    generatedAt.value = new Date()
    isOpen.value = true
  }

  const handlePrint = async () => {
    isPrinting.value = true
    try {
      if (reportType.value === 'initial') {
        await printInitialReport({
          election: props.election,
          candidates: props.candidates,
          ballotBoxes: props.ballotBoxes,
          committee: props.committee,
          currentVotesCount: props.tally.totalVotes,
          generatedAt: generatedAt.value,
        })
      } else {
        await printFinalReport({
          election: props.election,
          tally: props.tally,
          committee: props.committee,
          generatedAt: generatedAt.value,
          nominalVotes: nominalVotes.value,
        })
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao imprimir relatório.')
    } finally {
      isPrinting.value = false
    }
  }

  const handleDownloadPdf = async () => {
    isExporting.value = true
    try {
      if (reportType.value === 'initial') {
        await exportInitialReportToPdf({
          election: props.election,
          candidates: props.candidates,
          ballotBoxes: props.ballotBoxes,
          committee: props.committee,
          currentVotesCount: props.tally.totalVotes,
          generatedAt: generatedAt.value,
        })
      } else {
        await exportFinalReportToPdf({
          election: props.election,
          tally: props.tally,
          committee: props.committee,
          generatedAt: generatedAt.value,
          nominalVotes: nominalVotes.value,
        })
      }
      toast.success('Relatório em PDF baixado com sucesso!')
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Erro ao gerar PDF do relatório.')
    } finally {
      isExporting.value = false
    }
  }

  defineExpose({
    open,
  })
</script>

<template>
  <UiModal v-model="isOpen" max-width="920px" scrollable :title="modalTitle">
    <div class="pa-2">
      <!-- Cabeçalho Oficial do Relatório -->
      <UiCard class="pa-4 mb-4" variant="outline">
        <div class="d-flex flex-wrap justify-space-between align-start ga-3 mb-3">
          <div>
            <UiChip
              class="mb-2 font-weight-bold"
              :color="reportType === 'initial' ? 'info' : 'primary'"
              label
              size="xs"
              variant="soft"
            >
              {{
                reportType === 'initial'
                  ? 'RELATÓRIO INICIAL (ZERÉSIMA)'
                  : 'RELATÓRIO FINAL DE APURAÇÃO'
              }}
            </UiChip>
            <div class="text-h6 font-weight-bold">{{ election.name }}</div>
            <div class="text-caption text-medium-emphasis">
              {{ election.description || 'Eleição oficial registrada no sistema' }}
            </div>
          </div>

          <div class="text-right">
            <div class="text-caption text-uppercase font-weight-bold text-medium-emphasis">
              Data/Hora de Geração
            </div>
            <div
              class="text-body-2 font-weight-bold text-primary"
              data-testid="report-generated-at"
            >
              {{ formattedGeneratedAt }}
            </div>
          </div>
        </div>

        <UiDivider class="mb-3" />

        <UiRow dense>
          <UiCol cols="12" sm="3">
            <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
              Data da Eleição
            </div>
            <div class="text-body-2 font-weight-medium">{{ formattedElectionDate }}</div>
          </UiCol>
          <UiCol cols="12" sm="3">
            <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
              Modalidade
            </div>
            <div class="text-body-2 font-weight-medium">{{ votingModeLabel }}</div>
          </UiCol>
          <UiCol cols="12" sm="3">
            <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
              Sigilo do Voto
            </div>
            <div class="text-body-2 font-weight-medium">
              {{ election.is_anonymous !== false ? 'Voto Anônimo' : 'Voto Nominal (Não Anônimo)' }}
            </div>
          </UiCol>
          <UiCol cols="12" sm="3">
            <div class="text-caption text-medium-emphasis font-weight-bold text-uppercase">
              Status
            </div>
            <div class="text-body-2 font-weight-medium">{{ statusLabel }}</div>
          </UiCol>
        </UiRow>
      </UiCard>

      <!-- CONTEÚDO: RELATÓRIO INICIAL (ZERÉSIMA) -->
      <div v-if="reportType === 'initial'" data-testid="initial-report-content">
        <UiRow class="mb-4" dense>
          <UiCol cols="6" sm="3">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Votos Computados
              </div>
              <div class="text-h5 font-weight-bold text-success">{{ tally.totalVotes }}</div>
              <div class="text-caption text-medium-emphasis">Urna Zerada</div>
            </UiCard>
          </UiCol>
          <UiCol cols="6" sm="3">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Candidatos
              </div>
              <div class="text-h5 font-weight-bold">{{ candidates.length }}</div>
              <div class="text-caption text-medium-emphasis">0 votos atribuídos</div>
            </UiCard>
          </UiCol>
          <UiCol cols="6" sm="3">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Urnas Virtuais
              </div>
              <div class="text-h5 font-weight-bold">{{ ballotBoxes.length }}</div>
              <div class="text-caption text-medium-emphasis">Verificadas</div>
            </UiCard>
          </UiCol>
          <UiCol cols="6" sm="3">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Comissão
              </div>
              <div class="text-h5 font-weight-bold">{{ committee.length }}</div>
              <div class="text-caption text-medium-emphasis">Membro(s)</div>
            </UiCard>
          </UiCol>
        </UiRow>

        <div class="text-subtitle-2 font-weight-bold text-uppercase text-primary mb-2">
          1. Condição Inicial das Urnas Virtuais
        </div>
        <UiCard class="mb-4" variant="outline">
          <UiTable density="compact">
            <thead>
              <tr>
                <th>Identificação da Urna</th>
                <th>Dispositivo</th>
                <th class="text-center">Condição Inicial</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="ballotBoxes.length === 0">
                <td class="text-center text-medium-emphasis py-3" colspan="3">
                  Nenhuma urna virtual cadastrada.
                </td>
              </tr>
              <tr v-for="box in ballotBoxes" :key="box.id">
                <td class="font-weight-bold">{{ box.name }}</td>
                <td>{{ box.device_info || 'Dispositivo padrão' }}</td>
                <td class="text-center">
                  <UiChip :color="box.is_active ? 'success' : 'secondary'" size="xs" variant="soft">
                    {{ box.is_active ? 'Liberada' : 'Pronta / Aguardando Liberação' }}
                  </UiChip>
                </td>
              </tr>
            </tbody>
          </UiTable>
        </UiCard>

        <div class="text-subtitle-2 font-weight-bold text-uppercase text-primary mb-2">
          2. Relação de Candidatos e Contagem Inicial (Zerésima)
        </div>
        <UiCard class="mb-4" variant="outline">
          <UiTable density="compact">
            <thead>
              <tr>
                <th style="width: 110px">Número</th>
                <th>Candidato</th>
                <th class="text-right" style="width: 160px">Votos Computados</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="candidates.length === 0">
                <td class="text-center text-medium-emphasis py-3" colspan="3">
                  Nenhum candidato cadastrado.
                </td>
              </tr>
              <tr v-for="cand in candidates" :key="cand.id">
                <td>
                  <UiChip color="primary" label size="xs" variant="outlined">
                    {{ cand.candidate_number }}
                  </UiChip>
                </td>
                <td class="font-weight-medium">{{ cand.name }}</td>
                <td class="text-right font-weight-bold">0 votos (0,00%)</td>
              </tr>
              <tr>
                <td class="font-weight-bold">—</td>
                <td>VOTOS EM BRANCO</td>
                <td class="text-right font-weight-bold">0 votos (0,00%)</td>
              </tr>
              <tr>
                <td class="font-weight-bold">—</td>
                <td>VOTOS NULOS</td>
                <td class="text-right font-weight-bold">0 votos (0,00%)</td>
              </tr>
            </tbody>
          </UiTable>
        </UiCard>
      </div>

      <!-- CONTEÚDO: RELATÓRIO FINAL DE APURAÇÃO -->
      <div v-else data-testid="final-report-content">
        <UiRow class="mb-4" dense>
          <UiCol cols="6" sm="3">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Total de Votos
              </div>
              <div class="text-h5 font-weight-bold text-primary">{{ tally.totalVotes }}</div>
              <div class="text-caption text-medium-emphasis">100,00% dos votos</div>
            </UiCard>
          </UiCol>
          <UiCol cols="6" sm="3">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Votos Válidos
              </div>
              <div class="text-h5 font-weight-bold text-success">{{ tally.validVotes }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatPercentageBr(tally.validPercentage) }} do total
              </div>
            </UiCard>
          </UiCol>
          <UiCol cols="6" sm="3">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Votos em Branco
              </div>
              <div class="text-h5 font-weight-bold text-secondary">{{ tally.blankVotes }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatPercentageBr(tally.blankPercentage) }} do total
              </div>
            </UiCard>
          </UiCol>
          <UiCol cols="6" sm="3">
            <UiCard class="pa-3 text-center" variant="outline">
              <div class="text-caption font-weight-bold text-uppercase text-medium-emphasis">
                Votos Nulos
              </div>
              <div class="text-h5 font-weight-bold text-error">{{ tally.nullVotes }}</div>
              <div class="text-caption text-medium-emphasis">
                {{ formatPercentageBr(tally.nullPercentage) }} do total
              </div>
            </UiCard>
          </UiCol>
        </UiRow>

        <div class="text-subtitle-2 font-weight-bold text-uppercase text-primary mb-2">
          Classificação Final dos Candidatos
        </div>
        <UiCard class="mb-4" variant="outline">
          <UiTable density="comfortable">
            <thead>
              <tr>
                <th class="text-center" style="width: 110px">Classificação</th>
                <th class="text-center" style="width: 70px">Foto</th>
                <th style="width: 95px">Número</th>
                <th>Candidato</th>
                <th class="text-right" style="width: 110px">Votos</th>
                <th class="text-right" style="width: 180px">Porcentagem</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="tally.candidatesRanking.length === 0">
                <td class="text-center text-medium-emphasis py-4" colspan="6">
                  Nenhum candidato registrado nesta eleição.
                </td>
              </tr>
              <tr v-for="item in tally.candidatesRanking" :key="item.candidate.id">
                <td class="text-center">
                  <UiChip
                    class="font-weight-bold"
                    :color="item.rank === 1 ? 'warning' : 'secondary'"
                    size="sm"
                    :variant="item.rank === 1 ? 'solid' : 'soft'"
                  >
                    {{ item.rank }}º Lugar
                  </UiChip>
                </td>
                <td class="text-center py-2">
                  <UiAvatar color="primary" size="42">
                    <img
                      v-if="item.candidate.photo_url"
                      :alt="item.candidate.name"
                      class="w-100 h-100"
                      :src="item.candidate.photo_url"
                      style="object-fit: cover"
                    />
                    <span v-else class="text-caption font-weight-bold">
                      {{ getInitials(item.candidate.name) }}
                    </span>
                  </UiAvatar>
                </td>
                <td>
                  <UiChip color="primary" label size="sm" variant="outlined">
                    {{ item.candidate.candidate_number }}
                  </UiChip>
                </td>
                <td class="font-weight-bold">{{ item.candidate.name }}</td>
                <td class="text-right font-weight-bold text-body-1">
                  {{ item.votesCount }} voto(s)
                </td>
                <td class="text-right">
                  <div class="font-weight-bold text-primary">
                    {{ formatPercentageBr(item.percentageOfValid) }} dos válidos
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ formatPercentageBr(item.percentageOfTotal) }} do total
                  </div>
                </td>
              </tr>
            </tbody>
          </UiTable>
        </UiCard>

        <!-- Registro Nominal de Votos (Eleição Não Anônima) -->
        <div
          v-if="election.is_anonymous === false"
          class="mb-4"
          data-testid="report-nominal-votes-section"
        >
          <div class="text-subtitle-2 font-weight-bold text-uppercase text-primary mb-2">
            Registro Nominal de Votos (Eleição Não Anônima)
          </div>
          <UiCard variant="outline">
            <UiTable density="compact">
              <thead>
                <tr>
                  <th style="width: 140px">Nº Título</th>
                  <th>Eleitor</th>
                  <th style="width: 240px">Voto Registrado</th>
                  <th class="text-center" style="width: 160px">Data / Horário</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="nominalVotes.length === 0">
                  <td class="text-center text-medium-emphasis py-4" colspan="4">
                    Nenhum voto registrado até o momento.
                  </td>
                </tr>
                <tr v-for="(nv, idx) in nominalVotes" :key="idx">
                  <td class="font-weight-bold font-monospace">{{ nv.voterRegistrationNumber }}</td>
                  <td class="font-weight-medium">{{ nv.voterName }}</td>
                  <td>
                    <UiChip color="primary" label size="xs" variant="tonal">
                      {{ nv.voteDescription }}
                    </UiChip>
                  </td>
                  <td class="text-center text-caption text-medium-emphasis">{{ nv.votedAt }}</td>
                </tr>
              </tbody>
            </UiTable>
          </UiCard>
        </div>
      </div>

      <!-- SEÇÃO DE ASSINATURAS DA COMISSÃO ELEITORAL -->
      <div class="text-subtitle-2 font-weight-bold text-uppercase text-primary mb-2">
        Comissão Eleitoral — Local para Assinatura
      </div>
      <UiCard class="pa-4" data-testid="report-committee-signatures" variant="outline">
        <UiAlert
          v-if="committee.length === 0"
          class="mb-4"
          color="warning"
          size="sm"
          variant="soft"
        >
          Nenhum membro da comissão eleitoral cadastrado. Adicione os membros e seus cargos na aba
          <strong>Comissão Eleitoral</strong> para que seus nomes saiam impressos abaixo das linhas
          de assinatura.
        </UiAlert>
        <p v-else class="text-caption text-medium-emphasis mb-4">
          Os membros da Comissão Eleitoral abaixo identificados conferiram e atestam a veracidade
          das informações deste relatório oficial:
        </p>

        <UiRow>
          <UiCol
            v-for="member in committee"
            :key="member.id"
            class="text-center py-4"
            cols="12"
            sm="6"
          >
            <div class="text-medium-emphasis mb-1" style="letter-spacing: -0.5px">
              __________________________________________
            </div>
            <div class="text-body-2 font-weight-bold">{{ member.name }}</div>
            <div class="text-caption text-medium-emphasis font-weight-medium">
              {{ member.role_name }}
            </div>
          </UiCol>
        </UiRow>
      </UiCard>
    </div>

    <template #actions>
      <UiButton variant="ghost" @click="isOpen = false">Fechar</UiButton>
      <UiButton
        color="secondary"
        data-testid="btn-download-report-pdf"
        :loading="isExporting"
        prepend-icon="download"
        variant="soft"
        @click="handleDownloadPdf"
      >
        Baixar PDF
      </UiButton>
      <UiButton
        color="primary"
        data-testid="btn-print-report"
        :loading="isPrinting"
        prepend-icon="printer"
        variant="solid"
        @click="handlePrint"
      >
        Imprimir Relatório
      </UiButton>
    </template>
  </UiModal>
</template>
