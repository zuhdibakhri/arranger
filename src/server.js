import express from "express"
import pool from "./database.js"
import cors from "cors"
import { processSentences } from "./tokenizer.js"

const app = express()
const port = 3000

app.use(cors())

const processQueryResult = async rows => {
	if (rows.length === 0) return []

	const selectedSentence = rows[Math.floor(Math.random() * rows.length)]
	const words = processSentences(selectedSentence.current_sentence)

	const surroundingSentences = await fetchSurroundingSentences(selectedSentence.id, selectedSentence.paragraph_index)

	const processedWords = words.map(word => ({
		id: word.id,
		token: word.text,
		tag: word.tags,
		root: word.root || "",
		syllable_count: word.syllable_count,
	}))

	const processSurroundingSentences = sentences =>
		sentences.map(s => ({
			sentence: s.current_sentence,
			total_score: s.total_syllables,
		}))

	return [
		{
			id: selectedSentence.id,
			current_sentence: selectedSentence.current_sentence,
			words: processedWords,
			total_syllables: selectedSentence.total_syllables,
			prev_sentences: processSurroundingSentences(surroundingSentences.prev),
			next_sentences: processSurroundingSentences(surroundingSentences.next),
		},
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
    ORDER BY RAND()
    LIMIT 1
  `
}

async function fetchSurroundingSentences(sentenceId, paragraphIndex) {
	const query = `
    SELECT 
      id, 
      current_sentence, 
      total_syllables
    FROM sentences
    WHERE paragraph_index = ?
    ORDER BY id
    `
	const [rows] = await pool.query(query, [paragraphIndex])

	if (!Array.isArray(rows)) {
		console.error("Unexpected result type from database query")
		return { prev: [], next: [] }
	}

	const sentenceIndex = rows.findIndex(row => row.id === sentenceId)

	if (sentenceIndex === -1) {
		console.error("Selected sentence not found in paragraph")
		return { prev: [], next: [] }
	}

	return {
		prev: rows.slice(0, sentenceIndex),
		next: rows.slice(sentenceIndex + 1),
	}
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
