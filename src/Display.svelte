<script lang="ts">
	import { dndzone } from "svelte-dnd-action"
	import { gameState, currentSentence } from "./stores"
	import { gameModes } from "./gameModes"
	import ButtonGroup from "./ButtonGroup.svelte"
	import { handleWordDrag, handleWordSelection } from "./wordEventHandlers"

	export let lockRandomWord: () => void
	export let connectRandomWords: () => void
	export let checkWordOrder: () => void
	export let advanceToNextSentence: () => void
	export let scrambleWords: () => void
	export let getTranslation: () => void
	export let sentenceTranslation: string

	$: combinedParagraph =
		$currentSentence.prev_sentences.map(s => s.sentence).join(" ") +
		" " +
		"{...}" +
		" " +
		$currentSentence.next_sentences.map(s => s.sentence).join(" ")
</script>

<div class="container">
	<div class="paragraph-info">
		<p>Level: {$gameState.level}</p>
		{#if gameModes[$gameState.mode].timer !== null}
			<p>Time: {$gameState.timeRemaining}s</p>
		{:else if $gameState.lives !== null}
			<p>Lives: {$gameState.lives}</p>
		{/if}
	</div>
	<div class="paragraph-container">
		<div class="paragraph">
			<div
				use:dndzone={{
					items: $currentSentence.scrambledWords,
					type: "word",
					dragDisabled: false,
				}}
				on:consider={e => handleWordDrag(e, false, checkWordOrder)}
				on:finalize={e => handleWordDrag(e, true, checkWordOrder)}
				class="scrambled-words"
			>
				{#each $currentSentence.scrambledWords as word (word.id)}
					<button
						class="word-box"
						class:selected={word.selected}
						class:locked={word.locked}
						style="border-left-color: {word.connectionLeft ||
							'transparent'}; border-right-color: {word.connectionRight || 'transparent'};"
						on:click={() => handleWordSelection(word.id, checkWordOrder)}
						draggable={!word.locked}
					>
						{word.token}
					</button>
				{/each}
			</div>

			<div class="combined-paragraph">
				{combinedParagraph}
			</div>

			{#if sentenceTranslation}
				<div class="sentence-translation">
					<span>Translation:</span>
					({sentenceTranslation.trim()})
				</div>
			{/if}
		</div>
	</div>
	<ButtonGroup
		{lockRandomWord}
		{connectRandomWords}
		{checkWordOrder}
		{advanceToNextSentence}
		{scrambleWords}
		{getTranslation}
		isTranslated={sentenceTranslation !== ""}
	/>
</div>
