<script lang="ts">
	import { fade } from "svelte/transition"

	export let message: string
	export let type: "success" | "error" | "info" = "info"
</script>

<div
	class="notification {type}"
	transition:fade={{ duration: 300 }}
>
	{message}
</div>

<style>
	.notification {
		margin-top: 1rem;
		padding: 10px 20px;
		border-radius: 5px;
		color: white;
		font-weight: bold;
		text-align: center;
		width: fit-content;
		margin-inline: auto;
		position: static;
	}

	.success {
		background-color: #4caf50;
	}

	.error {
		background-color: #f44336;
	}

	.info {
		background-color: #2196f3;
	}
</style>
