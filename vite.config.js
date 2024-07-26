import { defineConfig } from "vite"
import { svelte } from "@sveltejs/vite-plugin-svelte"

export default defineConfig({
	plugins: [svelte()],
	base: "/arranger/",
	define: {
		"import.meta.env.VITE_API_URL": JSON.stringify("http://localhost:3000/sentences"),
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true,
				rewrite: path => path.replace(/^\/api/, ""),
			},
		},
	},
})
