import _ from "lodash"
import { get } from "svelte/store"
import { currentSentence, gameState, showNotification } from "./stores"
import type { Word, HintKey, GameMode } from "./types"
import { indexOfWord, swapElements } from "./utils"
import { gameModes } from "./gameModes"
import translateSentence from "./translateSentence"

export function addRandomHint(): void {
	const state = get(gameState)
	const currentMode = gameModes[state.mode]
	const availableHints = getAvailableHints(currentMode)

	if (availableHints.length === 0) return

	const selectedHint = selectRandomHint(availableHints)
	applySelectedHint(selectedHint)
}

function getAvailableHints(currentMode: GameMode): Array<{ hintType: string; weight: number }> {
	return Object.entries(currentMode.hintsWeight)
		.filter(([_, weight]) => weight !== null)
		.map(([hintType, weight]) => ({ hintType, weight: weight as number }))
}

function selectRandomHint(availableHints: Array<{ hintType: string; weight: number }>): HintKey {
	const totalWeight = availableHints.reduce((sum, hint) => sum + hint.weight, 0)
	let randomValue = Math.random() * totalWeight

	for (const { hintType, weight } of availableHints) {
		randomValue -= weight
		if (randomValue <= 0) {
			return hintType as HintKey
		}
	}
}

function applySelectedHint(selectedHint: HintKey): void {
	if (selectedHint === "extraLife") {
		gameState.updateLives(1)
		showNotification("+1 life", "info")
	} else {
		gameState.updateHints(selectedHint, 1)
		showNotification(`+1 hint: ${selectedHint}`, "info")
	}
}

export function lockRandomWord(): void {
	const { words: originalWords, scrambledWords } = get(currentSentence)
	const wordsNotInCorrectPosition = getWordsNotInCorrectPosition(originalWords, scrambledWords)

	if (wordsNotInCorrectPosition.length === 0) {
		showNotification("No valid lock available", "error")
		return
	}

	const randomWord = _.sample(wordsNotInCorrectPosition)
	const correctPosition = findCorrectPosition(originalWords, randomWord)
	const currentPosition = indexOfWord(scrambledWords, randomWord.id)

	swapAndLockWord(scrambledWords, currentPosition, correctPosition)
	updateSentenceAndHints(scrambledWords)
}

function getWordsNotInCorrectPosition(originalWords: Word[], scrambledWords: Word[]): Word[] {
	return scrambledWords.filter((word, index) => {
		const correctPosition = indexOfWord(originalWords, word.id)
		return !word.locked && index !== correctPosition
	})
}

function findCorrectPosition(originalWords: Word[], word: Word): number {
	return originalWords.findIndex(w => w.token === word.token && !w.locked)
}

function swapAndLockWord(scrambledWords: Word[], currentPosition: number, correctPosition: number): void {
	swapElements(scrambledWords, currentPosition, correctPosition)
	scrambledWords[correctPosition].locked = true
}

function updateSentenceAndHints(scrambledWords: Word[]): void {
	currentSentence.update(sentence => ({ ...sentence, scrambledWords }))
	gameState.updateHints("lock", -1)
}

export function connectRandomWords(): void {
	const { words: originalWords, scrambledWords } = get(currentSentence)
	const availableConnections = findAvailableConnections(originalWords, scrambledWords)

	if (availableConnections.length === 0) {
		showNotification("No valid connection available", "error")
		return
	}

	const { firstWord, secondWord } = _.sample(availableConnections)
	connectWords(scrambledWords, firstWord, secondWord)
	updateSentenceAndConnectionHints(scrambledWords)
}

function findAvailableConnections(
	originalWords: Word[],
	scrambledWords: Word[]
): Array<{ firstWord: Word; secondWord: Word }> {
	return originalWords
		.filter(word => indexOfWord(originalWords, word.id) !== originalWords.length - 1)
		.map(word => ({
			firstWord: word,
			secondWord: originalWords[indexOfWord(originalWords, word.id) + 1],
		}))
		.filter(({ firstWord, secondWord }) => isValidConnection(firstWord, secondWord, originalWords, scrambledWords))
}

function isValidConnection(firstWord: Word, secondWord: Word, originalWords: Word[], scrambledWords: Word[]): boolean {
	const firstWordIndex = indexOfWord(originalWords, firstWord.id)
	const secondWordIndex = indexOfWord(originalWords, secondWord.id)

	const areAlreadyNeighbors = checkIfNeighbors(scrambledWords, firstWordIndex, secondWordIndex, firstWord, secondWord)
	const haveConflictingConnection = checkConflictingConnections(
		firstWord,
		secondWord,
		originalWords,
		firstWordIndex,
		secondWordIndex
	)

	return !(firstWord.connectionRight || secondWord.connectionLeft || areAlreadyNeighbors || haveConflictingConnection)
}

function checkIfNeighbors(
	scrambledWords: Word[],
	firstWordIndex: number,
	secondWordIndex: number,
	firstWord: Word,
	secondWord: Word
): boolean {
	return (
		scrambledWords[firstWordIndex + 1].token === secondWord.token ||
		scrambledWords[secondWordIndex - 1].token === firstWord.token
	)
}

function checkConflictingConnections(
	firstWord: Word,
	secondWord: Word,
	originalWords: Word[],
	firstWordIndex: number,
	secondWordIndex: number
): boolean {
	return (
		(firstWord.connectionLeft && originalWords[firstWordIndex - 1] !== originalWords[secondWordIndex - 2]) ||
		(secondWord.connectionRight && originalWords[secondWordIndex + 1] !== originalWords[firstWordIndex + 2])
	)
}

function connectWords(scrambledWords: Word[], firstWord: Word, secondWord: Word): void {
	const connectionColor = generateRandomColor()
	const firstWordIndex = indexOfWord(scrambledWords, firstWord.id)
	const secondWordIndex = indexOfWord(scrambledWords, secondWord.id)

	scrambledWords[firstWordIndex].connectionRight = connectionColor
	scrambledWords[secondWordIndex].connectionLeft = connectionColor
}

function generateRandomColor(): string {
	return `#${_.padStart(_.random(0x1000000).toString(16), 6, "0")}`
}

function updateSentenceAndConnectionHints(scrambledWords: Word[]): void {
	currentSentence.update(sentence => ({ ...sentence, scrambledWords }))
	gameState.updateHints("connect", -1)
}

export async function getTranslation(language: string): Promise<string | null> {
	gameState.updateHints("translate", -1)
	return await translateSentence(get(currentSentence).current_sentence, language)
}
