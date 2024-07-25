import { gameModes } from "./gameModes"

export type Sentence = {
	id: number
	current_sentence: string
	words: Word[]
	total_score: number
	prev_sentences: SurroundingSentences[]
	next_sentences: SurroundingSentences[]
}

export type Word = {
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

export type SurroundingSentences = {
	sentence: string
	total_score: number
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
	isRelaxMode: boolean
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
