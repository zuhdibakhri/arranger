import _ from "lodash"
import { get } from "svelte/store"
import { currentSentence, gameState, updateGameState, showNotification } from "./stores"
import type { Word, HintKey } from "./types"
import { indexOfWord, swapElements } from "./utils"
import { gameModes } from "./gameModes"

export function addRandomHint(): void {
	const state = get(gameState)
	const currentMode = gameModes[state.mode]
	const availableHints = getAvailableHints(currentMode)

	if (availableHints.length === 0) return

	const selectedHint = selectRandomHint(availableHints)

	if (selectedHint === "extraLife") {
		updateGameState().updateLives(1)
		showNotification("+1 life", "info")
	} else {
		updateGameState().updateHints(selectedHint, 1)
		showNotification(`+1 hint: ${selectedHint}`, "info")
	}
}

function getAvailableHints(currentMode) {
	return Object.entries(currentMode.hintsWeight)
		.filter(([_, weight]) => weight !== null)
		.map(([hintType, weight]) => ({ hintType, weight: weight as number }))
}

function selectRandomHint(availableHints) {
	const totalWeight = availableHints.reduce((sum, hint) => sum + hint.weight, 0)
	let randomValue = Math.random() * totalWeight

	for (const { hintType, weight } of availableHints) {
		randomValue -= weight
		if (randomValue <= 0) {
			return hintType as HintKey
		}
	}
}

export function lockRandomWord(): void {
	const $currentSentence = get(currentSentence)
	const [originalWords, scrambledWords] = [$currentSentence.words, $currentSentence.scrambledWords]
	const wordsNotInCorrectPosition = getWordsNotInCorrectPosition(originalWords, scrambledWords)

	if (wordsNotInCorrectPosition.length === 0) return

	const randomWord = _.sample(wordsNotInCorrectPosition)
	const correctPosition = originalWords.findIndex(w => w.token === randomWord.token && !w.locked)
	const currentPosition = indexOfWord(scrambledWords, randomWord.id)

	swapElements(scrambledWords, currentPosition, correctPosition)
	scrambledWords[correctPosition].locked = true

	currentSentence.update(sentence => ({ ...sentence, scrambledWords }))
	updateGameState().updateHints("lock", -1)
}

function getWordsNotInCorrectPosition(originalWords: Word[], scrambledWords: Word[]): Word[] {
	return scrambledWords.filter((word, index) => {
		const correctPosition = indexOfWord(originalWords, word.id)
		return !word.locked && index !== correctPosition
	})
}

export function connectRandomWords(): void {
	const $currentSentence = get(currentSentence)
	const [originalWords, scrambledWords] = [$currentSentence.words, $currentSentence.scrambledWords]
	const availableConnections = findAvailableConnections(originalWords, scrambledWords)

	if (availableConnections.length === 0) return

	const { firstWord, secondWord } = _.sample(availableConnections)
	const connectionColor = `#${_.padStart(_.random(0x1000000).toString(16), 6, "0")}`
	const firstWordIndex = indexOfWord(scrambledWords, firstWord.id)
	const secondWordIndex = indexOfWord(scrambledWords, secondWord.id)

	scrambledWords[firstWordIndex].connectionRight = connectionColor
	scrambledWords[secondWordIndex].connectionLeft = connectionColor

	currentSentence.update(sentence => ({ ...sentence, scrambledWords }))
	updateGameState().updateHints("connect", -1)
}

function findAvailableConnections(
	originalWords: Word[],
	scrambledWords: Word[]
): { firstWord: Word; secondWord: Word }[] {
	return originalWords
		.filter(word => {
			return indexOfWord(originalWords, word.id) !== originalWords.length - 1
		})
		.map(word => ({
			firstWord: word,
			secondWord: originalWords[indexOfWord(originalWords, word.id) + 1],
		}))
		.filter(({ firstWord, secondWord }) => isValidConnection(firstWord, secondWord, originalWords, scrambledWords))
}

function isValidConnection(firstWord: Word, secondWord: Word, originalWords: Word[], scrambledWords: Word[]): boolean {
	const firstWordIndex = indexOfWord(originalWords, firstWord.id)
	const secondWordIndex = indexOfWord(originalWords, secondWord.id)
	const areAlreadyNeighbors =
		scrambledWords[firstWordIndex + 1].token === secondWord.token ||
		scrambledWords[secondWordIndex - 1].token === firstWord.token
	const alreadyHaveConflictingConnection =
		(firstWord.connectionLeft && originalWords[firstWordIndex - 1] !== originalWords[secondWordIndex - 2]) ||
		(secondWord.connectionRight && originalWords[secondWordIndex + 1] !== originalWords[firstWordIndex + 2])

	return !(
		firstWord.connectionRight ||
		secondWord.connectionLeft ||
		areAlreadyNeighbors ||
		alreadyHaveConflictingConnection
	)
}
