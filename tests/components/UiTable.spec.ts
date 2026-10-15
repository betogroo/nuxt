import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import UiTable from '~/components/ui/UiTable.vue'

const vuetify = createVuetify({ components, directives })

describe('UiTable', () => {
  const headers = [
    { text: 'Nome', value: 'name' },
    { text: 'Categoria', value: 'category' },
  ]
  const items = [
    { id: '1', name: 'Item 1', category: 'Cat A' },
    { id: '2', name: 'Item 2', category: 'Cat B' },
  ]

  it('renders headers and rows correctly', () => {
    const wrapper = mount(UiTable, {
      props: {
        headers,
        items,
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.text()).toContain('Nome')
    expect(wrapper.text()).toContain('Categoria')
    expect(wrapper.text()).toContain('Item 1')
    expect(wrapper.text()).toContain('Cat A')
    expect(wrapper.text()).toContain('Item 2')
    expect(wrapper.text()).toContain('Cat B')
  })

  it('defaults to density="compact" for smaller table rows', () => {
    const wrapper = mount(UiTable, {
      props: {
        headers,
        items,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vTable = wrapper.findComponent({ name: 'VTable' })
    expect(vTable.exists()).toBe(true)
    expect(vTable.props('density')).toBe('compact')
  })

  it('allows customizing density prop', () => {
    const wrapper = mount(UiTable, {
      props: {
        headers,
        items,
        density: 'comfortable',
      },
      global: {
        plugins: [vuetify],
      },
    })

    const vTable = wrapper.findComponent({ name: 'VTable' })
    expect(vTable.exists()).toBe(true)
    expect(vTable.props('density')).toBe('comfortable')
  })

  it('renders custom column slots correctly', () => {
    const wrapper = mount(UiTable, {
      props: {
        headers,
        items,
      },
      slots: {
        'item-name':
          '<template #item-name="{ item }"><span class="custom-name">Custom: {{ item.name }}</span></template>',
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.find('.custom-name').text()).toBe('Custom: Item 1')
  })

  it('renders loading skeleton rows when loading is true', () => {
    const wrapper = mount(UiTable, {
      props: {
        headers,
        items,
        loading: true,
      },
      global: {
        plugins: [vuetify],
      },
    })

    const skeletons = wrapper.findAllComponents({ name: 'VSkeletonLoader' })
    expect(skeletons.length).toBeGreaterThan(0)
    expect(wrapper.text()).not.toContain('Item 1')
  })

  it('renders empty state when items is empty', () => {
    const wrapper = mount(UiTable, {
      props: {
        headers,
        items: [],
      },
      global: {
        plugins: [vuetify],
      },
    })

    expect(wrapper.text()).toContain('Nenhum registro encontrado.')
  })
})
