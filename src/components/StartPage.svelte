<script lang="ts">
	import type { GameModeKey } from "../types"
	export let onStart: (mode: GameModeKey) => void
</script>

<div class="start-page">
	<h1>Arranger</h1>
	<p>Choose a game mode:</p>
	<button on:click={() => onStart("normal")}>Normal (Easy)</button>
	<button on:click={() => onStart("zen")}>Zen</button>
	<button on:click={() => onStart("survival")}>Survival</button>
	<button on:click={() => onStart("timer")}>Timer</button>
	<button on:click={() => onStart("countdown")}>Countdown</button>
</div>
