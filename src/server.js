import express from "express"
import pool from "./database.js"
import cors from "cors"

const app = express()
const port = 3000

app.use(cors())

app.get("/sentences", async (req, res) => {
	try {
		const [rows] = await pool.query("SELECT * FROM sentences")

		const sentences = rows
			.map(row => ({
				...row,
				words: typeof row.words === "string" ? JSON.parse(row.words) : row.words,
				prev_sentences:
					typeof row.prev_sentences === "string" ? JSON.parse(row.prev_sentences) : row.prev_sentences,
				next_sentences:
					typeof row.next_sentences === "string" ? JSON.parse(row.next_sentences) : row.next_sentences,
			}))
			.filter(Boolean)

		res.json(sentences)
	} catch (error) {
		console.error("Error fetching sentences:", error)
		res.status(500).json({ error: "Internal server error", details: error.message, stack: error.stack })
	}
})

app.listen(port, () => {
	console.log(`API Server running at http://localhost:${port}`)
})
