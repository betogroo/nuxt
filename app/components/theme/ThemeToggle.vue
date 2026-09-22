<script setup lang="ts">
  const { isDark, toggle, init } = useThemeManager()
  onMounted(() => {
    init()
  })
</script>

<template>
  <v-icon-btn
    :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
    :icon="isDark ? 'mdi-weather-sunny' : 'mdi-weather-night'"
    variant="text"
    @click="toggle"
  />
</template>
