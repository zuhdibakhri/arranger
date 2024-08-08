import type { Word, Sentence } from "./types"
import { get } from "svelte/store"
import { gameState } from "./stores"
import { gameModes } from "./gameModes"

const CONSTANT_RANGE = { min: 5, max: 7 }
const SYLLABLE_GROUPS = [
	{ min: 5, max: 7 },
	{ min: 8, max: 10 },
	{ min: 11, max: 13 },
	{ min: 14, max: 16 },
	{ min: 17, max: 19 },
	{ min: 20, max: 22 },
	{ min: 23, max: 25 },
	{ min: 26, max: 28 },
	{ min: 29, max: 31 },
	{ min: 32, max: 34 },
	{ min: 35, max: 37 },
	{ min: 38, max: 40 },
	{ min: 41, max: 43 },
	{ min: 44, max: 46 },
	{ min: 47, max: 49 },
	{ min: 50, max: Infinity },
]

function resetWordProperties(word: Word): Word {
	return {
		...word,
		selected: false,
		locked: false,
		connectionLeft: "",
		connectionRight: "",
	}
}

function enhanceSentenceWithGameProperties(sentence: Sentence, id: number): Sentence {
	return {
		...sentence,
		id,
		words: sentence.words.map(resetWordProperties),
		scrambledWords: sentence.words.map(resetWordProperties),
	}
}

function getSyllableRange(level: number, useConstantRange: boolean): { min: number; max: number } {
	if (useConstantRange) return CONSTANT_RANGE

	const groupIndex = Math.min(Math.floor((level - 1) / 5), SYLLABLE_GROUPS.length - 1)
	return SYLLABLE_GROUPS[groupIndex]
}

async function fetchSentencesFromAPI(minSyllables: number, maxSyllables: number): Promise<Sentence[]> {
	const apiUrl = new URL(import.meta.env.VITE_API_URL)
	apiUrl.searchParams.append("minSyllables", minSyllables.toString())
	apiUrl.searchParams.append("maxSyllables", maxSyllables.toString())

	const response = await fetch(apiUrl.toString())
	if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)

	return await response.json()
}

export async function selectSentence(level: number): Promise<Sentence | null> {
	const { mode } = get(gameState)
	const { constantScoreRange } = gameModes[mode]
	const { min, max } = getSyllableRange(level, constantScoreRange)

	try {
		const eligibleSentences = await fetchSentencesFromAPI(min, max)
		if (eligibleSentences.length === 0) {
			console.warn(`No eligible sentences found for level ${level} and syllable range ${min}-${max}`)
			return null
		}
		const sentence = eligibleSentences[0]
		if (!sentence || !Array.isArray(sentence.words)) {
			console.error("Invalid sentence structure received from API")
			return null
		}
		return enhanceSentenceWithGameProperties(sentence, level)
	} catch (error) {
		console.error("Error fetching sentences:", error)
		return null
	}
}
