import { ref, computed } from 'vue'
import type { ElectionRow } from '~/types/election'
import type { CandidateRow } from '~/types/candidate'
import { useUrnaSounds } from '~/composables/useUrnaSounds'

export interface VoteConfirmedPayload {
  candidateId?: string | null
  candidateNumber?: string | null
  isBlank: boolean
  isNull: boolean
}

export interface UseVirtualBallotOptions {
  election: () => ElectionRow
  candidates: () => CandidateRow[]
  disabled?: () => boolean
  onVoteConfirmed: (payload: VoteConfirmedPayload) => void
  onVoteCycleCompleted: () => void
  resetDelayMs?: number
}

/**
 * State machine and physical keyboard controller for the Virtual Ballot Box (Urna Eletrônica).
 */
export function useVirtualBallot(options: UseVirtualBallotOptions) {
  const { playKeySound, playConfirmationSound } = useUrnaSounds()
  const resetDelayMs = options.resetDelayMs ?? 3000

  const digits = ref<string[]>([])
  const isBlankVote = ref(false)
  const isVoteFinished = ref(false)
  const countdownTimer = ref<ReturnType<typeof setTimeout> | null>(null)

  const isDisabled = (): boolean => Boolean(options.disabled?.())

  const digitsCount = computed(() => options.election()?.digits_count || 2)
  const enteredNumber = computed(() => digits.value.join(''))
  const isDigitsComplete = computed(() => digits.value.length === digitsCount.value)

  const cargoTitle = computed(() => {
    const election = options.election()
    if (!election) return 'CARGO'
    return election.is_uppercase ? election.name.toUpperCase() : election.name
  })

  const matchedCandidate = computed<CandidateRow | null>(() => {
    if (isBlankVote.value || !isDigitsComplete.value) return null
    return (
      options
        .candidates()
        .find((candidate) => candidate.candidate_number === enteredNumber.value) || null
    )
  })

  const isNullVote = computed(() => {
    return isDigitsComplete.value && !isBlankVote.value && !matchedCandidate.value
  })

  const resetUrna = () => {
    if (countdownTimer.value) {
      clearTimeout(countdownTimer.value)
      countdownTimer.value = null
    }
    digits.value = []
    isBlankVote.value = false
    isVoteFinished.value = false
  }

  const startResetCountdown = () => {
    if (countdownTimer.value) clearTimeout(countdownTimer.value)
    countdownTimer.value = setTimeout(() => {
      options.onVoteCycleCompleted()
      resetUrna()
    }, resetDelayMs)
  }

  const pressDigit = (digit: string) => {
    if (isDisabled() || isVoteFinished.value) return

    if (isBlankVote.value) {
      isBlankVote.value = false
      digits.value = []
    }

    if (digits.value.length < digitsCount.value) {
      digits.value.push(digit)
      playKeySound()
    }
  }

  const pressCorrige = () => {
    if (isDisabled() || isVoteFinished.value) return
    digits.value = []
    isBlankVote.value = false
    playKeySound()
  }

  const pressBranco = () => {
    if (isDisabled() || isVoteFinished.value) return
    digits.value = []
    isBlankVote.value = true
    playKeySound()
  }

  const pressConfirma = () => {
    if (isDisabled() || isVoteFinished.value) return

    if (isBlankVote.value) {
      playConfirmationSound()
      isVoteFinished.value = true
      options.onVoteConfirmed({
        isBlank: true,
        isNull: false,
      })
      startResetCountdown()
      return
    }

    if (isDigitsComplete.value) {
      playConfirmationSound()
      isVoteFinished.value = true

      if (matchedCandidate.value) {
        options.onVoteConfirmed({
          candidateId: matchedCandidate.value.id,
          candidateNumber: enteredNumber.value,
          isBlank: false,
          isNull: false,
        })
      } else {
        options.onVoteConfirmed({
          candidateId: null,
          candidateNumber: enteredNumber.value,
          isBlank: false,
          isNull: true,
        })
      }

      startResetCountdown()
    }
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (isDisabled() || isVoteFinished.value) return

    if (event.key >= '0' && event.key <= '9') {
      pressDigit(event.key)
    } else if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault()
      pressCorrige()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      pressConfirma()
    } else if (event.key === 'b' || event.key === 'B') {
      pressBranco()
    }
  }

  const cleanup = () => {
    if (countdownTimer.value) {
      clearTimeout(countdownTimer.value)
      countdownTimer.value = null
    }
  }

  return {
    digits,
    isBlankVote,
    isVoteFinished,
    digitsCount,
    enteredNumber,
    isDigitsComplete,
    cargoTitle,
    matchedCandidate,
    isNullVote,
    pressDigit,
    pressCorrige,
    pressBranco,
    pressConfirma,
    resetUrna,
    handleKeyDown,
    cleanup,
  }
}
