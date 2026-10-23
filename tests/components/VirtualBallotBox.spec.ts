import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import VirtualBallotBox from '~/components/elections/VirtualBallotBox.vue'
import type { ElectionRow } from '~/types/election'
import type { CandidateRow } from '~/types/candidate'

describe('VirtualBallotBox Component', () => {
  let mockElection: ElectionRow
  let mockCandidates: CandidateRow[]

  const globalStubs = {
    UiIcon: { template: '<i class="ui-icon" />' },
  }

  const createWrapper = (propsOverrides = {}) => {
    return mount(VirtualBallotBox, {
      props: {
        election: mockElection,
        candidates: mockCandidates,
        ...propsOverrides,
      },
      global: {
        stubs: globalStubs,
      },
    })
  }

  beforeEach(() => {
    mockElection = {
      id: 'election-1',
      name: 'Diretor Presidente',
      election_date: '2026-11-15',
      digits_count: 2,
      is_uppercase: true,
      status: 'released',
      description: 'Eleição Geral',
      created_at: '2026-10-20T10:00:00Z',
      updated_at: '2026-10-20T10:00:00Z',
    }

    mockCandidates = [
      {
        id: 'cand-10',
        election_id: 'election-1',
        name: 'Carlos da Silva',
        candidate_number: '10',
        photo_url: 'https://example.com/carlos.jpg',
        created_at: '2026-10-20T10:00:00Z',
        updated_at: '2026-10-20T10:00:00Z',
      },
      {
        id: 'cand-20',
        election_id: 'election-1',
        name: 'Maria Oliveira',
        candidate_number: '20',
        photo_url: null,
        created_at: '2026-10-20T10:00:00Z',
        updated_at: '2026-10-20T10:00:00Z',
      },
    ]
  })

  it('renders cargo title and dynamic number of digit boxes', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('.cargo-title').text()).toBe('DIRETOR PRESIDENTE')
    const boxes = wrapper.findAll('.digit-box')
    expect(boxes).toHaveLength(2)
  })

  it('renders correct number of digit boxes when digits_count is 4', () => {
    mockElection.digits_count = 4
    const wrapper = createWrapper()

    const boxes = wrapper.findAll('.digit-box')
    expect(boxes).toHaveLength(4)
  })

  it('renders numeric keys 1-9 and 0 centered in the 4th row', () => {
    const wrapper = createWrapper()

    const numButtons = wrapper.findAll('.key-num')
    expect(numButtons).toHaveLength(10)

    const buttonTexts = numButtons.map((btn) => btn.text())
    expect(buttonTexts).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'])

    const spacers = wrapper.findAll('.key-spacer')
    expect(spacers).toHaveLength(2)
  })

  it('renders action buttons with correct action classes', () => {
    const wrapper = createWrapper()

    expect(wrapper.find('.key-branco').exists()).toBe(true)
    expect(wrapper.find('.key-corrige').exists()).toBe(true)
    expect(wrapper.find('.key-confirma').exists()).toBe(true)
  })

  it('types candidate number and displays candidate name and photo', async () => {
    const wrapper = createWrapper()

    // Click '1' then '0'
    const numButtons = wrapper.findAll('.key-num')
    const btn1 = numButtons.find((btn) => btn.text() === '1')!
    const btn0 = numButtons.find((btn) => btn.text() === '0')!

    await btn1.trigger('click')
    await btn0.trigger('click')

    expect(wrapper.text()).toContain('Carlos da Silva')
    const img = wrapper.find('.candidate-photo-img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBe('https://example.com/carlos.jpg')
  })

  it('displays candidate without photo with fallback label Sem Foto', async () => {
    const wrapper = createWrapper()

    // Click '2' then '0'
    const numButtons = wrapper.findAll('.key-num')
    const btn2 = numButtons.find((btn) => btn.text() === '2')!
    const btn0 = numButtons.find((btn) => btn.text() === '0')!

    await btn2.trigger('click')
    await btn0.trigger('click')

    expect(wrapper.text()).toContain('Maria Oliveira')
    expect(wrapper.text()).toContain('Sem Foto')
  })

  it('shows NÚMERO ERRADO and VOTO NULO when unassigned number is entered', async () => {
    const wrapper = createWrapper()

    // Click '9' then '9'
    const numButtons = wrapper.findAll('.key-num')
    const btn9 = numButtons.find((btn) => btn.text() === '9')!

    await btn9.trigger('click')
    await btn9.trigger('click')

    expect(wrapper.text()).toContain('Número Errado')
    expect(wrapper.text()).toContain('Voto Nulo')
  })

  it('activates VOTO EM BRANCO when BRANCO is pressed', async () => {
    const wrapper = createWrapper()

    await wrapper.find('.key-branco').trigger('click')

    expect(wrapper.text()).toContain('VOTO EM BRANCO')
    expect(wrapper.find('.digit-boxes').exists()).toBe(false)
  })

  it('clears entered numbers and resets state when CORRIGE is pressed', async () => {
    const wrapper = createWrapper()

    const btn1 = wrapper.findAll('.key-num').find((btn) => btn.text() === '1')!
    await btn1.trigger('click')

    expect(wrapper.findAll('.digit-box')[0].text()).toBe('1')

    await wrapper.find('.key-corrige').trigger('click')

    expect(wrapper.findAll('.digit-box')[0].text()).toBe('')
    expect(wrapper.text()).not.toContain('Carlos da Silva')
  })

  it('confirms vote for matched candidate, emits event and displays FIM', async () => {
    const wrapper = createWrapper()

    const btn1 = wrapper.findAll('.key-num').find((btn) => btn.text() === '1')!
    const btn0 = wrapper.findAll('.key-num').find((btn) => btn.text() === '0')!

    await btn1.trigger('click')
    await btn0.trigger('click')
    await wrapper.find('.key-confirma').trigger('click')

    expect(wrapper.emitted('vote-confirmed')).toBeTruthy()
    expect(wrapper.emitted('vote-confirmed')![0]).toEqual([
      {
        candidateId: 'cand-10',
        candidateNumber: '10',
        isBlank: false,
        isNull: false,
      },
    ])

    expect(wrapper.find('.display-fim').text()).toBe('FIM')
  })

  it('confirms blank vote, emits event and displays FIM', async () => {
    const wrapper = createWrapper()

    await wrapper.find('.key-branco').trigger('click')
    await wrapper.find('.key-confirma').trigger('click')

    expect(wrapper.emitted('vote-confirmed')![0]).toEqual([
      {
        isBlank: true,
        isNull: false,
      },
    ])
    expect(wrapper.find('.display-fim').text()).toBe('FIM')
  })

  it('confirms null vote when invalid number is entered', async () => {
    const wrapper = createWrapper()

    const btn9 = wrapper.findAll('.key-num').find((btn) => btn.text() === '9')!
    await btn9.trigger('click')
    await btn9.trigger('click')
    await wrapper.find('.key-confirma').trigger('click')

    expect(wrapper.emitted('vote-confirmed')![0]).toEqual([
      {
        candidateId: null,
        candidateNumber: '99',
        isBlank: false,
        isNull: true,
      },
    ])
    expect(wrapper.find('.display-fim').text()).toBe('FIM')
  })

  it('supports physical keyboard input (0-9, Backspace, Enter, B)', async () => {
    const wrapper = createWrapper()

    // Press '1' key
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.digit-box')[0].text()).toBe('1')

    // Press 'Backspace'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.digit-box')[0].text()).toBe('')

    // Press 'b'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.text()).toContain('VOTO EM BRANCO')

    // Press 'Enter'
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
    await wrapper.vm.$nextTick()
    expect(wrapper.emitted('vote-confirmed')).toBeTruthy()
    expect(wrapper.find('.display-fim').text()).toBe('FIM')
  })
})
