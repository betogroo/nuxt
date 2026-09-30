const fs = require('fs');
let s = fs.readFileSync('tests/pages/products/index.spec.ts', 'utf8');
const testCode = \
  it('should render the Add button as the rightmost element in the header', () => {
    const wrapper = mount(ProductsPage, {
      global: {
        stubs: {
          PageHeader: true,
          UiCard: false,
          UiTable: true,
          UiButton: false, // Don't stub UiButton so we can read its text
          UiModal: true,
          UiInput: true,
          UiSelect: true,
          UiChip: true,
          UiAlert: true,
          'v-row': true,
          'v-col': true,
          'v-spacer': true,
          'v-pagination': true,
          'v-tooltip': true,
          'v-autocomplete': true,
          'v-icon': true,
          'v-chip': true,
          'v-select': true,
          'v-divider': true,
          'v-switch': true,
          'v-btn': false,
          NuxtLink: true,
        },
      },
    })
    
    const headerFlex = wrapper.find('.d-flex.gap-2.align-center')
    expect(headerFlex.exists()).toBe(true)
    const children = headerFlex.element.children
    const lastChild = children[children.length - 1]
    
    // Convert to lowercase since custom components might render as ui-button or v-btn depending on stubs
    expect(lastChild.tagName.toLowerCase()).toContain('button')
    expect(lastChild.textContent).toContain('Novo Produto')
  })
\
s = s.replace(/}\)\s*$/, testCode + '\n})')
fs.writeFileSync('tests/pages/products/index.spec.ts', s, 'utf8');
