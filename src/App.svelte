<script lang="ts">
	import "./app.css"

	import data from "./SENTENCES.json"

	import { onMount } from "svelte"
	import _ from "lodash"
	import { gameState, updateGameState, currentSentence, sentences } from "./stores"
	import type { Word, Sentence, GameModeKey, HintKey, Timer } from "./types"
	import { pickRandomSentences } from "./pickSentences"
	import { gameModes } from "./gameModes"
	import StartPage from "./StartPage.svelte"
	import GameOverPage from "./GameOverPage.svelte"
	import Display from "./Display.svelte"
	import type { DndEvent } from "svelte-dnd-action"

	let rawParagraphs
	let timerInterval: number | undefined

	onMount(async () => {
		updateGameState().toStartingPage()
		rawParagraphs = data
		initializeParagraphs()
	})

	// async function fetchParagraphs() {
	// 	const response = await fetch(import.meta.env.VITE_API_URL)
	// 	if (!response.ok) {
	// 		throw new Error(`HTTP error! status: ${response.status}`)
	// 	}
	// 	return await response.json()
	// }

	function initializeParagraphs() {
		sentences.set(pickRandomSentences(rawParagraphs))
		initParagraph($sentences[0])
	}

	function initGame(mode: GameModeKey) {
		updateGameState().reset(mode)
		if (gameModes[mode].timer !== null) {
			initTimer(true)
		}
	}

	function restartGame() {
		updateGameState().toStartingPage()
		initializeParagraphs()
		clearTimer()
	}

	function initParagraph(sentence: Sentence): void {
		currentSentence.set({
			...sentence,
			words: scrambleWords(sentence.words),
		})
	}

	function initTimer(starting: boolean = false) {
		clearTimer()

		const timerConfig = gameModes[$gameState.mode].timer
		if (timerConfig === null) return

		const newTime = calculateNewTime(timerConfig, starting)

		updateGameState().setTime(newTime)
		timerInterval = setInterval(updateTimer, 1000) as unknown as number
	}

	function clearTimer() {
		if (timerInterval !== undefined) {
			clearInterval(timerInterval)
		}
	}

	function calculateNewTime(timerConfig: Timer, starting: boolean) {
		if (timerConfig.resetOnNewLevel) {
			return timerConfig.increment * (1 + Math.floor($currentSentence.id / 5))
		}
		return starting ? timerConfig.initial : $gameState.timeRemaining + timerConfig.increment
	}

	function updateTimer() {
		updateGameState().updateTime(-1)
		if ($gameState.timeRemaining <= 0) {
			clearTimer()
			updateGameState().gameOver()
		}
	}

	function getOriginalAndScrambledWords(): [Word[], Word[]] {
		const { words: correctOrder } = $sentences[$currentSentence.id]
		const { words: scrambledWords } = $currentSentence
		return [correctOrder, scrambledWords]
	}

	function nextParagraph(): void {
		const { id } = $currentSentence

		if (id >= $sentences.length - 1) {
			updateGameState().gameOver()
			return
		}

		initParagraph($sentences[id + 1])
		resetTimerForNextParagraph()
		randomHintChance()
	}

	function resetTimerForNextParagraph() {
		const timer = gameModes[$gameState.mode].timer
		if (timer !== null) {
			clearTimer()
			initTimer()
		}
	}

	function validateOrder(): void {
		const [correctOrder, scrambledWords] = getOriginalAndScrambledWords()
		const wordsInCorrectPosition = scrambledWords.every((word, index) => word.token === correctOrder[index].token)

		if (wordsInCorrectPosition) {
			nextParagraph()
		} else if (gameModes[$gameState.mode].lives) {
			updateGameState().updateLives(-1)
		}
	}

	export function randomHintChance(): void {
		const currentMode = gameModes[$gameState.mode as GameModeKey]

		const availableHints = Object.entries(currentMode.hintsWeight)
			.filter(([_, weight]) => weight !== null)
			.map(([hintType, weight]) => ({ hintType, weight: weight as number }))

		if (availableHints.length === 0) return

		const totalWeight = availableHints.reduce((sum, hint) => sum + hint.weight, 0)
		let randomValue = Math.random() * totalWeight

		let selectedHint: HintKey
		for (const { hintType, weight } of availableHints) {
			randomValue -= weight
			if (randomValue <= 0) {
				selectedHint = hintType as HintKey
				break
			}
		}

		selectedHint === "extraLife" ? updateGameState().updateLives(1) : updateGameState().updateHints(selectedHint, 1)
	}

	export function swapElements<T>(arr: T[], index1: number, index2: number): void {
		;[arr[index1], arr[index2]] = [arr[index2], arr[index1]]
	}

	export function indexOfWord(words: Word[], target: number | string) {
		return words.findIndex(word => (typeof target === "number" ? word.id === target : word.token === target))
	}

	function onDragAndDropWrapper(e: CustomEvent<DndEvent<Word>>, isFinal: boolean): void {
		const { items } = e.detail
		const updatedWords = handleLockedWordsInDragAndDrop(items as Word[])
		currentSentence.update(sentence => ({ ...sentence, words: updatedWords }))
		if (isFinal && gameModes[$gameState.mode].autoCheck) validateOrder()
	}

	function handleLockedWordsInDragAndDrop(newWords: Word[]): Word[] {
		const originalWords = $currentSentence.words
		const updatedWords = [...newWords]

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

		return updatedWords
	}

	function onWordClick(wordId: number): void {
		const words = $currentSentence.words
		const clickedWordIndex = indexOfWord(words, wordId)
		const selectedWordIndex = words.findIndex(w => w.selected)

		if (selectedWordIndex === -1) {
			words[clickedWordIndex].selected = true
		} else {
			swapElements(words, selectedWordIndex, clickedWordIndex)
			words.forEach(w => (w.selected = false))
		}

		currentSentence.update(sentence => ({ ...sentence, words }))
		if (gameModes[$gameState.mode].autoCheck) validateOrder()
	}

	function scrambleWords(words: Word[]): Word[] {
		const unlockedWords = words.filter(word => !word.locked)
		let shuffledWords = words

		while (shuffledWords.every((word, index) => word.token === words[index].token) === true) {
			const shuffledUnlockedWords = _.shuffle(unlockedWords)
			shuffledWords = words.map(word => (word.locked ? word : shuffledUnlockedWords.shift()))
		}
		return shuffledWords
	}

	function lockWord(): void {
		const [originalWords, scrambledWords] = getOriginalAndScrambledWords()
		const wordsNotInCorrectPosition = getWordsNotInCorrectPosition(originalWords, scrambledWords)

		if (wordsNotInCorrectPosition.length === 0) return

		const randomWord = _.sample(wordsNotInCorrectPosition)
		const correctPosition = originalWords.findIndex(w => w.token === randomWord.token && !w.locked)
		const currentPosition = indexOfWord(scrambledWords, randomWord.id)

		swapElements(scrambledWords, currentPosition, correctPosition)
		scrambledWords[correctPosition].locked = true

		currentSentence.update(sentence => ({ ...sentence, words: scrambledWords }))
		updateGameState().updateHints("lock", -1)
		if (gameModes[$gameState.mode].autoCheck) validateOrder()
	}

	function getWordsNotInCorrectPosition(originalWords: Word[], scrambledWords: Word[]): Word[] {
		return scrambledWords.filter((word, index) => {
			const correctPosition = indexOfWord(originalWords, word.id)
			return !word.locked && index !== correctPosition
		})
	}

	function findAvailableConnections(
		originalWords: Word[],
		scrambledWords: Word[]
	): { firstWord: Word; secondWord: Word }[] {
		return originalWords
			.filter(word => word.id !== originalWords.length - 1)
			.map(word => ({
				firstWord: word,
				secondWord: originalWords[word.id + 1],
			}))
			.filter(({ firstWord, secondWord }) =>
				isValidConnection(firstWord, secondWord, originalWords, scrambledWords)
			)
	}

	function isValidConnection(
		firstWord: Word,
		secondWord: Word,
		originalWords: Word[],
		scrambledWords: Word[]
	): boolean {
		const areAlreadyNeighbors =
			scrambledWords[firstWord.id + 1].token === secondWord.token ||
			scrambledWords[secondWord.id - 1].token === firstWord.token
		const alreadyHaveConflictingConnection =
			(firstWord.connectionLeft && originalWords[firstWord.id - 1] !== originalWords[secondWord.id - 2]) ||
			(secondWord.connectionRight && originalWords[secondWord.id + 1] !== originalWords[firstWord.id + 2])

		return !(
			firstWord.connectionRight ||
			secondWord.connectionLeft ||
			areAlreadyNeighbors ||
			alreadyHaveConflictingConnection
		)
	}

	function connectWords(): void {
		const [originalWords, scrambledWords] = getOriginalAndScrambledWords()
		const availableConnections = findAvailableConnections(originalWords, scrambledWords)

		if (availableConnections.length === 0) return

		const { firstWord, secondWord } = _.sample(availableConnections)
		const connectionColor = `#${_.padStart(_.random(0x1000000).toString(16), 6, "0")}`
		const firstWordIndex = indexOfWord(scrambledWords, firstWord.id)
		const secondWordIndex = indexOfWord(scrambledWords, secondWord.id)

		scrambledWords[firstWordIndex].connectionRight = connectionColor
		scrambledWords[secondWordIndex].connectionLeft = connectionColor

		currentSentence.update(sentence => ({ ...sentence, words: scrambledWords }))
		updateGameState().updateHints("connect", -1)
	}
</script>

<main>
	{#if $sentences.length === 0}
		<div class="loading">
			<p>Loading...</p>
		</div>
	{:else if $gameState.status === "start"}
		<StartPage onStart={initGame} />
	{:else if $gameState.status === "playing"}
		<Display
			onDragAndDrop={onDragAndDropWrapper}
			{onWordClick}
			{lockWord}
			{connectWords}
			checkSentenceOrder={validateOrder}
			{nextParagraph}
		/>
	{:else}
		<GameOverPage
			finalLevel={$currentSentence.id + 1}
			onRestart={restartGame}
		/>
	{/if}
</main>
