import type { Sentence } from "./types"
import { get } from "svelte/store"
import { gameState } from "./stores"
import { gameModes } from "./gameModes"

const MAX_SENTENCE_SCORE = 80
const SCORE_RANGE_SIZE = 5
const SENTENCES_PER_RANGE = 5
const MAX_WORD_SCORE = 5

const CONSTANT_RANGE_MIN_SCORE = 5
const CONSTANT_RANGE_MAX_SCORE = 10
const CONSTANT_RANGE_SENTENCES_COUNT = 50

function categorizeSentencesByScoreRange(sentences: Sentence[]): { [scoreRange: string]: Sentence[] } {
	const categorizedSentences: { [scoreRange: string]: Sentence[] } = {}

	sentences.forEach((sentence: Sentence) => {
		const sentenceScore = sentence.total_score
		let scoreRangeKey: string

		if (sentenceScore <= MAX_SENTENCE_SCORE) {
			const rangeStart = Math.floor(sentenceScore / SCORE_RANGE_SIZE) * SCORE_RANGE_SIZE
			const rangeEnd = rangeStart + SCORE_RANGE_SIZE
			scoreRangeKey = `${rangeStart}<x<=${rangeEnd}`
		} else {
			scoreRangeKey = `${MAX_SENTENCE_SCORE}<x`
		}

		if (!categorizedSentences[scoreRangeKey]) {
			categorizedSentences[scoreRangeKey] = []
		}
		categorizedSentences[scoreRangeKey].push(sentence)
	})

	return categorizedSentences
}

function isValidSentence(sentence: Sentence): boolean {
	const allWords = sentence.words
	const allRelatedSentences = [...sentence.prev_sentences, sentence, ...sentence.next_sentences]

	const totalScoreOfRelatedSentences = allRelatedSentences.reduce((sum, s) => sum + s.total_score, 0)
	const averageScoreOfRelatedSentences = totalScoreOfRelatedSentences / allRelatedSentences.length

	const allWordsAreBelowScoreCap = allWords.every(word => word.score <= MAX_WORD_SCORE)
	const sentenceScoreIsAboveAverage = sentence.total_score >= averageScoreOfRelatedSentences

	return allWordsAreBelowScoreCap && sentenceScoreIsAboveAverage
}

function selectRandomSentences(sentences: Sentence[], numberOfSentencesToSelect: number): Sentence[] {
	const selectedSentences: Sentence[] = []
	const remainingSentences = [...sentences]

	for (let i = 0; i < numberOfSentencesToSelect && remainingSentences.length > 0; i++) {
		const randomIndex = Math.floor(Math.random() * remainingSentences.length)
		const randomlySentence = remainingSentences.splice(randomIndex, 1)[0]
		selectedSentences.push(randomlySentence)
	}

	return selectedSentences
}

function enhanceSentencesWithGameProperties(sentences: Sentence[]): Sentence[] {
	return sentences.map((sentence, index) => ({
		...sentence,
		id: index,
		words: sentence.words.map(word => ({
			...word,
			selected: false,
			locked: false,
			connectionLeft: "",
			connectionRight: "",
		})),
	}))
}

export function pickRandomSentences(rawSentences: Sentence[]): Sentence[] {
	const { mode } = get(gameState)
	const validSentences = rawSentences.filter(isValidSentence)

	if (mode && gameModes[mode].constantScoreRange) {
		const relaxModeSentences = validSentences.filter(
			sentence =>
				sentence.total_score >= CONSTANT_RANGE_MIN_SCORE && sentence.total_score <= CONSTANT_RANGE_MAX_SCORE
		)
		const selectedRelaxSentences = selectRandomSentences(relaxModeSentences, CONSTANT_RANGE_SENTENCES_COUNT)
		return enhanceSentencesWithGameProperties(selectedRelaxSentences)
	}

	const sentencesByCategoryRange = categorizeSentencesByScoreRange(validSentences)
	const selectedSentencesFromEachRange = Object.values(sentencesByCategoryRange).flatMap(sentencesInRange =>
		selectRandomSentences(sentencesInRange, SENTENCES_PER_RANGE)
	)

	const sortedSelectedSentences = selectedSentencesFromEachRange.sort((a, b) => a.total_score - b.total_score)
	return enhanceSentencesWithGameProperties(sortedSelectedSentences)
}

export function scoreOfSentence(sentence: Sentence): number {
	return sentence.total_score
}
