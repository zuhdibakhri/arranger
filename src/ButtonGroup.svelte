<script lang="ts">
	import { gameState, updateGameState } from "./stores"
	import { gameModes } from "./gameModes"

	export let lockWord: () => void
	export let connectWords: () => void
	export let nextSentence: () => void
	export let validateOrder: () => void

	const EXTRA_TIME_DURATION = 15
	const testMode = false
</script>

<div class="buttons">
	<button
		class="buttons-item"
		on:click={lockWord}
		disabled={$gameState.hints.lock === 0}
		title="Lock"
	>
		<i class="fas fa-lock"></i>
		<span class="hint-count">[{$gameState.hints.lock}]</span>
	</button>
	<button
		class="buttons-item"
		on:click={connectWords}
		disabled={$gameState.hints.connect === 0}
		title="Connect"
	>
		<i class="fas fa-link"></i>
		<span class="hint-count">[{$gameState.hints.connect}]</span>
	</button>
	{#if gameModes[$gameState.mode].timer !== null}
		<button
			class="buttons-item"
			on:click={() => {
				updateGameState().updateHints("extraTime", -1)
				updateGameState().updateTime(EXTRA_TIME_DURATION)
			}}
			disabled={$gameState.hints.extraTime === 0}
			title="Extra Time"
		>
			<i class="fas fa-clock"></i>
			<span class="hint-count">[{$gameState.hints.extraTime}]</span>
		</button>
	{/if}
	{#if !gameModes[$gameState.mode].autoCheck}
		<button
			class="buttons-item"
			on:click={validateOrder}
			title="Check"
		>
			<i class="fas fa-check"></i>
		</button>
	{/if}
	{#if testMode}
		<button
			class="buttons-item"
			on:click={nextSentence}
			title="Next"
		>
			<i class="fas fa-arrow-right"></i>
		</button>
	{/if}
</div>
