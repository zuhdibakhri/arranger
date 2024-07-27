<script lang="ts">
	import { gameState, updateGameState } from "./stores"
	import { gameModes } from "./gameModes"

	export let lockRandomWord: () => void
	export let connectRandomWords: () => void
	export let advanceToNextSentence: () => void
	export let checkWordOrder: () => void
	export let scrambleWords: () => void
	export let getTranslation: () => void
	export let isTranslated: boolean

	const EXTRA_TIME_DURATION = 15
	const testMode = false
</script>

<div class="buttons">
	<button
		class="buttons-item"
		on:click={() => {
			updateGameState().setStatus("start")
		}}
		title="Quit"
	>
		<i class="fas fa-sign-out-alt"></i>
	</button>
	<button
		class="buttons-item"
		on:click={lockRandomWord}
		disabled={$gameState.hints.lock === 0}
		title="Lock"
	>
		<i class="fas fa-lock"></i>
		<span class="hint-count">[{$gameState.hints.lock}]</span>
	</button>
	<button
		class="buttons-item"
		on:click={connectRandomWords}
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
	<button
		class="buttons-item"
		on:click={getTranslation}
		disabled={$gameState.hints.translate === 0 || isTranslated}
		title="Translate"
	>
		<i class="fas fa-language"></i>
		<span class="hint-count">[{$gameState.hints.translate}]</span>
	</button>
	<button
		class="buttons-item"
		on:click={scrambleWords}
		title="Scramble"
	>
		<i class="fas fa-random"></i>
	</button>
	{#if !gameModes[$gameState.mode].autoCheck}
		<button
			class="buttons-item"
			on:click={checkWordOrder}
			title="Check"
		>
			<i class="fas fa-check"></i>
		</button>
	{/if}
	{#if testMode}
		<button
			class="buttons-item"
			on:click={advanceToNextSentence}
			title="Next"
		>
			<i class="fas fa-arrow-right"></i>
		</button>
	{/if}
</div>
