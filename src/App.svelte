<script lang="ts">
	import "./app.css"
	import { onMount } from "svelte"
	import _ from "lodash"
	import { gameState, updateGameState, currentSentence, notification, showNotification } from "./stores"
	import type { Word, Sentence, GameModeKey, HintKey, Timer, NotifType, NotifContent } from "./types"
	import { selectSentence } from "./pickSentences"
	import { gameModes } from "./gameModes"
	import StartPage from "./StartPage.svelte"
	import GameOverPage from "./GameOverPage.svelte"
	import Display from "./Display.svelte"
	import type { DndEvent } from "svelte-dnd-action"
	import Notification from "./Notification.svelte"
	import { indexOfWord, swapElements } from "./utils"

	// State variables
	let allSentences
	let gameTimerInterval: number | undefined
	let nextSentence: Sentence | null = null

	// Lifecycle
	onMount(async () => {
		updateGameState().setStatus("loading")
		allSentences = await loadSentencesFromAPI()
		updateGameState().setStatus("start")
	})

	// API
	async function loadSentencesFromAPI() {
		try {
			const response = await fetch(import.meta.env.VITE_API_URL)
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`)
			}
			return await response.json()
		} catch (error) {
			throw error
		}
	}

	// Game initialization
	async function prepareGameSentences() {
		const firstSentence = await selectSentence(allSentences, 1)
		initializeAndScrambleSentence(firstSentence)
		nextSentence = await selectSentence(allSentences, 2)
	}

	async function startNewGame(mode: GameModeKey) {
		updateGameState().setMode(mode)
		await prepareGameSentences()
		updateGameState().reset()
		if (gameModes[mode].timer !== null) {
			setupGameTimer(true)
		}
	}

	function resetGameToStart() {
		updateGameState().setStatus("start")
		nextSentence = null
		stopGameTimer()
	}

	function initializeAndScrambleSentence(sentence: Sentence): void {
		currentSentence.set({
			...sentence,
			scrambledWords: scrambleWords(sentence.words),
		})
	}

	// Timer functions
	function setupGameTimer(starting: boolean = false) {
		stopGameTimer()

		const timerConfig = gameModes[$gameState.mode].timer
		if (timerConfig === null) return

		const newTime = calculateNewTime(timerConfig, starting)

		updateGameState().setTime(newTime)
		gameTimerInterval = setInterval(decrementGameTimer, 1000) as unknown as number
	}

	function stopGameTimer() {
		if (gameTimerInterval !== undefined) {
			clearInterval(gameTimerInterval)
		}
	}

	function calculateNewTime(timerConfig: Timer, starting: boolean) {
		if (timerConfig.resetOnNewLevel) {
			return timerConfig.increment * (1 + Math.floor($gameState.level / 5))
		}
		return starting ? timerConfig.initial : $gameState.timeRemaining + timerConfig.increment
	}

	function decrementGameTimer() {
		updateGameState().updateTime(-1)
		if ($gameState.timeRemaining <= 0) {
			stopGameTimer()
			updateGameState().gameOver()
		}
	}

	async function advanceToNextSentence(): Promise<void> {
		if (nextSentence === null) {
			updateGameState().gameOver()
			return
		}

		initializeAndScrambleSentence(nextSentence)
		updateGameState().incrementLevel()
		nextSentence = null
		nextSentence = await selectSentence(allSentences, $gameState.level + 1)
		resetTimerForNextSentence()
		addRandomHint()
	}

	function resetTimerForNextSentence() {
		const timer = gameModes[$gameState.mode].timer
		if (timer !== null) {
			stopGameTimer()
			setupGameTimer()
		}
	}

	function checkWordOrder(): void {
		const [correctOrder, scrambledWords] = [$currentSentence.words, $currentSentence.scrambledWords]
		const wordsInCorrectPosition = scrambledWords.every((word, index) => word.token === correctOrder[index].token)

		if (wordsInCorrectPosition) {
			showNotification("Correct!", "success")
			advanceToNextSentence()
		} else if (gameModes[$gameState.mode].lives) {
			updateGameState().updateLives(-1)
			if (!gameModes[$gameState.mode].autoCheck) {
				showNotification("Try again!", "error")
			}
		}
	}

	function addRandomHint(): void {
		const currentMode = gameModes[$gameState.mode as GameModeKey]
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

	// Event handlers
	function handleWordDrag(e: CustomEvent<DndEvent<Word>>, isFinal: boolean): void {
		const { items } = e.detail
		const updatedWords = handleLockedWordsInDragAndDrop(items as Word[])
		currentSentence.update(sentence => ({ ...sentence, scrambledWords: updatedWords }))
		if (isFinal && gameModes[$gameState.mode].autoCheck) checkWordOrder()
	}

	function handleLockedWordsInDragAndDrop(newWords: Word[]): Word[] {
		const originalWords = $currentSentence.scrambledWords
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

	function handleWordSelection(wordId: number): void {
		const words = $currentSentence.scrambledWords
		const clickedWordIndex = indexOfWord(words, wordId)
		const selectedWordIndex = words.findIndex(w => w.selected)

		if (selectedWordIndex === -1) {
			words[clickedWordIndex].selected = true
		} else {
			swapElements(words, selectedWordIndex, clickedWordIndex)
			words.forEach(w => (w.selected = false))
		}

		currentSentence.update(sentence => ({ ...sentence, scrambledWords: words }))
		if (gameModes[$gameState.mode].autoCheck) checkWordOrder()
	}

	// Word manipulation functions
	function scrambleWords(words: Word[]): Word[] {
		const unlockedWords = words.filter(word => !word.locked)
		let shuffledWords = words

		while (shuffledWords.every((word, index) => word.token === words[index].token) === true) {
			const shuffledUnlockedWords = _.shuffle(unlockedWords)
			shuffledWords = words.map(word => (word.locked ? word : shuffledUnlockedWords.shift()))
		}
		return shuffledWords
	}

	function lockRandomWord(): void {
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
		if (gameModes[$gameState.mode].autoCheck) checkWordOrder()
	}

	function getWordsNotInCorrectPosition(originalWords: Word[], scrambledWords: Word[]): Word[] {
		return scrambledWords.filter((word, index) => {
			const correctPosition = indexOfWord(originalWords, word.id)
			return !word.locked && index !== correctPosition
		})
	}

	function connectRandomWords(): void {
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
</script>

<main>
	{#if $gameState.status === "loading"}
		<div class="loading">
			<p>Loading...</p>
		</div>
	{:else if $gameState.status === "start"}
		<StartPage onStart={startNewGame} />
	{:else if $gameState.status === "playing"}
		<Display
			{handleWordDrag}
			{handleWordSelection}
			{lockRandomWord}
			{connectRandomWords}
			{checkWordOrder}
			{advanceToNextSentence}
		/>
		{#if $notification.show}
			<Notification
				message={$notification.message}
				type={$notification.type}
			/>
		{/if}
	{:else}
		<GameOverPage
			finalLevel={$gameState.level}
			onRestart={resetGameToStart}
		/>
	{/if}
</main>
