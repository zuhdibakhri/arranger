import { writable } from "svelte/store"
import { get } from "svelte/store"
import type { GameState, Sentence, GameModeKey, HintKey } from "./types"
import { gameModes } from "./gameModes"

export const gameState = writable<GameState>()

export function updateGameState() {
	const state = get(gameState)

	function toStartingPage() {
		gameState.set({ ...state, status: "start" })
	}

	function reset(mode: GameModeKey) {
		const selectedMode = gameModes[mode]
		const emptyAllHints = Object.keys(selectedMode.hintsWeight).reduce((acc, key) => ({ ...acc, [key]: 0 }), {})
		gameState.set({
			status: "playing",
			mode,
			lives: selectedMode.lives,
			hints: emptyAllHints,
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

	return {
		toStartingPage,
		reset,
		updateHints,
		updateLives,
		updateTime,
		setTime,
		gameOver,
	}
}

export const sentences = writable<Sentence[]>([])
export const currentSentence = writable<Sentence | null>(null)
