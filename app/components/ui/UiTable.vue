<script setup lang="ts">
  defineProps<{
    headers: Array<{
      text: string
      value: string
      align?: 'left' | 'center' | 'right'
      sortable?: boolean
    }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: Array<any>
    loading?: boolean
  }>()
</script>

<template>
  <v-table class="ui-table" hover>
    <thead>
      <tr>
        <th
          v-for="header in headers"
          :key="header.value"
          :class="[
            'text-caption text-uppercase font-weight-bold text-medium-emphasis py-3',
            header.align ? `text-${header.align}` : 'text-left',
          ]"
        >
          {{ header.text }}
        </th>
      </tr>
    </thead>
    <tbody>
      <!-- Loading skeleton rows -->
      <template v-if="loading">
        <tr v-for="n in 5" :key="`skel-${n}`">
          <td v-for="header in headers" :key="header.value" class="py-3">
            <v-skeleton-loader type="text" width="80%" />
          </td>
        </tr>
      </template>

      <template v-else>
        <tr v-for="(item, index) in items" :key="item.id ?? index" class="ui-table__row">
          <td
            v-for="header in headers"
            :key="header.value"
            :class="['py-3', header.align ? `text-${header.align}` : 'text-left']"
          >
            <slot :index="index" :item="item" :name="`item-${header.value}`">
              {{ item[header.value] }}
            </slot>
          </td>
        </tr>

        <!-- Empty state -->
        <tr v-if="!items || items.length === 0">
          <td class="py-10" :colspan="headers.length">
            <div class="d-flex flex-column align-center text-medium-emphasis">
              <UiIcon class="mb-3" name="databaseSearch" size="40" />
              <slot name="empty">Nenhum registro encontrado.</slot>
            </div>
          </td>
        </tr>
      </template>
    </tbody>
  </v-table>
</template>

<style scoped>
  .ui-table thead tr {
    border-bottom: 2px solid rgba(var(--v-border-color), 0.12);
  }

  .ui-table__row {
    transition: background-color 0.15s ease;
  }
</style>
