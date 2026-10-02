<script setup lang="ts">
  const { isDark, toggle, init } = useThemeManager()
  onMounted(() => {
    init()
  })
</script>

<template>
  <UiButton
    :aria-label="isDark ? 'Ativar tema claro' : 'Ativar tema escuro'"
    :icon="isDark ? 'sun' : 'moon'"
    variant="text"
    @click="toggle"
  />
</template>
