import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
	plugins: [svelte()],
	base: "/arranger/",
	define: {
		"import.meta.env.VITE_API_URL": JSON.stringify(
			process.env.NODE_ENV === "production"
				? "https://zuhdibakhri-arranger.s3.ap-southeast-2.amazonaws.com/SENTENCES.json"
				: "/api/SENTENCES.json"
		),
	},
	server: {
		proxy: {
			"/api": {
				target: "https://zuhdibakhri-arranger.s3.ap-southeast-2.amazonaws.com",
				changeOrigin: true,
				rewrite: path => path.replace(/^\/api/, ""),
			},
		},
	},
})
