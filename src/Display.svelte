<script lang="ts">
	import { dndzone } from "svelte-dnd-action"
	import { gameState, currentSentence } from "./stores"
	import { gameModes } from "./gameModes"
	import ButtonGroup from "./ButtonGroup.svelte"

	export let onDragAndDrop: (e: any, isFinal: boolean) => void
	export let onWordClick: (wordId: number) => void
	export let lockWord: () => void
	export let connectWords: () => void
	export let validateOrder: () => void
	export let nextSentence: () => void

	$: combinedParagraph =
		$currentSentence.prev_sentences.map(s => s.sentence).join(" ") +
		" " +
		"{...}" +
		" " +
		$currentSentence.next_sentences.map(s => s.sentence).join(" ")
</script>

<div class="container">
	<div class="paragraph-info">
		<p>Level: {$currentSentence.id + 1}</p>
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
					items: $currentSentence.words,
					type: "word",
					dragDisabled: false,
				}}
				on:consider={e => onDragAndDrop(e, false)}
				on:finalize={e => onDragAndDrop(e, true)}
				class="scrambled-words"
			>
				{#each $currentSentence.words as word (word.id)}
					<button
						class="word-box"
						class:selected={word.selected}
						class:locked={word.locked}
						style="border-left-color: {word.connectionLeft ||
							'transparent'}; border-right-color: {word.connectionRight || 'transparent'};"
						on:click={() => onWordClick(word.id)}
						draggable={!word.locked}
					>
						{word.token}
					</button>
				{/each}
			</div>

			<div class="combined-paragraph">
				{combinedParagraph}
			</div>
		</div>
	</div>
	<ButtonGroup
		{lockWord}
		{connectWords}
		{validateOrder}
		{nextSentence}
	/>
</div>
