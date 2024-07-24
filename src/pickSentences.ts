import type { Sentence, Paragraph } from "./types"

const MIN_SENTENCE_LENGTH = 3
const MIN_SCORE_PERCENTAGE = 0.6
const MIN_SCORE = 4
const MAX_SCORE = 80
const SCORE_RANGE = 5
const SENTENCE_PER_RANGE = 5
const SCORE_CAP = 3

function assignIds(paragraphs: Sentence[][]): Paragraph[] {
	return paragraphs.map((paragraph, paragraphIndex) => ({
		id: paragraphIndex,
		sentences: paragraph.map((sentence, sentenceIndex) => ({
			...sentence,
			id: sentenceIndex,
			words: sentence.words.map((word, wordIndex) => ({
				...word,
				id: wordIndex,
				selected: false,
				locked: false,
				connectionLeft: "",
				connectionRight: "",
			})),
		})),
	}))
}

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

function filterAndCollectValidSentences(sentences: Sentence[][]): Sentence[] {
	const allSentences: Sentence[] = []
	sentences.forEach((paragraph: Sentence[]) => {
		const topScore = Math.max(...paragraph.map(sentence => sentence.total_score))
		const threshold = topScore * MIN_SCORE_PERCENTAGE

		paragraph.forEach((sentence: Sentence) => {
			const words = sentence.words
			const score = sentence.total_score

			if (words.length <= MIN_SENTENCE_LENGTH || score < threshold || words.some(w => w.score > SCORE_CAP)) {
				return
			}

			allSentences.push(sentence)
		})
	})

	return allSentences
}

function assignSentencesToScoreRanges(
	allSentences: Sentence[],
	rangeDefinitions: Array<{ max: number; key: string }>
): { [key: string]: Sentence[] } {
	const scoreRanges: { [key: string]: Sentence[] } = {}

	allSentences.forEach((sentence: Sentence) => {
		const score = sentence.total_score
		const range = rangeDefinitions.find(r => score <= r.max)
		const lastKey = Object.keys(scoreRanges)[Object.keys(scoreRanges).length - 1]
		let rangeKey = range ? range.key : lastKey

		if (!scoreRanges[rangeKey]) {
			scoreRanges[rangeKey] = []
		}
		scoreRanges[rangeKey].push(sentence)
	})

	return scoreRanges
}

export function categorizeSentencesByScore(
	sentences: Sentence[][],
	rangeSize: number = SCORE_RANGE
): { [key: string]: Sentence[] } {
	const rangeDefinitions = createScoreRanges(MIN_SCORE, MAX_SCORE, rangeSize)
	const allSentences = filterAndCollectValidSentences(sentences)
	const scoreRanges = assignSentencesToScoreRanges(allSentences, rangeDefinitions)
	return scoreRanges
}

function mapSentencesToParagraphs(sentences: Sentence[][]): Map<Sentence, number> {
	const sentenceToParagraphIndex = new Map<Sentence, number>()
	sentences.forEach((paragraph, index) => {
		paragraph.forEach(sentence => {
			sentenceToParagraphIndex.set(sentence, index)
		})
	})
	return sentenceToParagraphIndex
}

function filterSentencesFromSelectedParagraphs(
	sentenceToParagraphIndex: Map<Sentence, number>,
	groupedSentences: { [key: string]: Sentence[] },
	paragraphIndices: Set<number> = new Set()
): { [key: string]: Sentence[] } {
	const availableSentences: { [key: string]: Sentence[] } = {}

	Object.entries(groupedSentences).forEach(([key, groupSentences]) => {
		availableSentences[key] = groupSentences.filter((sentence: Sentence) => {
			const paragraphIndex = sentenceToParagraphIndex.get(sentence)!
			return !paragraphIndices.has(paragraphIndex)
		})
	})

	return availableSentences
}

function selectRandomSentencesFromEachGroup(
	availableSentences: { [key: string]: Sentence[] },
	sentenceToParagraphIndex: Map<Sentence, number>,
	count: number,
	paragraphIndices: Set<number>
): Sentence[] {
	const result: Sentence[] = []
	Object.values(availableSentences).forEach((groupSentences: Sentence[]) => {
		if (groupSentences.length <= 0) {
			return
		}
		for (let i = 0; i < SENTENCE_PER_RANGE && groupSentences.length > 0; i++) {
			const index = Math.floor(Math.random() * groupSentences.length)
			const selectedSentence = groupSentences[index]
			result.push(selectedSentence)
			const paragraphIndex = sentenceToParagraphIndex.get(selectedSentence)!
			paragraphIndices.add(paragraphIndex)
			groupSentences.splice(index, 1)
		}
		if (result.length >= count) {
			return
		}
	})

	return result
}

export function selectRandomSentences(
	groupedSentences: { [key: string]: Sentence[] },
	count: number,
	sentences: Sentence[][]
): Sentence[] {
	const paragraphIndices = new Set<number>()
	const sentenceToParagraphIndex = mapSentencesToParagraphs(sentences)
	const availableSentences = filterSentencesFromSelectedParagraphs(
		sentenceToParagraphIndex,
		groupedSentences,
		paragraphIndices
	)
	const result = selectRandomSentencesFromEachGroup(
		availableSentences,
		sentenceToParagraphIndex,
		count,
		paragraphIndices
	)
	const sentencesSortedByTotalScore = result.sort((a: Sentence, b: Sentence) => a.total_score - b.total_score)
	return sentencesSortedByTotalScore
}

export function formatParagraphsAndAssignChosenSentences(
	sentences: Sentence[][],
	selectedSentences: Set<Sentence>
): Paragraph[] {
	return sentences
		.map((paragraph, index) => {
			const formattedSentences: Sentence[] = paragraph.map(sentence => ({
				...sentence,
				chosen: selectedSentences.has(sentence),
			}))

			return {
				id: index,
				sentences: formattedSentences,
			}
		})
		.filter(paragraph => paragraph.sentences.some(sentence => sentence.chosen))
}

export function scoreOfChosenSentence(paragraph: Paragraph): number {
	const chosenSentence = paragraph.sentences.find((sentence: Sentence) => sentence.chosen)
	return chosenSentence ? chosenSentence.total_score : 0
}

export function pickRandomSentences(rawParagraphs: Sentence[][]): Paragraph[] {
	const groupedSentences = categorizeSentencesByScore(rawParagraphs)
	const selectedSentences = selectRandomSentences(groupedSentences, SENTENCE_PER_RANGE, rawParagraphs)
	const selectedSentencesSet = new Set(selectedSentences)
	let paragraphs = formatParagraphsAndAssignChosenSentences(rawParagraphs, selectedSentencesSet)
	paragraphs.sort((a: Paragraph, b: Paragraph) => scoreOfChosenSentence(a) - scoreOfChosenSentence(b))
	return assignIds(paragraphs.map(p => p.sentences))
}
