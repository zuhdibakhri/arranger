<script lang="ts">
	import type { GameModeKey } from "./types"
	export let onStart: (mode: GameModeKey) => void
</script>

<div class="start-page">
	<h1>Arranger</h1>
	<p>Choose a game mode:</p>
	<button on:click={() => onStart("timer")}>Timer Mode</button>
	<button on:click={() => onStart("countdown")}>Countdown Mode</button>
	<button on:click={() => onStart("normal")}>Normal Mode</button>
	<button on:click={() => onStart("relax")}>Relax Mode</button>
</div>

<style>
	.start-page {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	h1 {
		font-size: 3rem;
		color: #007bff;
	}

	button {
		width: 200px;
	}
</style>
