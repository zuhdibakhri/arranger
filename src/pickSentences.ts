import type { Sentence, Word, SurroundingSentences } from "./types"

const MIN_SENTENCE_LENGTH = 3
const MIN_SCORE = 4
const MAX_SCORE = 80
const SCORE_RANGE = 5
const SENTENCES_PER_RANGE = 5
const SCORE_CAP = 3

function createScoreRanges(start: number, end: number, step: number): Array<{ max: number; key: string }> {
	const ranges: Array<{ max: number; key: string }> = []
	let i = start
	for (; i < end; i += step) {
		ranges.push({
			max: i + step,
			key: `${i}<x<=${i + step}`,
		})
	}
	ranges.push({ max: Infinity, key: `${i}<x` })
	return ranges
}

function filterValidSentences(sentences: Sentence[]): Sentence[] {
	return sentences.filter((sentence: Sentence) => {
		const words = sentence.words
		const score = sentence.total_score

		return (
			words.length > MIN_SENTENCE_LENGTH &&
			score >= MIN_SCORE &&
			score <= MAX_SCORE &&
			!words.some(w => w.score > SCORE_CAP)
		)
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

function categorizeSentencesByScore(
	sentences: Sentence[],
	rangeSize: number = SCORE_RANGE
): { [key: string]: Sentence[] } {
	const rangeDefinitions = createScoreRanges(MIN_SCORE, MAX_SCORE, rangeSize)
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

	return result
}

export function pickRandomSentences(rawSentences: Sentence[]): Sentence[] {
	const groupedSentences = categorizeSentencesByScore(rawSentences)
	const selectedSentences = selectRandomSentencesFromEachGroup(groupedSentences)

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

	const sortedSentences = enhancedSentences.sort((a: Sentence, b: Sentence) => a.total_score - b.total_score)

	return sortedSentences.map((sentence, index) => ({
		...sentence,
		id: index,
	}))
}

export function scoreOfSentence(sentence: Sentence): number {
	return sentence.total_score
}
