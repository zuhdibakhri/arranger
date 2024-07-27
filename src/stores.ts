import { writable } from "svelte/store"
import { get } from "svelte/store"
import type { GameState, Sentence, GameModeKey, HintKey, NotifContent, NotifType, GameStatus } from "./types"
import { gameModes } from "./gameModes"

const emptyHints = {
	lock: 0,
	connect: 0,
	extraTime: 0,
	extraLife: 0,
}

export const gameState = writable<GameState>({
	status: "loading",
	mode: "default",
	level: 1,
	lives: null,
	hints: emptyHints,
	timeRemaining: null,
})

export function updateGameState() {
	const state = get(gameState)

	function setStatus(status: GameStatus) {
		gameState.set({ ...state, status })
	}

	function setMode(mode: GameModeKey) {
		gameState.set({ ...state, mode })
	}

	function reset() {
		const mode = get(gameState).mode
		const selectedMode = gameModes[mode]

		gameState.set({
			status: "playing",
			mode,
			level: 1,
			lives: selectedMode.lives,
			hints: emptyHints,
			timeRemaining: selectedMode.timer ? selectedMode.timer.initial : null,
		})
	}

	function updateHints(key: HintKey, amount: number) {
		gameState.update(gameState => {
			gameState.hints[key] += amount
			return gameState
		})
	}

	function updateLives(amount: number) {
		gameState.update(gameState => {
			if (gameState.lives !== null) {
				gameState.lives += amount
				if (gameState.lives <= 0) {
					gameState.status = "over"
				}
			}
			return gameState
		})
	}

	function updateTime(amount: number) {
		gameState.update(gameState => {
			if (gameState.timeRemaining !== null) {
				gameState.timeRemaining += amount
			}
			return gameState
		})
	}

	function setTime(time: number | null) {
		gameState.update(gameState => {
			gameState.timeRemaining = time
			return gameState
		})
	}

	function gameOver() {
		gameState.update(gameState => {
			gameState.status = "over"
			return gameState
		})
	}

	function incrementLevel() {
		gameState.update(gameState => {
			gameState.level += 1
			return gameState
		})
	}

	return {
		setStatus,
		setMode,
		reset,
		updateHints,
		updateLives,
		updateTime,
		setTime,
		gameOver,
		incrementLevel,
	}
}

export const currentSentence = writable<Sentence | null>(null)

export const notification = writable<NotifContent>({ show: false, message: "", type: "info" })

export function showNotification(message: string, type: NotifType = "info") {
	notification.set({ show: true, message, type })
	setTimeout(() => {
		notification.set({ show: false, message: "", type: "info" })
	}, 500)
}
