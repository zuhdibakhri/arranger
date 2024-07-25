import type { Sentence } from "./types"
import { get } from "svelte/store"
import { gameState } from "./stores"

const MIN_SCORE = 4
const MAX_SCORE = 80
const SCORE_RANGE = 5
const SENTENCES_PER_RANGE = 5
const SCORE_CAP = 3

function createScoreRanges(): Array<{ max: number; key: string }> {
	const ranges: Array<{ max: number; key: string }> = []
	let i = MIN_SCORE
	for (; i < MAX_SCORE; i += SCORE_RANGE) {
		ranges.push({
			max: i + SCORE_RANGE,
			key: `${i}<x<=${i + SCORE_RANGE}`,
		})
	}
	ranges.push({ max: Infinity, key: `${i}<x` })
	return ranges
}

function filterValidSentences(sentences: Sentence[]): Sentence[] {
	return sentences.filter((sentence: Sentence) => {
		const words = sentence.words
		const totalSentencesScore =
			sentence.total_score +
			sentence.prev_sentences.reduce((a, b) => a + b.total_score, 0) +
			sentence.next_sentences.reduce((a, b) => a + b.total_score, 0)
		const numberOfSentences = sentence.prev_sentences.length + 1 + sentence.next_sentences.length
		const averageSentenceScore = totalSentencesScore / numberOfSentences

		const allWordsScoreAreBelowCap = words.every(w => w.score <= SCORE_CAP)
		return allWordsScoreAreBelowCap && sentence.total_score >= averageSentenceScore
	})
}

function assignSentencesToScoreRanges(
	allSentences: Sentence[],
	rangeDefinitions: Array<{ max: number; key: string }>
): { [key: string]: Sentence[] } {
	const scoreRanges: { [key: string]: Sentence[] } = {}

	allSentences.forEach((sentence: Sentence) => {
		const score = sentence.total_score
		const range = rangeDefinitions.find(r => score <= r.max)
		const rangeKey = range ? range.key : rangeDefinitions[rangeDefinitions.length - 1].key

		if (!scoreRanges[rangeKey]) {
			scoreRanges[rangeKey] = []
		}
		scoreRanges[rangeKey].push(sentence)
	})

	return scoreRanges
}

function categorizeSentencesByScore(sentences: Sentence[]): { [key: string]: Sentence[] } {
	const rangeDefinitions = createScoreRanges()
	const validSentences = filterValidSentences(sentences)
	const scoreRanges = assignSentencesToScoreRanges(validSentences, rangeDefinitions)
	return scoreRanges
}

function selectRandomSentencesFromEachGroup(availableSentences: { [key: string]: Sentence[] }): Sentence[] {
	const result: Sentence[] = []
	Object.values(availableSentences).forEach((groupSentences: Sentence[]) => {
		for (let i = 0; i < SENTENCES_PER_RANGE && groupSentences.length > 0; i++) {
			const index = Math.floor(Math.random() * groupSentences.length)
			const selectedSentence = groupSentences[index]
			result.push(selectedSentence)
			groupSentences.splice(index, 1)
		}
	})

	return result.sort((a, b) => a.total_score - b.total_score)
}

function pickRelaxModeSentences(rawSentences: Sentence[]): Sentence[] {
	const RELAX_MODE_SCORE_RANGE = { min: 4, max: 10 }
	const SENTENCES_TO_PICK = 80

	const validSentences = filterValidSentences(rawSentences)
	const relaxSentences = validSentences.filter(
		sentence =>
			sentence.total_score >= RELAX_MODE_SCORE_RANGE.min && sentence.total_score <= RELAX_MODE_SCORE_RANGE.max
	)

	const selectedSentences = []
	for (let i = 0; i < SENTENCES_TO_PICK && relaxSentences.length > 0; i++) {
		const index = Math.floor(Math.random() * relaxSentences.length)
		selectedSentences.push(relaxSentences[index])
		relaxSentences.splice(index, 1)
	}

	const enhancedSentences: Sentence[] = selectedSentences.map(sentence => ({
		...sentence,
		words: sentence.words.map(word => ({
			...word,
			selected: false,
			locked: false,
			connectionLeft: "",
			connectionRight: "",
		})),
	}))

	return enhancedSentences.map((sentence, index) => ({
		...sentence,
		id: index,
	}))
}

export function pickRandomSentences(rawSentences: Sentence[]): Sentence[] {
	const groupedSentences = categorizeSentencesByScore(rawSentences)
	const selectedSentences = selectRandomSentencesFromEachGroup(groupedSentences)

	const currentGameState = get(gameState)
	const isRelaxMode = currentGameState.mode === "relax"

	if (isRelaxMode) {
		return pickRelaxModeSentences(rawSentences)
	}

	const enhancedSentences: Sentence[] = selectedSentences.map(sentence => ({
		...sentence,
		words: sentence.words.map(word => ({
			...word,
			selected: false,
			locked: false,
			connectionLeft: "",
			connectionRight: "",
		})),
	}))

	return enhancedSentences.map((sentence, index) => ({
		...sentence,
		id: index,
	}))
}

export function scoreOfSentence(sentence: Sentence): number {
	return sentence.total_score
}
