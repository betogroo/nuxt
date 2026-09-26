<script setup lang="ts">
  defineProps<{
    headers: Array<{ text: string; value: string; align?: 'left' | 'center' | 'right' }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: Array<any>
  }>()
</script>

<template>
  <v-table hover>
    <thead>
      <tr>
        <th
          v-for="header in headers"
          :key="header.value"
          :class="header.align ? `text-${header.align}` : 'text-left'"
        >
          {{ header.text }}
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="(item, index) in items" :key="item.id || Math.random()">
        <td
          v-for="header in headers"
          :key="header.value"
          :class="header.align ? `text-${header.align}` : 'text-left'"
        >
          <!-- Dynamic slot for custom cell rendering -->
          <slot :index="index" :item="item" :name="`item-${header.value}`">
            {{ item[header.value] }}
          </slot>
        </td>
      </tr>
      <tr v-if="!items || items.length === 0">
        <td class="text-center text-grey py-4" :colspan="headers.length">
          <slot name="empty"> Nenhum registro encontrado. </slot>
        </td>
      </tr>
    </tbody>
  </v-table>
</template>
