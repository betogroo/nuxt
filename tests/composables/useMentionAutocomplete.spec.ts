import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import {
  detectMentionTrigger,
  insertMentionIntoText,
  useMentionAutocomplete,
} from '~/composables/useMentionAutocomplete'
import type { IncidentParticipantInput } from '~/types/school'

describe('useMentionAutocomplete Composable', () => {
  describe('detectMentionTrigger', () => {
    it('detects @ at the beginning of text', () => {
      const match = detectMentionTrigger('@Lucas', 6)
      expect(match).not.toBeNull()
      expect(match?.type).toBe('offender')
      expect(match?.triggerChar).toBe('@')
      expect(match?.query).toBe('Lucas')
      expect(match?.triggerIndex).toBe(0)
    })

    it('detects @ preceded by a space', () => {
      const match = detectMentionTrigger('O aluno @Bry', 12)
      expect(match).not.toBeNull()
      expect(match?.type).toBe('offender')
      expect(match?.triggerChar).toBe('@')
      expect(match?.query).toBe('Bry')
      expect(match?.triggerIndex).toBe(8)
    })

    it('detects / preceded by a space for victims', () => {
      const match = detectMentionTrigger('Agrediu a aluna /Enza', 21)
      expect(match).not.toBeNull()
      expect(match?.type).toBe('victim')
      expect(match?.triggerChar).toBe('/')
      expect(match?.query).toBe('Enza')
      expect(match?.triggerIndex).toBe(16)
    })

    it('ignores @ in email addresses', () => {
      const match = detectMentionTrigger('Enviar para user@escola.com', 17)
      expect(match).toBeNull()
    })

    it('ignores / in dates', () => {
      const match = detectMentionTrigger('Data: 20/11/2026', 8)
      expect(match).toBeNull()
    })

    it('ignores trigger across line breaks', () => {
      const match = detectMentionTrigger('Aluno @Lucas\nOutro texto', 20)
      expect(match).toBeNull()
    })

    it('returns null when cursor is outside valid range or text is empty', () => {
      expect(detectMentionTrigger('', 0)).toBeNull()
      expect(detectMentionTrigger('Texto sem trigger', 5)).toBeNull()
      expect(detectMentionTrigger('@Lucas', 10)).toBeNull()
    })
  })

  describe('insertMentionIntoText', () => {
    it('replaces trigger and query with mention tag and advances cursor', () => {
      const text = 'O aluno @Bry estava no pátio'
      const { newText, newCursor } = insertMentionIntoText(
        text,
        8, // triggerIndex
        12, // cursor
        '@',
        'Bryan de Paula Cardoso',
      )

      expect(newText).toBe('O aluno @Bryan de Paula Cardoso estava no pátio')
      expect(newCursor).toBe(32)
    })

    it('handles insertion at the end of the text with trailing space', () => {
      const text = 'Vítima /'
      const { newText, newCursor } = insertMentionIntoText(text, 7, 8, '/', 'Enza Valentina')

      expect(newText).toBe('Vítima /Enza Valentina ')
      expect(newCursor).toBe(23)
    })
  })

  describe('useMentionAutocomplete state and actions', () => {
    it('opens offender autocomplete on @ and filters list', () => {
      const text = ref('Ocorrência com @')
      const offenders = ref<IncidentParticipantInput[]>([
        { name: 'Lucas Silva', classroom: '3º B' },
        { name: 'Bernardo Costa', classroom: '4º A' },
      ])
      const victims = ref<IncidentParticipantInput[]>([
        { name: 'Mariana Souza', classroom: '3º B' },
      ])

      const { isOpen, triggerType, triggerChar, filteredOptions, updateFromCursor } =
        useMentionAutocomplete({
          text,
          offenders,
          victims,
        })

      updateFromCursor(16) // at '@'
      expect(isOpen.value).toBe(true)
      expect(triggerType.value).toBe('offender')
      expect(triggerChar.value).toBe('@')
      expect(filteredOptions.value).toHaveLength(2)

      // Type "Luc"
      text.value = 'Ocorrência com @Luc'
      updateFromCursor(19)
      expect(filteredOptions.value).toHaveLength(1)
      expect(filteredOptions.value[0].name).toBe('Lucas Silva')
    })

    it('opens victim autocomplete on /', () => {
      const text = ref('Vítima /Mari')
      const offenders = ref<IncidentParticipantInput[]>([{ name: 'Lucas Silva' }])
      const victims = ref<IncidentParticipantInput[]>([
        { name: 'Mariana Souza', classroom: '3º B' },
        { name: 'Maria Eduarda', classroom: '4º A' },
      ])

      const { isOpen, triggerType, filteredOptions, updateFromCursor } = useMentionAutocomplete({
        text,
        offenders,
        victims,
      })

      updateFromCursor(12) // at end of "/Mari"
      expect(isOpen.value).toBe(true)
      expect(triggerType.value).toBe('victim')
      expect(filteredOptions.value).toHaveLength(2)
    })

    it('navigates with ArrowDown and ArrowUp, and selects with Enter', () => {
      const text = ref('O aluno @')
      const offenders = ref<IncidentParticipantInput[]>([
        { name: 'Aluno 1' },
        { name: 'Aluno 2' },
        { name: 'Aluno 3' },
      ])
      const victims = ref<IncidentParticipantInput[]>([])

      const { activeIndex, updateFromCursor, handleKeydown } = useMentionAutocomplete({
        text,
        offenders,
        victims,
      })

      updateFromCursor(9)
      expect(activeIndex.value).toBe(0)

      const fakeDownEvent = {
        key: 'ArrowDown',
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent

      handleKeydown(fakeDownEvent)
      expect(fakeDownEvent.preventDefault).toHaveBeenCalled()
      expect(activeIndex.value).toBe(1)

      const fakeUpEvent = {
        key: 'ArrowUp',
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent

      handleKeydown(fakeUpEvent)
      expect(activeIndex.value).toBe(0)

      const fakeEnterEvent = {
        key: 'Enter',
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent

      handleKeydown(fakeEnterEvent)
      expect(fakeEnterEvent.preventDefault).toHaveBeenCalled()
      expect(text.value).toBe('O aluno @Aluno 1 ')
    })

    it('closes on Escape key', () => {
      const text = ref('O aluno @')
      const offenders = ref<IncidentParticipantInput[]>([{ name: 'Aluno 1' }])
      const victims = ref<IncidentParticipantInput[]>([])

      const { isOpen, updateFromCursor, handleKeydown } = useMentionAutocomplete({
        text,
        offenders,
        victims,
      })

      updateFromCursor(9)
      expect(isOpen.value).toBe(true)

      const fakeEscEvent = {
        key: 'Escape',
        preventDefault: vi.fn(),
      } as unknown as KeyboardEvent

      handleKeydown(fakeEscEvent)
      expect(fakeEscEvent.preventDefault).toHaveBeenCalled()
      expect(isOpen.value).toBe(false)
    })
  })
})
