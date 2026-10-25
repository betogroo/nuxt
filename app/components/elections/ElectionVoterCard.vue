<script setup lang="ts">
  import { computed } from 'vue'
  import { formatCardDate } from '~/composables/useElectionVoterCards'
  import type { VoterCardItem } from '~/types/election-voter'

  const props = defineProps<{
    voter: VoterCardItem
  }>()

  const formattedDate = computed(() => formatCardDate(props.voter.issueDate))

  const validationCode = computed(() => {
    const rawNumber = props.voter.voter_registration_number || ''
    const hash = Array.from(rawNumber)
      .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000, 7)
      .toString()
      .padStart(4, '0')
    return `BR-${rawNumber}-${hash}`
  })
</script>

<template>
  <div class="voter-card-container">
    <div class="voter-card-wrapper">
      <div class="voter-card-inner">
        <!-- Header -->
        <div class="card-header">
          <div class="card-coat">
            <UiIcon color="primary" name="shieldUser" size="28" />
          </div>
          <div class="card-header-titles">
            <span class="country-title">República Federativa do Brasil</span>
            <span class="sub-title">Justiça Eleitoral &bull; Sistema Eleitoral</span>
            <span class="doc-title">TÍTULO ELEITORAL</span>
          </div>
        </div>

        <!-- Body -->
        <div class="card-body">
          <!-- Nome do Eleitor -->
          <div class="field-box field-full">
            <span class="field-label">NOME DO ELEITOR</span>
            <span class="field-value voter-name text-truncate">{{ voter.name }}</span>
          </div>

          <!-- Inscrição & Data de Emissão -->
          <div class="card-row">
            <div class="field-box field-half">
              <span class="field-label">Nº DA INSCRIÇÃO</span>
              <span class="field-value font-monospace text-primary voter-num">{{
                voter.voter_registration_number
              }}</span>
            </div>

            <div class="field-box field-half">
              <span class="field-label">DATA DE EMISSÃO</span>
              <span class="field-value font-weight-bold">{{ formattedDate }}</span>
            </div>
          </div>

          <!-- Situação & Validação -->
          <div class="card-row">
            <div class="field-box field-half">
              <span class="field-label">SITUAÇÃO CADASTRAL</span>
              <span
                class="field-value font-weight-bold"
                :class="voter.is_active ? 'text-success' : 'text-error'"
              >
                {{ voter.is_active ? 'REGULAR / APTO' : 'INATIVO' }}
              </span>
            </div>

            <div class="field-box field-half">
              <span class="field-label">CÓDIGO DE VALIDAÇÃO</span>
              <span class="field-value font-monospace text-caption">{{ validationCode }}</span>
            </div>
          </div>
        </div>

        <!-- Barcode Simulation -->
        <div class="barcode-container">
          <div class="barcode-bars">
            <span class="b-bar b-2" />
            <span class="b-bar b-1" />
            <span class="b-bar b-3" />
            <span class="b-bar b-1" />
            <span class="b-bar b-4" />
            <span class="b-bar b-2" />
            <span class="b-bar b-1" />
            <span class="b-bar b-3" />
            <span class="b-bar b-2" />
            <span class="b-bar b-1" />
            <span class="b-bar b-4" />
            <span class="b-bar b-2" />
            <span class="b-bar b-1" />
            <span class="b-bar b-3" />
            <span class="b-bar b-1" />
            <span class="b-bar b-2" />
            <span class="b-bar b-4" />
            <span class="b-bar b-1" />
            <span class="b-bar b-3" />
            <span class="b-bar b-2" />
            <span class="b-bar b-1" />
            <span class="b-bar b-4" />
            <span class="b-bar b-2" />
            <span class="b-bar b-3" />
          </div>
        </div>

        <!-- Footer -->
        <div class="card-footer">
          <span>
            Documento oficial de identificação do eleitor para votação nas urnas eletrônicas do
            sistema.
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .voter-card-container {
    display: inline-block;
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
  }

  .voter-card-wrapper {
    background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #fefce8 100%);
    border: 2px solid #059669;
    border-radius: 8px;
    padding: 10px;
    box-shadow:
      0 4px 6px -1px rgba(0, 0, 0, 0.1),
      0 2px 4px -2px rgba(0, 0, 0, 0.1);
  }

  .voter-card-inner {
    border: 1.5px solid #10b981;
    border-radius: 6px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.9);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .card-header {
    display: flex;
    align-items: center;
    border-bottom: 2px solid #059669;
    padding-bottom: 8px;
    gap: 8px;
  }

  .card-coat {
    flex-shrink: 0;
  }

  .card-header-titles {
    display: flex;
    flex-direction: column;
    text-align: center;
    flex: 1;
  }

  .country-title {
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    color: #065f46;
    letter-spacing: 0.5px;
  }

  .sub-title {
    font-size: 0.55rem;
    font-weight: 600;
    text-transform: uppercase;
    color: #047857;
  }

  .doc-title {
    font-size: 0.85rem;
    font-weight: 900;
    color: #064e3b;
    letter-spacing: 1px;
    margin-top: 1px;
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .card-row {
    display: flex;
    gap: 6px;
  }

  .field-box {
    background: #ffffff;
    border: 1px solid #a7f3d0;
    border-radius: 4px;
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
  }

  .field-full {
    width: 100%;
  }

  .field-half {
    flex: 1;
  }

  .field-label {
    font-size: 0.55rem;
    font-weight: 700;
    color: #047857;
    letter-spacing: 0.3px;
  }

  .field-value {
    font-size: 0.8rem;
    color: #0f172a;
    line-height: 1.2;
  }

  .voter-name {
    font-weight: 700;
    color: #064e3b;
  }

  .voter-num {
    font-size: 0.9rem;
    font-weight: 800;
  }

  .barcode-container {
    background: #ffffff;
    border: 1px dashed #a7f3d0;
    border-radius: 4px;
    padding: 6px 0;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .barcode-bars {
    display: flex;
    align-items: center;
    height: 22px;
    gap: 2px;
  }

  .b-bar {
    height: 100%;
    background-color: #0f172a;
  }

  .b-1 {
    width: 1.5px;
  }
  .b-2 {
    width: 3px;
  }
  .b-3 {
    width: 4.5px;
  }
  .b-4 {
    width: 6px;
  }

  .card-footer {
    border-top: 1px solid #a7f3d0;
    padding-top: 4px;
    text-align: center;
    font-size: 0.55rem;
    font-weight: 600;
    color: #065f46;
  }
</style>
