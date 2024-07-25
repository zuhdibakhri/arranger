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
		position: fixed;
		top: 20px;
		right: 20px;
		padding: 10px 20px;
		border-radius: 5px;
		color: white;
		font-weight: bold;
		z-index: 1000;
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
