import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DemandProductClassBalanceCard from '~/components/demands/DemandProductClassBalanceCard.vue'
import type { SingleClassBalanceResult } from '~/utils/demandClassBalanceTable'

describe('DemandProductClassBalanceCard Component', () => {
  const commonStubs = {
    UiCard: {
      template: '<div class="ui-card"><slot /></div>',
    },
    UiAlert: {
      template: '<div class="ui-alert"><slot /></div>',
    },
    UiChip: {
      template: '<span class="ui-chip"><slot /></span>',
    },
    UiIcon: {
      template: '<i class="ui-icon" />',
    },
    UiProgressCircular: {
      template: '<div class="ui-progress-circular" />',
    },
  }

  it('renders loading state when loading prop is true', () => {
    const wrapper = mount(DemandProductClassBalanceCard, {
      props: {
        loading: true,
      },
      global: { stubs: commonStubs },
    })

    expect(wrapper.text()).toContain('Consultando saldo da classe do produto...')
  })

  it('renders informative message when product has no linked class', () => {
    const balance: SingleClassBalanceResult = {
      classId: '',
      className: 'Sem classe vinculada',
      hasLinkedClass: false,
      year: 2026,
      ceilingAmount: 50000,
      isCeilingConfigured: true,
      committedInOtherDemands: 0,
      currentDemandAmount: 0,
      currentBalance: 0,
      additionAmount: 0,
      projectedBalance: 0,
      isExceededCurrently: false,
      willExceedWithAddition: false,
    }

    const wrapper = mount(DemandProductClassBalanceCard, {
      props: { balance, loading: false },
      global: { stubs: commonStubs },
    })

    expect(wrapper.text()).toContain(
      'Este produto não possui classe de material vinculada no catálogo',
    )
  })

  it('renders class balance details and projections correctly', () => {
    const balance: SingleClassBalanceResult = {
      classId: '7530',
      className: 'Papelaria e Papel',
      hasLinkedClass: true,
      year: 2026,
      ceilingAmount: 65492.11,
      isCeilingConfigured: true,
      committedInOtherDemands: 12000,
      currentDemandAmount: 3000,
      currentBalance: 50492.11,
      additionAmount: 500,
      projectedBalance: 49992.11,
      isExceededCurrently: false,
      willExceedWithAddition: false,
    }

    const wrapper = mount(DemandProductClassBalanceCard, {
      props: { balance, loading: false },
      global: { stubs: commonStubs },
    })

    expect(wrapper.text()).toContain('Classe 7530')
    expect(wrapper.text()).toContain('Papelaria e Papel')
    expect(wrapper.text()).toContain('Teto anual (2026):')
    expect(wrapper.text()).toContain('Empenhado em outras')
    expect(wrapper.text()).toContain('Nesta demanda')
    expect(wrapper.text()).toContain('Saldo Disponível')
    expect(wrapper.text()).toContain('Impacto deste item:')
    expect(wrapper.text()).toContain('Saldo após inserir:')
    expect(wrapper.find('.text-error').exists()).toBe(false)
  })

  it('renders warning alert when projected balance will exceed annual ceiling', () => {
    const balance: SingleClassBalanceResult = {
      classId: '7530',
      className: 'Papelaria e Papel',
      hasLinkedClass: true,
      year: 2026,
      ceilingAmount: 5000,
      isCeilingConfigured: true,
      committedInOtherDemands: 3000,
      currentDemandAmount: 1500,
      currentBalance: 500,
      additionAmount: 1200,
      projectedBalance: -700,
      isExceededCurrently: false,
      willExceedWithAddition: true,
    }

    const wrapper = mount(DemandProductClassBalanceCard, {
      props: { balance, loading: false },
      global: { stubs: commonStubs },
    })

    expect(wrapper.text()).toContain('Atenção: A inclusão deste item ultrapassará o teto da classe')
    expect(wrapper.find('.text-error').exists()).toBe(true)
  })
})
