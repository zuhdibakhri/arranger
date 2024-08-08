import express from "express"
import pool from "./database.js"
import cors from "cors"
import { processSentences } from "./tokenizer.js"

const app = express()
const port = 3000

app.use(cors())

const processQueryResult = rows => {
	if (rows.length === 0) return []

	const groupedSentences = rows.reduce((acc, row) => {
		if (!acc[row.paragraph_index]) {
			acc[row.paragraph_index] = []
		}
		acc[row.paragraph_index].push(row)
		return acc
	}, {})

	const paragraphs = Object.values(groupedSentences)
	const selectedParagraph = paragraphs[Math.floor(Math.random() * paragraphs.length)]

	const mainSentenceIndex = Math.floor(Math.random() * selectedParagraph.length)

	return [
		selectedParagraph
			.map((row, index) => {
				const words = processSentences(row.current_sentence)
				const prevSentences = selectedParagraph.slice(0, index).map(s => ({
					id: s.id,
					sentence: s.current_sentence,
					total_syllables: s.total_syllables,
				}))
				const nextSentences = selectedParagraph.slice(index + 1).map(s => ({
					id: s.id,
					sentence: s.current_sentence,
					total_syllables: s.total_syllables,
				}))

				return {
					id: row.id,
					current_sentence: row.current_sentence,
					total_syllables: row.total_syllables,
					words: words.map(word => ({
						id: word.id,
						token: word.text,
						tag: word.tags.join(","),
						root: word.root,
					})),
					prev_sentences: prevSentences,
					next_sentences: nextSentences,
					is_main: index === mainSentenceIndex,
				}
			})
			.find(sentence => sentence.is_main),
	]
}

app.get("/sentences", async (req, res) => {
	try {
		const { minSyllables, maxSyllables } = req.query
		const sentences = await fetchSentences(minSyllables, maxSyllables)
		res.json(sentences)
	} catch (error) {
		handleError(error, res)
	}
})

async function fetchSentences(minSyllables, maxSyllables) {
	const query = buildSentenceQuery()
	const [rows] = await pool.query(query, [minSyllables, maxSyllables])
	return processQueryResult(rows)
}

function buildSentenceQuery() {
	return `
    SELECT 
      id, 
      current_sentence, 
      total_syllables, 
      paragraph_index
    FROM sentences
    WHERE total_syllables BETWEEN ? AND ?
    ORDER BY paragraph_index, id
  `
}

function handleError(error, res) {
	console.error("Error fetching sentences:", error)
	res.status(500).json({
		error: "Internal server error",
		details: error.message,
		stack: error.stack,
	})
}

app.listen(port, () => {
	console.log(`API Server running at http://localhost:${port}`)
})
