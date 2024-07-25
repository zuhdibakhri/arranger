<script lang="ts">
	export let finalLevel: number
	export let onRestart: () => void
</script>

<div class="game-over">
	<h2>Game Over</h2>
	<strong>LEVEL</strong>
	<span class="final-level">{finalLevel - 1}</span>
	<button on:click={onRestart}>Play Again</button>
</div>
