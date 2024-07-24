import { gameModes } from "./gameModes"

export interface Word {
	id: number
	token: string
	tag: string
	lemma: string
	score: number
	locked: boolean
	selected: boolean
	connectionLeft: string
	connectionRight: string
}

export interface Sentence {
	id: number
	sentence: string
	words: Word[]
	total_score: number
	chosen: boolean
}

export interface Paragraph {
	id: number
	sentences: Sentence[]
}

export interface DragEvent extends Event {
	dataTransfer?: DataTransfer
}

export interface CustomDndEvent extends CustomEvent {
	detail: {
		items: Word[]
	}
}

export type GameStatus = "start" | "playing" | "over"
export type Timer = {
	initial: number
	resetOnNewLevel: boolean
	increment: number
} | null

export interface GameMode {
	timer: Timer
	hintsWeight: {
		lock: number | null
		connect: number | null
		extraTime: number | null
		extraLife: number | null
	}
	autoCheck: boolean
	lives: number | null
}

export type GameModeKey = keyof typeof gameModes

export interface GameState {
	status: GameStatus
	mode: GameModeKey
	lives?: number
	hints: {
		lock?: number
		connect?: number
		extraTime?: number
		extraLife?: number
	}
	timeRemaining?: number
}

export type HintKey = keyof GameMode["hintsWeight"]
