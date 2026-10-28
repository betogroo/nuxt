<script setup lang="ts">
  import { onMounted, onUnmounted } from 'vue'
  import type { ElectionRow } from '~/types/election'
  import type { CandidateRow } from '~/types/candidate'
  import { useVirtualBallot, type VoteConfirmedPayload } from '~/composables/useVirtualBallot'

  const props = withDefaults(
    defineProps<{
      election: ElectionRow
      candidates: CandidateRow[]
      disabled?: boolean
    }>(),
    {
      disabled: false,
    },
  )

  const emit = defineEmits<{
    (e: 'vote-confirmed', payload: VoteConfirmedPayload): void
    (e: 'vote-cycle-completed'): void
  }>()

  const {
    digits,
    isBlankVote,
    isVoteFinished,
    digitsCount,
    cargoTitle,
    matchedCandidate,
    isNullVote,
    pressDigit,
    pressCorrige,
    pressBranco,
    pressConfirma,
    resetUrna,
    handleKeyDown,
    cleanup,
  } = useVirtualBallot({
    election: () => props.election,
    candidates: () => props.candidates,
    disabled: () => props.disabled,
    onVoteConfirmed: (payload) => emit('vote-confirmed', payload),
    onVoteCycleCompleted: () => emit('vote-cycle-completed'),
  })

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown)
    cleanup()
  })

  defineExpose({
    digits,
    isBlankVote,
    isVoteFinished,
    pressDigit,
    pressCorrige,
    pressBranco,
    pressConfirma,
    resetUrna,
  })
</script>

<template>
  <div class="virtual-ballot-box-wrapper d-flex justify-center align-center w-100 pa-2">
    <!-- Gabinete da Urna -->
    <div class="ballot-box-cabinet elevation-8 rounded-lg overflow-hidden">
      <!-- Divisão Horizontal: Display (Esquerda) e Teclado (Direita) -->
      <div class="cabinet-body d-flex flex-column flex-md-row">
        <!-- DISPLAY DA URNA (Lado Esquerdo) -->
        <div
          class="display-section flex-grow-1 pa-4 pa-sm-6 d-flex flex-column justify-space-between"
        >
          <!-- TELA DE FIM (Pós-Voto) -->
          <div
            v-if="isVoteFinished"
            class="finish-screen fill-height d-flex flex-column align-center justify-center text-center py-10"
          >
            <h1 class="display-fim font-weight-black mb-2">FIM</h1>
            <p
              class="text-subtitle-1 font-weight-bold text-uppercase tracking-wider text-grey-darken-2"
            >
              Voto Gravado com Sucesso
            </p>
            <span class="text-caption text-medium-emphasis mt-4">
              Aguardando próximo eleitor...
            </span>
          </div>

          <!-- TELA NORMAL DE VOTAÇÃO -->
          <template v-else>
            <div class="display-header mb-4">
              <span
                class="text-caption font-weight-medium text-grey-darken-1 text-uppercase tracking-wide"
              >
                Seu voto para
              </span>
              <h2
                class="cargo-title text-h5 font-weight-bold line-height-tight mt-1 text-grey-darken-4"
              >
                {{ cargoTitle }}
              </h2>
            </div>

            <!-- CORPO DO DISPLAY -->
            <div class="display-main d-flex flex-row justify-space-between align-start ga-4 mb-4">
              <!-- ÁREA ESQUERDA DO DISPLAY (Dígitos, Nome, Avisos) -->
              <div class="candidate-info-area flex-grow-1">
                <!-- CASO: VOTO EM BRANCO -->
                <div v-if="isBlankVote" class="blank-vote-message py-6">
                  <div class="text-h4 font-weight-black text-grey-darken-3 blink-text">
                    VOTO EM BRANCO
                  </div>
                </div>

                <!-- CASO NORMAL: NÚMEROS E CANDIDATO -->
                <template v-else>
                  <!-- Linha do Número / Dígitos -->
                  <div class="number-row d-flex align-center ga-3 mb-4">
                    <span class="text-subtitle-1 font-weight-medium text-grey-darken-2"
                      >Número:</span
                    >
                    <div class="digit-boxes d-flex align-center ga-2">
                      <div
                        v-for="index in digitsCount"
                        :key="index"
                        class="digit-box d-flex align-center justify-center font-weight-bold"
                        :class="{
                          'digit-active': digits.length === index - 1,
                          'digit-filled': digits.length >= index,
                        }"
                      >
                        {{ digits[index - 1] || '' }}
                      </div>
                    </div>
                  </div>

                  <!-- Dados do Candidato Localizado -->
                  <div v-if="matchedCandidate" class="matched-candidate-data animate-fade-in">
                    <div class="d-flex flex-column ga-1 text-body-1">
                      <div>
                        <span class="text-grey-darken-1 font-weight-medium">Nome: </span>
                        <strong class="text-grey-darken-4 text-h6">{{
                          matchedCandidate.name
                        }}</strong>
                      </div>
                      <div class="text-caption text-medium-emphasis">
                        Número Oficial: {{ matchedCandidate.candidate_number }}
                      </div>
                    </div>
                  </div>

                  <!-- Mensagem de Voto Nulo / Número Errado -->
                  <div v-else-if="isNullVote" class="null-vote-message animate-fade-in py-2">
                    <div class="text-subtitle-1 font-weight-black text-error text-uppercase">
                      Número Errado
                    </div>
                    <div
                      class="text-h5 font-weight-black text-error text-uppercase blink-text mt-1"
                    >
                      Voto Nulo
                    </div>
                  </div>
                </template>
              </div>

              <!-- ÁREA DIREITA DO DISPLAY (Foto do Candidato) -->
              <div class="candidate-photo-container d-flex flex-column align-center">
                <div
                  class="candidate-photo-box elevation-1 rounded overflow-hidden bg-grey-lighten-3 d-flex align-center justify-center"
                >
                  <img
                    v-if="matchedCandidate && matchedCandidate.photo_url"
                    :alt="matchedCandidate.name"
                    class="candidate-photo-img"
                    :src="matchedCandidate.photo_url"
                  />
                  <div
                    v-else-if="matchedCandidate"
                    class="d-flex flex-column align-center text-medium-emphasis"
                  >
                    <UiIcon name="userOutline" size="64" />
                    <span class="text-caption mt-1 font-weight-bold">Sem Foto</span>
                  </div>
                  <div
                    v-else
                    class="photo-placeholder d-flex flex-column align-center text-grey-lighten-1"
                  >
                    <UiIcon name="userOutline" size="64" />
                    <span class="text-caption mt-1">Foto</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- RODAPÉ DE INSTRUÇÕES (TSE Style) -->
            <div class="display-footer pt-3 border-t">
              <div class="text-caption text-grey-darken-2 line-height-tight">
                <p class="mb-1 font-weight-medium">Aperte a tecla:</p>
                <div class="d-flex flex-column ga-1 pl-2">
                  <div class="d-flex align-center ga-1">
                    <strong class="text-success font-weight-black">VERDE</strong>
                    <span>para CONFIRMAR este voto</span>
                  </div>
                  <div class="d-flex align-center ga-1">
                    <strong class="text-orange-darken-3 font-weight-black">LARANJA</strong>
                    <span>para REINICIAR este voto</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- PAINEL DO TECLADO (Lado Direito) -->
        <div class="keypad-section pa-4 pa-sm-6 bg-slate-900 d-flex flex-column">
          <!-- Cabeçalho do Teclado da Justiça Eleitoral -->
          <div class="keypad-header d-flex align-center justify-center ga-2 mb-4 text-center">
            <UiIcon color="amber" name="vote" size="24" />
            <div
              class="text-subtitle-2 font-weight-black text-grey-lighten-1 tracking-wider text-uppercase"
            >
              Justiça Eleitoral
            </div>
          </div>

          <!-- Teclado Numérico e Botões de Ação lado a lado -->
          <div class="keypad-controls d-flex flex-row ga-3 justify-center">
            <!-- Grid Numérico 3x4 (1-9 e 0 no meio) -->
            <div class="numeric-grid">
              <button
                v-for="num in ['1', '2', '3', '4', '5', '6', '7', '8', '9']"
                :key="num"
                class="key-btn key-num"
                type="button"
                @click="pressDigit(num)"
              >
                {{ num }}
              </button>

              <!-- 4ª Linha: Vazio, Tecla 0 centralizada, Vazio -->
              <div class="key-spacer" />
              <button class="key-btn key-num" type="button" @click="pressDigit('0')">0</button>
              <div class="key-spacer" />
            </div>

            <!-- Coluna de Ações (Branco 1/4, Corrige 1/4, Confirma 2/4) -->
            <div class="actions-column d-flex flex-column ga-2">
              <button class="key-btn key-action key-branco" type="button" @click="pressBranco">
                BRANCO
              </button>
              <button class="key-btn key-action key-corrige" type="button" @click="pressCorrige">
                CORRIGE
              </button>
              <button class="key-btn key-action key-confirma" type="button" @click="pressConfirma">
                CONFIRMA
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  /* Moldura e Gabinete */
  .ballot-box-cabinet {
    width: 100%;
    max-width: 960px;
    background-color: #f1f5f9;
    border: 3px solid #cbd5e1;
    box-shadow: 0 16px 32px rgba(15, 23, 42, 0.2);
  }

  /* Seção Display (LCD da Urna) */
  .display-section {
    background-color: #f8fafc;
    border-right: 3px solid #cbd5e1;
    min-height: 400px;
    position: relative;
  }

  .cargo-title {
    letter-spacing: 0.5px;
    color: #1e293b;
  }

  /* Caixas de Dígitos */
  .digit-boxes {
    min-height: 56px;
  }

  .digit-box {
    width: 44px;
    height: 56px;
    border: 2px solid #64748b;
    background-color: #ffffff;
    font-size: 2rem;
    color: #0f172a;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .digit-active {
    border-color: #0f172a;
    position: relative;
  }

  .digit-active::after {
    content: '';
    position: absolute;
    bottom: 8px;
    width: 24px;
    height: 3px;
    background-color: #0f172a;
    animation: blink 0.9s infinite step-end;
  }

  @keyframes blink {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0;
    }
  }

  .blink-text {
    animation: blink 1.2s infinite ease-in-out;
  }

  /* Foto do Candidato (3x4) */
  .candidate-photo-box {
    width: 135px;
    height: 180px;
    border: 2px solid #94a3b8;
    background-color: #e2e8f0;
  }

  .candidate-photo-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Tela FIM */
  .display-fim {
    font-size: 5rem;
    line-height: 1;
    color: #0f172a;
    letter-spacing: 4px;
  }

  /* Seção do Teclado (Dark Panel) */
  .keypad-section {
    background-color: #1e293b;
    min-width: 320px;
    user-select: none;
  }

  .bg-slate-900 {
    background-color: #0f172a;
  }

  /* Teclado Numérico Grid 3x4 */
  .numeric-grid {
    display: grid;
    grid-template-columns: repeat(3, 62px);
    grid-template-rows: repeat(4, 52px);
    gap: 10px;
    justify-content: center;
  }

  .key-spacer {
    width: 62px;
    height: 52px;
  }

  /* Botões Comuns com Efeito 3D */
  .key-btn {
    border: none;
    border-radius: 4px;
    font-family: inherit;
    cursor: pointer;
    font-weight: bold;
    outline: none;
    transition:
      transform 0.05s ease,
      box-shadow 0.05s ease,
      filter 0.05s ease;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .key-btn:active {
    transform: translateY(2px);
  }

  /* Teclas Numéricas */
  .key-num {
    width: 62px;
    height: 52px;
    background-color: #27272a;
    color: #ffffff;
    font-size: 1.4rem;
    box-shadow:
      0 4px 0 #09090b,
      0 5px 6px rgba(0, 0, 0, 0.4);
  }

  .key-num:active {
    box-shadow:
      0 2px 0 #09090b,
      0 3px 4px rgba(0, 0, 0, 0.4);
  }

  /* Coluna de Ações com proporções 1/4, 1/4 e 2/4 */
  .actions-column {
    width: 100px;
    /* Altura total = (4 linhas * 52px) + (3 gaps * 10px) = 238px */
    height: 238px;
  }

  .key-action {
    width: 100%;
    font-size: 0.8rem;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }

  /* BRANCO: 1/4 da altura (menos proporcional ao gap) */
  .key-branco {
    flex: 1;
    background-color: #ffffff;
    color: #000000;
    box-shadow:
      0 4px 0 #94a3b8,
      0 5px 6px rgba(0, 0, 0, 0.3);
  }

  .key-branco:active {
    box-shadow:
      0 2px 0 #94a3b8,
      0 3px 4px rgba(0, 0, 0, 0.3);
  }

  /* CORRIGE: 1/4 da altura */
  .key-corrige {
    flex: 1;
    background-color: #ea580c;
    color: #000000;
    box-shadow:
      0 4px 0 #9a3412,
      0 5px 6px rgba(0, 0, 0, 0.3);
  }

  .key-corrige:active {
    box-shadow:
      0 2px 0 #9a3412,
      0 3px 4px rgba(0, 0, 0, 0.3);
  }

  /* CONFIRMA: 2/4 (50%) da altura total */
  .key-confirma {
    flex: 2;
    background-color: #16a34a;
    color: #000000;
    font-size: 0.95rem;
    box-shadow:
      0 5px 0 #14532d,
      0 6px 8px rgba(0, 0, 0, 0.4);
  }

  .key-confirma:active {
    box-shadow:
      0 2px 0 #14532d,
      0 3px 4px rgba(0, 0, 0, 0.4);
  }

  .animate-fade-in {
    animation: fadeIn 0.25s ease-in-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Responsividade */
  @media (max-width: 600px) {
    .numeric-grid {
      grid-template-columns: repeat(3, 50px);
      grid-template-rows: repeat(4, 44px);
      gap: 6px;
    }
    .key-num,
    .key-spacer {
      width: 50px;
      height: 44px;
    }
    .actions-column {
      width: 80px;
      height: 194px;
    }
    .key-action {
      font-size: 0.7rem;
    }
    .candidate-photo-box {
      width: 105px;
      height: 140px;
    }
  }
</style>
