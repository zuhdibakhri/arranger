import type { DndEvent } from "svelte-dnd-action"
import type { Word, GameModeKey } from "./types"
import { currentSentence, gameState } from "./stores"
import { gameModes } from "./gameModes"
import { indexOfWord, swapElements } from "./utils"
import { get } from "svelte/store"

export function handleWordDrag(e: CustomEvent<DndEvent<Word>>, isFinal: boolean, checkWordOrder: () => void): void {
	const { items } = e.detail
	const originalWords = get(currentSentence).scrambledWords
	const updatedWords = [...items]

	originalWords.forEach((word, index) => {
		if (word.locked) {
			const currentIndex = updatedWords.findIndex(w => w.id === word.id)
			if (currentIndex !== index) {
				const wordToSwap = updatedWords[index]
				updatedWords[index] = word
				updatedWords[currentIndex] = wordToSwap
			}
		}
	})
	currentSentence.update(sentence => ({ ...sentence, scrambledWords: updatedWords }))
	if (isFinal && gameModes[get(gameState).mode as GameModeKey].autoCheck) checkWordOrder()
}

export function handleWordSelection(wordId: number, checkWordOrder: () => void): void {
	const words = get(currentSentence).scrambledWords
	const clickedWordIndex = indexOfWord(words, wordId)
	const selectedWordIndex = words.findIndex(w => w.selected)

	if (selectedWordIndex === -1) {
		words[clickedWordIndex].selected = true
	} else {
		swapElements(words, selectedWordIndex, clickedWordIndex)
		words.forEach(w => (w.selected = false))
	}

	currentSentence.update(sentence => ({ ...sentence, scrambledWords: words }))
	if (gameModes[get(gameState).mode as GameModeKey].autoCheck) checkWordOrder()
}
