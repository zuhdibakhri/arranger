<script lang="ts">
	import { onMount } from "svelte"

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

	import _ from "lodash"

	import "./app.css"

	let nextSentence: Sentence | null = null
	const TRANSLATION_LANGUAGE = "Indonesian"

	onMount(() => {
		gameState.setStatus("start")
	})

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
		if (gameModes[mode].timer !== null) {
			setupGameTimer(true)
		}
	}

	function resetGameToStart() {
		gameState.setStatus("start")
		nextSentence = null
		stopGameTimer()
	}

	function initializeAndScrambleSentence(sentence: Sentence): void {
		console.log({
			current_sentence: sentence.current_sentence,
			total_syllables: sentence.total_syllables,
		})
		currentSentence.set({
			...sentence,
			scrambledWords: scrambleWords(sentence.words),
		})
	}

	async function advanceToNextSentence(): Promise<void> {
		isLoadingNextSentence.set(true)
		gameState.setStatus("loading")

		while (nextSentence === null) {
			await new Promise(resolve => setTimeout(resolve, 100))
		}

		isLoadingNextSentence.set(false)
		gameState.setStatus("playing")

		sentenceTranslation.set("")
		initializeAndScrambleSentence(nextSentence)
		gameState.incrementLevel()
		addRandomHint()
		nextSentence = null
		nextSentence = await selectSentence($gameState.level + 1)
		resetTimerForNextSentence()
	}

	function checkWordOrder(): void {
		const [correctOrder, scrambledWords] = [$currentSentence.words, $currentSentence.scrambledWords]
		const wordsInCorrectPosition = scrambledWords.every((word, index) => word.token === correctOrder[index].token)

		if (wordsInCorrectPosition) {
			showNotification("Correct!", "success")
			advanceToNextSentence()
		} else if (gameModes[$gameState.mode].lives) {
			gameState.updateLives(-1)
			if (!gameModes[$gameState.mode].autoCheck) {
				showNotification("Try again!", "error")
			}
		}
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
