import { writable } from "svelte/store"
import { get } from "svelte/store"
import type { GameState, Sentence, GameMode, GameModeKey, HintKey, NotifContent, NotifType, GameStatus } from "./types"
import { gameModes } from "./gameModes"

function createGameState() {
	const { subscribe, set, update } = writable<GameState>({
		status: "loading",
		mode: "default",
		level: 1,
		lives: null,
		hints: {
			lock: null,
			connect: null,
			extraTime: null,
			extraLife: null,
			translate: null,
		},
		timeRemaining: null,
	})

	return {
		subscribe,
		setStatus: (status: GameStatus) => update(state => ({ ...state, status })),
		setMode: (mode: GameModeKey) => update(state => ({ ...state, mode })),
		reset: () =>
			update(state => {
				const selectedMode = gameModes[state.mode]
				return {
					status: "playing",
					mode: state.mode,
					level: 1,
					lives: selectedMode.lives,
					hints: Object.keys(state.hints).reduce((acc, key) => {
						const hintWeight = selectedMode.hintsWeight[key as HintKey]
						acc[key as HintKey] = hintWeight === null ? null : 0
						return acc
					}, {} as GameState["hints"]),
					timeRemaining: selectedMode.timer ? selectedMode.timer.initial : null,
				}
			}),
		updateHints: (key: HintKey, amount: number) =>
			update(state => {
				state.hints[key] += amount
				return state
			}),
		updateLives: (amount: number) =>
			update(state => {
				if (state.lives !== null) {
					state.lives += amount
					if (state.lives <= 0) {
						state.status = "over"
					}
				}
				return state
			}),
		updateTime: (amount: number) =>
			update(state => {
				if (state.timeRemaining !== null) {
					state.timeRemaining += amount
				}
				return state
			}),
		setTime: (time: number | null) => update(state => ({ ...state, timeRemaining: time })),
		gameOver: () => update(state => ({ ...state, status: "over" })),
		incrementLevel: () => update(state => ({ ...state, level: state.level + 1 })),
	}
}

export const gameState = createGameState()

export const currentSentence = writable<Sentence | null>(null)
export const isLoadingNextSentence = writable<boolean>(false)
export const sentenceTranslation = writable<string>("")

export const notification = writable<NotifContent>({ show: false, message: "", type: "info" })

export function showNotification(message: string, type: NotifType = "info") {
	notification.set({ show: true, message, type })
	setTimeout(() => {
		notification.set({ show: false, message: "", type: "info" })
	}, 1000)
}
