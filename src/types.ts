import { gameModes } from "./gameModes"

export type Sentence = {
	id: number
	current_sentence: string
	words: Word[]
	scrambledWords: Word[]
	total_syllables: number
	prev_sentences: SurroundingSentences[]
	next_sentences: SurroundingSentences[]
}

export type Word = {
	id: number
	token: string
	tag: string
	lemma: string
	syllable_count: number
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

export type GameStatus = "loading" | "start" | "playing" | "over"
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
		translate: number | null
	}
	autoCheck: boolean
	lives: number | null
	constantScoreRange: boolean
}

export type GameModeKey = keyof typeof gameModes

export interface GameState {
	status: GameStatus
	mode: GameModeKey
	level: number
	lives: number | null
	hints: {
		lock: number
		connect: number
		extraTime: number
		extraLife: number
		translate: number
	}
	timeRemaining: number | null
}

export type HintKey = keyof GameMode["hintsWeight"]

export type NotifType = "success" | "error" | "info"
export type NotifContent = {
	show: boolean
	message: string
	type: NotifType
}
