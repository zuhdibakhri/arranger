import type { DndEvent } from "svelte-dnd-action"
import type { Word, GameModeKey } from "./types"
import { currentSentence, gameState } from "./stores"
import { gameModes } from "./gameModes"
import { indexOfWord, swapElements } from "./utils"
import { get } from "svelte/store"

export function handleWordDrag(e: CustomEvent<DndEvent<Word>>, isFinal: boolean, checkWordOrder: () => void): void {
	const { items: updatedWords } = e.detail
	const originalWords = get(currentSentence).scrambledWords

	const finalWordOrder = maintainLockedWordPositions(originalWords, updatedWords)
	updateCurrentSentence(finalWordOrder)

	if (isFinal && shouldAutoCheck()) {
		checkWordOrder()
	}
}

export function handleWordSelection(wordId: number, checkWordOrder: () => void): void {
	const words = get(currentSentence).scrambledWords
	const clickedWordIndex = indexOfWord(words, wordId)
	const selectedWordIndex = words.findIndex(word => word.selected)

	if (selectedWordIndex === -1) {
		selectWord(words, clickedWordIndex)
	} else {
		swapAndDeselectWords(words, selectedWordIndex, clickedWordIndex)
	}

	updateCurrentSentence(words)

	if (shouldAutoCheck()) {
		checkWordOrder()
	}
}

function maintainLockedWordPositions(originalWords: Word[], updatedWords: Word[]): Word[] {
	originalWords.forEach((word, index) => {
		if (word.locked) {
			const currentIndex = updatedWords.findIndex(w => w.id === word.id)
			if (currentIndex !== index) {
				swapElements(updatedWords, index, currentIndex)
			}
		}
	})
	return updatedWords
}

function updateCurrentSentence(words: Word[]): void {
	currentSentence.update(sentence => ({ ...sentence, scrambledWords: words }))
}

function shouldAutoCheck(): boolean {
	return gameModes[get(gameState).mode as GameModeKey].autoCheck
}

function selectWord(words: Word[], index: number): void {
	words[index].selected = true
}

function swapAndDeselectWords(words: Word[], index1: number, index2: number): void {
	swapElements(words, index1, index2)
	words.forEach(word => (word.selected = false))
}
