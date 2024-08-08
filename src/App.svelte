<script lang="ts">
	import { onMount } from "svelte"
	import _ from "lodash"

	import Display from "./components/Display.svelte"
	import GameOverPage from "./components/GameOverPage.svelte"
	import Notification from "./components/Notification.svelte"
	import StartPage from "./components/StartPage.svelte"

	import { gameModes } from "./gameModes"
	import { resetTimerForNextSentence, setupGameTimer, stopGameTimer } from "./gameTimer"
	import { addRandomHint, connectRandomWords, lockRandomWord, getTranslation } from "./hintHandlers"
	import { selectSentence } from "./pickSentences"
	import {
		currentSentence,
		gameState,
		isLoadingNextSentence,
		notification,
		showNotification,
		sentenceTranslation,
	} from "./stores"
	import type { GameModeKey, Sentence, Word } from "./types"

	import "./app.css"

	const TRANSLATION_LANGUAGE = "Indonesian"
	let nextSentence: Sentence | null = null

	onMount(() => gameState.setStatus("start"))

	async function prepareGameSentences() {
		gameState.setStatus("loading")
		const firstSentence = await selectSentence(1)
		initializeAndScrambleSentence(firstSentence)
		gameState.setStatus("playing")
		nextSentence = await selectSentence(2)
	}

	async function startNewGame(mode: GameModeKey) {
		gameState.setMode(mode)
		await prepareGameSentences()
		gameState.reset()
		if (gameModes[mode].timer === null) return
		setupGameTimer(true)
	}

	function resetGameToStart() {
		gameState.setStatus("start")
		nextSentence = null
		stopGameTimer()
	}

	function initializeAndScrambleSentence(sentence: Sentence): void {
		// console.log(`${sentence.current_sentence} [ ${sentence.total_syllables} ]\n`)
		console.log(sentence)

		currentSentence.set({
			...sentence,
			scrambledWords: scrambleWords(sentence.words),
		})
	}

	async function advanceToNextSentence(): Promise<void> {
		await loadNextSentence()
		prepareNextLevel()
	}

	async function loadNextSentence(): Promise<void> {
		isLoadingNextSentence.set(true)
		gameState.setStatus("loading")
		await waitForNextSentence()
		isLoadingNextSentence.set(false)
		gameState.setStatus("playing")
	}

	function prepareNextLevel(): void {
		sentenceTranslation.set("")
		initializeAndScrambleSentence(nextSentence)
		gameState.incrementLevel()
		addRandomHint()
		resetTimerForNextSentence()
		loadFutureSentence()
	}

	async function waitForNextSentence(): Promise<void> {
		while (nextSentence === null) {
			await new Promise(resolve => setTimeout(resolve, 100))
		}
	}

	async function loadFutureSentence(): Promise<void> {
		nextSentence = null
		nextSentence = await selectSentence($gameState.level + 1)
	}

	function checkWordOrder(): void {
		const [correctOrder, scrambledWords] = [$currentSentence.words, $currentSentence.scrambledWords]
		const wordsInCorrectPosition = scrambledWords.every((word, index) => word.token === correctOrder[index].token)

		if (wordsInCorrectPosition) {
			handleCorrectOrder()
			return
		}
		handleIncorrectOrder()
	}

	function handleCorrectOrder(): void {
		showNotification("Correct!", "success")
		advanceToNextSentence()
	}

	function handleIncorrectOrder(): void {
		if (!gameModes[$gameState.mode].lives) return

		gameState.updateLives(-1)
		if (gameModes[$gameState.mode].autoCheck) return

		showNotification("Try again!", "error")
	}

	function scrambleWords(words: Word[]): Word[] {
		const unlockedWords = words.filter(word => !word.locked)
		let shuffledWords = words

		while (areWordsInOriginalOrder(shuffledWords, words)) {
			shuffledWords = shuffleUnlockedWords(words, unlockedWords)
		}
		return shuffledWords
	}

	function areWordsInOriginalOrder(shuffledWords: Word[], originalWords: Word[]): boolean {
		return shuffledWords.every((word, index) => word.token === originalWords[index].token)
	}

	function shuffleUnlockedWords(words: Word[], unlockedWords: Word[]): Word[] {
		const shuffledUnlockedWords = _.shuffle(unlockedWords)
		return words.map(word => (word.locked ? word : shuffledUnlockedWords.shift()))
	}

	async function handleTranslation() {
		sentenceTranslation.set(await getTranslation(TRANSLATION_LANGUAGE))
	}
</script>

<main>
	{#if $gameState.status === "loading" || $isLoadingNextSentence}
		<div class="loading">
			<p>Loading...</p>
		</div>
	{:else if $gameState.status === "start"}
		<StartPage onStart={startNewGame} />
	{:else if $gameState.status === "playing"}
		<Display
			{lockRandomWord}
			{connectRandomWords}
			{checkWordOrder}
			{advanceToNextSentence}
			scrambleWords={() => initializeAndScrambleSentence($currentSentence)}
			getTranslation={handleTranslation}
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
