<script setup lang="ts">
  import { computed } from 'vue'
  import type { UiColor, UiSize, UiVariant } from '~/types/ui'
  import type { IconName } from './icons'

  defineOptions({ inheritAttrs: false })

  const props = withDefaults(
    defineProps<{
      action?: ActionButtonType
      icon?: IconName | string
      tooltip?: string
      tooltipLocation?: 'top' | 'bottom' | 'start' | 'end' | 'left' | 'right'
      color?: UiColor
      size?: UiSize
      variant?: UiVariant
      disabled?: boolean
      loading?: boolean
      to?: string | Record<string, unknown>
    }>(),
    {
      action: 'custom',
      icon: undefined,
      tooltip: undefined,
      tooltipLocation: 'top',
      color: undefined,
      size: 'sm',
      variant: 'ghost',
      disabled: false,
      loading: false,
      to: undefined,
    },
  )

  const emit = defineEmits<{
    click: [e: MouseEvent]
  }>()

  export type ActionButtonType =
    | 'edit'
    | 'delete'
    | 'view'
    | 'copy'
    | 'refresh'
    | 'classify'
    | 'disqualify'
    | 'moveUp'
    | 'moveDown'
    | 'custom'

  interface ActionConfig {
    icon: string
    tooltip: string
    color: UiColor
  }

  const actionPresets: Record<Exclude<ActionButtonType, 'custom'>, ActionConfig> = {
    edit: {
      icon: 'editOutline',
      tooltip: 'Editar',
      color: 'primary',
    },
    delete: {
      icon: 'deleteOutline',
      tooltip: 'Excluir',
      color: 'error',
    },
    view: {
      icon: 'next',
      tooltip: 'Visualizar',
      color: 'primary',
    },
    copy: {
      icon: 'copy',
      tooltip: 'Duplicar',
      color: 'info',
    },
    refresh: {
      icon: 'refresh',
      tooltip: 'Atualizar lista',
      color: 'secondary',
    },
    classify: {
      icon: 'check',
      tooltip: 'Classificar Lance',
      color: 'success',
    },
    disqualify: {
      icon: 'close',
      tooltip: 'Desclassificar Lance',
      color: 'warning',
    },
    moveUp: {
      icon: 'chevronUp',
      tooltip: 'Mover para cima',
      color: 'default',
    },
    moveDown: {
      icon: 'chevronDown',
      tooltip: 'Mover para baixo',
      color: 'default',
    },
  }

  const resolvedIcon = computed(() => {
    if (props.icon) return props.icon
    if (props.action !== 'custom' && actionPresets[props.action]) {
      return actionPresets[props.action].icon
    }
    return 'circle'
  })

  const resolvedTooltip = computed(() => {
    if (props.tooltip !== undefined) return props.tooltip
    if (props.action !== 'custom' && actionPresets[props.action]) {
      return actionPresets[props.action].tooltip
    }
    return undefined
  })

  const resolvedColor = computed(() => {
    if (props.color) return props.color
    if (props.action !== 'custom' && actionPresets[props.action]) {
      return actionPresets[props.action].color
    }
    return 'default'
  })

  const handleClick = (e: MouseEvent) => {
    e.stopPropagation()
    emit('click', e)
  }
</script>

<template>
  <UiButton
    :color="resolvedColor"
    :disabled="disabled"
    :icon="resolvedIcon"
    :loading="loading"
    :size="size"
    :to="to"
    :tooltip="resolvedTooltip"
    :tooltip-location="tooltipLocation"
    :variant="variant"
    v-bind="$attrs"
    @click.stop="handleClick"
  >
    <template v-for="(_, slot) in $slots" #[slot]="scope">
      <slot :name="slot" v-bind="scope || {}" />
    </template>
  </UiButton>
</template>
