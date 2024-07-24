<script lang="ts">
	import { dndzone } from "svelte-dnd-action"
	import { gameState, currentParagraph } from "./stores"
	import { gameModes } from "./gameModes"
	import type { Sentence } from "./types"
	import ButtonGroup from "./ButtonGroup.svelte"

	export let onDragAndDrop: (e: any, isFinal: boolean) => void
	export let onWordClick: (wordId: number) => void
	export let lockWord: () => void
	export let connectWords: () => void
	export let checkSentenceOrder: () => void
	export let nextParagraph: () => void

	let sentences: Sentence[]
	$: {
		sentences = $currentParagraph.sentences
	}

	$: combinedParagraph = sentences.map(sentence => (sentence.chosen ? "{...}" : sentence.sentence)).join(" ")
</script>

<div class="container">
	<div class="paragraph-info">
		<p>Level: {$currentParagraph.id + 1}</p>
		{#if gameModes[$gameState.mode].timer !== null}
			<p>Time: {$gameState.timeRemaining}s</p>
		{:else if $gameState.lives !== null}
			<p>Lives: {$gameState.lives}</p>
		{/if}
	</div>
	<div class="paragraph-container">
		<div class="paragraph">
			{#each sentences as sentence}
				{#if sentence.chosen}
					<div
						use:dndzone={{
							items: sentence.words,
							type: "word",
							dragDisabled: false,
						}}
						on:consider={e => onDragAndDrop(e, false)}
						on:finalize={e => onDragAndDrop(e, true)}
						class="scrambled-words"
					>
						{#each sentence.words as word (word.id)}
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
				{/if}
			{/each}
			<div class="combined-paragraph">
				{combinedParagraph}
			</div>
		</div>
	</div>
	<ButtonGroup
		{lockWord}
		{connectWords}
		{checkSentenceOrder}
		{nextParagraph}
	/>
</div>
