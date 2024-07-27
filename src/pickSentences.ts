import type { Sentence, GameMode } from "./types"
import { get } from "svelte/store"
import { gameState } from "./stores"
import { gameModes } from "./gameModes"

const MAX_WORD_SCORE = 5
const CONSTANT_RANGE_MIN_SCORE = 5
const CONSTANT_RANGE_MAX_SCORE = 10
const PROGRESSIVE_BASE_MIN = 5
const PROGRESSIVE_BASE_MAX = 10
const PROGRESSIVE_INCREMENT = 5
const LEVELS_PER_INCREMENT = 5

function isValidSentence(sentence: Sentence): boolean {
	const allWords = sentence.words
	const allRelatedSentences = [...sentence.prev_sentences, sentence, ...sentence.next_sentences]

	const totalScoreOfRelatedSentences = allRelatedSentences.reduce((sum, s) => sum + s.total_score, 0)
	const averageScoreOfRelatedSentences = totalScoreOfRelatedSentences / allRelatedSentences.length

	const allWordsAreBelowScoreCap = allWords.every(word => word.score <= MAX_WORD_SCORE)
	const sentenceScoreIsAboveAverage = sentence.total_score >= averageScoreOfRelatedSentences

	return allWordsAreBelowScoreCap && sentenceScoreIsAboveAverage
}

function enhanceSentenceWithGameProperties(sentence: Sentence, id: number): Sentence {
	return {
		...sentence,
		id,
		words: sentence.words.map(word => ({
			...word,
			selected: false,
			locked: false,
			connectionLeft: "",
			connectionRight: "",
		})),
		scrambledWords: sentence.words.map(word => ({
			...word,
			selected: false,
			locked: false,
			connectionLeft: "",
			connectionRight: "",
		})),
	}
}

function getScoreRange(level: number, constantScoreRange: boolean): { min: number; max: number } {
	if (constantScoreRange) {
		return {
			min: CONSTANT_RANGE_MIN_SCORE,
			max: CONSTANT_RANGE_MAX_SCORE,
		}
	} else {
		const increment = Math.floor((level - 1) / LEVELS_PER_INCREMENT) * PROGRESSIVE_INCREMENT
		return {
			min: PROGRESSIVE_BASE_MIN + increment,
			max: PROGRESSIVE_BASE_MAX + increment,
		}
	}
}

async function fetchSentencesFromAPI(minScore: number, maxScore: number): Promise<Sentence[]> {
	const response = await fetch(`${import.meta.env.VITE_API_URL}?minScore=${minScore}&maxScore=${maxScore}`)
	if (!response.ok) {
		throw new Error(`HTTP error! status: ${response.status}`)
	}
	return await response.json()
}

export async function selectSentence(level: number): Promise<Sentence | null> {
	console.log("Selecting sentence for level", level)
	const mode = get(gameState).mode
	const gameMode = gameModes[mode]
	const { min, max } = getScoreRange(level, gameMode.constantScoreRange)

	const eligibleSentences = await fetchSentencesFromAPI(min, max)

	if (eligibleSentences.length === 0) {
		console.warn(`No eligible sentences found for level ${level} and score range ${min}-${max}`)
		return null
	}

	const selectedSentence = eligibleSentences[Math.floor(Math.random() * eligibleSentences.length)]
	return enhanceSentenceWithGameProperties(selectedSentence, level)
}

export function scoreOfSentence(sentence: Sentence): number {
	return sentence.total_score
}
