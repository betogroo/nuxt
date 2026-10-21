import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import BallotBoxCard from '~/components/elections/BallotBoxCard.vue'
import type { BallotBoxRow } from '~/types/ballot-box'

describe('BallotBoxCard Component', () => {
  const mockBoxActive: BallotBoxRow = {
    id: 'box-1',
    election_id: 'elec-1',
    name: 'Urna 01 - Tablet Hall',
    device_info: 'Samsung Galaxy Tab A9',
    is_active: true,
    created_by: 'user-1',
    deleted_at: null,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  }

  const mockBoxInactive: BallotBoxRow = {
    ...mockBoxActive,
    id: 'box-2',
    name: 'Urna 02 - PC Sala 1',
    is_active: false,
  }

  it('renders active ballot box with success indicator and enabled open terminal button', () => {
    const wrapper = mount(BallotBoxCard, {
      props: {
        ballotBox: mockBoxActive,
        canManage: true,
      },
      global: {
        stubs: {
          UiCard: { template: '<div><slot /></div>' },
          UiAvatar: { template: '<div><slot /></div>' },
          UiIcon: true,
          UiChip: { template: '<span class="chip"><slot /></span>' },
          UiButton: {
            template:
              '<button :disabled="$attrs.disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Urna 01 - Tablet Hall')
    expect(wrapper.text()).toContain('Samsung Galaxy Tab A9')
    expect(wrapper.text()).toContain('Ativa')
    expect(wrapper.text()).toContain('Pronta para receber votos')
  })

  it('renders inactive ballot box with error indicator and disabled terminal button', () => {
    const wrapper = mount(BallotBoxCard, {
      props: {
        ballotBox: mockBoxInactive,
        canManage: true,
      },
      global: {
        stubs: {
          UiCard: { template: '<div><slot /></div>' },
          UiAvatar: { template: '<div><slot /></div>' },
          UiIcon: true,
          UiChip: { template: '<span class="chip"><slot /></span>' },
          UiButton: {
            template:
              '<button :disabled="$attrs.disabled" @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    expect(wrapper.text()).toContain('Urna 02 - PC Sala 1')
    expect(wrapper.text()).toContain('Desativada')
    expect(wrapper.text()).toContain('Votação pausada / bloqueada')
  })

  it('emits toggle event when activation button is clicked', async () => {
    const wrapper = mount(BallotBoxCard, {
      props: {
        ballotBox: mockBoxInactive,
        canManage: true,
      },
      global: {
        stubs: {
          UiCard: { template: '<div><slot /></div>' },
          UiAvatar: { template: '<div><slot /></div>' },
          UiIcon: true,
          UiChip: true,
          UiButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    const buttons = wrapper.findAll('button')
    // Find toggle button (text 'Ativar')
    const toggleBtn = buttons.find((b) => b.text().includes('Ativar'))
    expect(toggleBtn).toBeDefined()
    await toggleBtn?.trigger('click')

    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')?.[0]).toEqual([mockBoxInactive, true])
  })

  it('emits openTerminal event when terminal button is clicked', async () => {
    const wrapper = mount(BallotBoxCard, {
      props: {
        ballotBox: mockBoxActive,
        canManage: true,
      },
      global: {
        stubs: {
          UiCard: { template: '<div><slot /></div>' },
          UiAvatar: { template: '<div><slot /></div>' },
          UiIcon: true,
          UiChip: true,
          UiButton: {
            template: '<button @click="$emit(\'click\')"><slot /></button>',
          },
        },
      },
    })

    const terminalBtn = wrapper.findAll('button').find((b) => b.text().includes('Abrir Terminal'))
    expect(terminalBtn).toBeDefined()
    await terminalBtn?.trigger('click')

    expect(wrapper.emitted('openTerminal')).toBeTruthy()
    expect(wrapper.emitted('openTerminal')?.[0]).toEqual([mockBoxActive])
  })
})
