import { ref, computed, type Ref, nextTick } from 'vue'
import type { IncidentParticipantInput } from '~/types/school'

export type MentionTriggerType = 'offender' | 'victim'

export interface MentionTriggerMatch {
  type: MentionTriggerType
  triggerChar: '@' | '/'
  triggerIndex: number
  query: string
}

/**
 * Detects whether the current cursor position in the text is preceded by an active mention trigger (@ or /).
 * Prevents false positives like email addresses (user@domain.com) and dates (20/11/2026).
 */
export function detectMentionTrigger(text: string, cursor: number): MentionTriggerMatch | null {
  if (!text || cursor < 1 || cursor > text.length) return null

  const textBeforeCursor = text.slice(0, cursor)
  const lastAt = textBeforeCursor.lastIndexOf('@')
  const lastSlash = textBeforeCursor.lastIndexOf('/')
  const triggerIndex = Math.max(lastAt, lastSlash)

  if (triggerIndex === -1) return null

  const triggerChar = textBeforeCursor[triggerIndex] as '@' | '/'

  // Boundary check: must be at the very start OR preceded by whitespace or opening punctuation
  if (triggerIndex > 0) {
    const prevChar = textBeforeCursor[triggerIndex - 1]
    const isValidBoundary = /[\s([{"'`´]/.test(prevChar)
    if (!isValidBoundary) {
      return null
    }
  }

  // The search query typed after the trigger up to the cursor
  const query = textBeforeCursor.slice(triggerIndex + 1)

  // Mentions cannot span across line breaks
  if (/[\r\n]/.test(query)) {
    return null
  }

  // Discard overly long queries (e.g. > 40 chars)
  if (query.length > 40) {
    return null
  }

  return {
    type: triggerChar === '@' ? 'offender' : 'victim',
    triggerChar,
    triggerIndex,
    query,
  }
}

/**
 * Replaces the trigger and typed query with the fully formatted mention tag,
 * returning the updated text and next cursor position.
 */
export function insertMentionIntoText(
  text: string,
  triggerIndex: number,
  cursor: number,
  triggerChar: '@' | '/',
  name: string,
): { newText: string; newCursor: number } {
  const cleanName = name.trim()
  const before = text.slice(0, triggerIndex)
  const after = text.slice(cursor)

  const mentionTag = `${triggerChar}${cleanName} `
  const safeAfter = after.startsWith(' ') ? after.slice(1) : after

  const newText = before + mentionTag + safeAfter
  const newCursor = before.length + mentionTag.length

  return { newText, newCursor }
}

export interface UseMentionAutocompleteOptions {
  text: Ref<string>
  offenders: Ref<IncidentParticipantInput[]>
  victims: Ref<IncidentParticipantInput[]>
  onMentionInserted?: (tag: string) => void
}

/**
 * Composable that manages state and keyboard navigation for @ (offenders) and / (victims) mention autocompletion.
 */
export function useMentionAutocomplete(options: UseMentionAutocompleteOptions) {
  const { text, offenders, victims, onMentionInserted } = options

  const isOpen = ref<boolean>(false)
  const triggerType = ref<MentionTriggerType | null>(null)
  const query = ref<string>('')
  const triggerIndex = ref<number>(-1)
  const cursorPosition = ref<number>(0)
  const activeIndex = ref<number>(0)

  const triggerChar = computed<'@' | '/' | ''>(() => {
    if (triggerType.value === 'offender') return '@'
    if (triggerType.value === 'victim') return '/'
    return ''
  })

  const availableParticipants = computed<IncidentParticipantInput[]>(() => {
    if (triggerType.value === 'offender') {
      return (offenders.value || []).filter((o) => o && o.name && o.name.trim() !== '')
    }
    if (triggerType.value === 'victim') {
      return (victims.value || []).filter((v) => v && v.name && v.name.trim() !== '')
    }
    return []
  })

  const filteredOptions = computed<IncidentParticipantInput[]>(() => {
    const list = availableParticipants.value
    if (!query.value.trim()) return list

    const q = query.value.trim().toLowerCase()
    return list.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(q)
      const classMatch = p.classroom ? p.classroom.toLowerCase().includes(q) : false
      return nameMatch || classMatch
    })
  })

  const close = () => {
    isOpen.value = false
    triggerType.value = null
    query.value = ''
    triggerIndex.value = -1
    activeIndex.value = 0
  }

  const updateFromCursor = (cursor: number) => {
    cursorPosition.value = cursor
    const match = detectMentionTrigger(text.value, cursor)

    if (match) {
      isOpen.value = true
      triggerType.value = match.type
      query.value = match.query
      triggerIndex.value = match.triggerIndex
      if (activeIndex.value >= filteredOptions.value.length) {
        activeIndex.value = 0
      }
    } else {
      close()
    }
  }

  const handleInput = (e: Event | { target: { selectionStart: number } }) => {
    const target = (e as { target: HTMLTextAreaElement | null })?.target
    const cursor = target?.selectionStart ?? text.value.length
    updateFromCursor(cursor)
  }

  const handleKeydown = (
    e: KeyboardEvent,
    textareaElement?: HTMLTextAreaElement | null,
  ): boolean => {
    if (!isOpen.value) return false

    if (filteredOptions.value.length === 0) {
      if (e.key === 'Escape') {
        e.preventDefault()
        close()
        return true
      }
      return false
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      activeIndex.value = (activeIndex.value + 1) % filteredOptions.value.length
      return true
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      activeIndex.value =
        (activeIndex.value - 1 + filteredOptions.value.length) % filteredOptions.value.length
      return true
    }

    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      const selected = filteredOptions.value[activeIndex.value]
      if (selected) {
        selectOption(selected, textareaElement)
      }
      return true
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return true
    }

    return false
  }

  const selectOption = (
    option: IncidentParticipantInput,
    textareaElement?: HTMLTextAreaElement | null,
  ) => {
    if (!triggerChar.value || triggerIndex.value < 0) return

    const { newText, newCursor } = insertMentionIntoText(
      text.value,
      triggerIndex.value,
      cursorPosition.value,
      triggerChar.value,
      option.name,
    )

    text.value = newText
    const insertedTag = `${triggerChar.value}${option.name.trim()}`
    close()

    if (onMentionInserted) {
      onMentionInserted(insertedTag)
    }

    if (textareaElement) {
      nextTick(() => {
        try {
          textareaElement.focus()
          textareaElement.setSelectionRange(newCursor, newCursor)
        } catch {
          // In non-DOM test environments
        }
      })
    }
  }

  return {
    isOpen,
    triggerType,
    triggerChar,
    query,
    activeIndex,
    availableParticipants,
    filteredOptions,
    updateFromCursor,
    handleInput,
    handleKeydown,
    selectOption,
    close,
  }
}
