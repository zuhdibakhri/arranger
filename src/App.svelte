<script lang="ts">
	import "./app.css"
	import { onMount } from "svelte"
	import _ from "lodash"
	import { gameState, updateGameState, currentSentence, sentences } from "./stores"
	import type { Word, Sentence, GameModeKey, HintKey, Timer, NotifType, NotifContent } from "./types"
	import { pickRandomSentences } from "./pickSentences"
	import { gameModes } from "./gameModes"
	import StartPage from "./StartPage.svelte"
	import GameOverPage from "./GameOverPage.svelte"
	import Display from "./Display.svelte"
	import type { DndEvent } from "svelte-dnd-action"
	import Notification from "./Notification.svelte"
	import { indexOfWord, swapElements } from "./utilityFunctions"

	// State variables
	let rawSentences
	let timerInterval: number | undefined
	let notification: NotifContent = { show: false, message: "", type: "info" }

	// Lifecycle
	onMount(async () => {
		updateGameState().loading()
		rawSentences = await fetchSentences()
		updateGameState().toStartingPage()
	})

	// API
	async function fetchSentences() {
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
	function initializeSentences() {
		sentences.set(pickRandomSentences(rawSentences))
		initSentence($sentences[0])
	}

	function initGame(mode: GameModeKey) {
		updateGameState().reset(mode)
		initializeSentences()
		if (gameModes[mode].timer !== null) {
			initTimer(true)
		}
	}

	function restartGame() {
		updateGameState().toStartingPage()
		initializeSentences()
		clearTimer()
	}

	function initSentence(sentence: Sentence): void {
		currentSentence.set({
			...sentence,
			words: scrambleWords(sentence.words),
		})
	}

	// Timer functions
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

	// Notification
	function showNotification(message: string, type: NotifType = "info") {
		notification = { show: true, message, type }
		setTimeout(() => {
			notification = { show: false, message: "", type: "info" }
		}, 500)
	}

	// Game logic
	function getOriginalAndScrambledWords(): [Word[], Word[]] {
		return [$sentences[$currentSentence.id].words, $currentSentence.words]
	}

	function nextSentence(): void {
		const { id } = $currentSentence

		if (id >= $sentences.length - 1) {
			updateGameState().gameOver()
			return
		}

		initSentence($sentences[id + 1])
		resetTimerForNextSentence()
		randomHintChance()
	}

	function resetTimerForNextSentence() {
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
			showNotification("Correct!", "success")
			nextSentence()
		} else if (gameModes[$gameState.mode].lives) {
			updateGameState().updateLives(-1)
			if (!gameModes[$gameState.mode].autoCheck) {
				showNotification("Try again!", "error")
			}
		}
	}

	function randomHintChance(): void {
		const currentMode = gameModes[$gameState.mode as GameModeKey]
		const availableHints = getAvailableHints(currentMode)

		if (availableHints.length === 0) return

		const selectedHint = selectRandomHint(availableHints)

		if (selectedHint) {
			applySelectedHint(selectedHint)
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

	function applySelectedHint(selectedHint: HintKey) {
		if (selectedHint === "extraLife") {
			updateGameState().updateLives(1)
			showNotification("+1 life", "info")
		} else {
			updateGameState().updateHints(selectedHint, 1)
			showNotification(`+1 hint: ${selectedHint}`, "info")
		}
	}

	// Event handlers
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
		<StartPage onStart={initGame} />
	{:else if $gameState.status === "playing"}
		<Display
			onDragAndDrop={onDragAndDropWrapper}
			{onWordClick}
			{lockWord}
			{connectWords}
			{validateOrder}
			{nextSentence}
		/>
		{#if notification.show}
			<Notification
				message={notification.message}
				type={notification.type}
			/>
		{/if}
	{:else}
		<GameOverPage
			finalLevel={$currentSentence.id + 1}
			onRestart={restartGame}
		/>
	{/if}
</main>
