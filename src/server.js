import express from "express"
import pool from "./database.js"
import cors from "cors"

const app = express()
const port = 3000

app.use(cors())

app.get("/sentences", async (req, res) => {
	try {
		const { minScore, maxScore } = req.query

		// Fetch sentences within the specified score range
		const [sentencesRows] = await pool.query(
			`
            SELECT * FROM sentences 
            WHERE total_score BETWEEN ? AND ?
        `,
			[minScore, maxScore]
		)

		const sentences = /** @type {Array<{id: number, current_sentence: string, total_score: number}>} */ (
			sentencesRows
		)

		if (sentences.length === 0) {
			// If no sentences are found, return an empty array
			return res.json([])
		}

		// Fetch words for all sentences
		const sentenceIds = sentences.map(s => s.id)
		const [wordsRows] = await pool.query(
			`
            SELECT * FROM words 
            WHERE sentence_id IN (?)
        `,
			[sentenceIds]
		)
		const words =
			/** @type {Array<{id: number, sentence_id: number, token: string, tag: string, lemma: string, score: number}>} */ (
				wordsRows
			)

		// Fetch sentence relations for all sentences
		const [relationsRows] = await pool.query(
			`
            SELECT sr.*, s.current_sentence, s.total_score 
            FROM sentence_relations sr
            JOIN sentences s ON sr.related_sentence_id = s.id
            WHERE sr.main_sentence_id IN (?)
            ORDER BY sr.relation_type, sr.relation_order
        `,
			[sentenceIds]
		)
		const relations =
			/** @type {Array<{id: number, main_sentence_id: number, related_sentence_id: number, relation_type: string, relation_order: number, current_sentence: string, total_score: number}>} */ (
				relationsRows
			)

		// Process and structure the data
		const processedSentences = sentences.map(sentence => {
			const sentenceWords = words.filter(w => w.sentence_id === sentence.id)
			const prevSentences = relations
				.filter(r => r.main_sentence_id === sentence.id && r.relation_type === "prev")
				.map(r => ({
					sentence: r.current_sentence,
					total_score: r.total_score,
				}))
			const nextSentences = relations
				.filter(r => r.main_sentence_id === sentence.id && r.relation_type === "next")
				.map(r => ({
					sentence: r.current_sentence,
					total_score: r.total_score,
				}))

			return {
				id: sentence.id,
				current_sentence: sentence.current_sentence,
				total_score: sentence.total_score,
				words: sentenceWords,
				prev_sentences: prevSentences,
				next_sentences: nextSentences,
			}
		})

		res.json(processedSentences)
	} catch (error) {
		console.error("Error fetching sentences:", error)
		res.status(500).json({ error: "Internal server error", details: error.message, stack: error.stack })
	}
})

app.listen(port, () => {
	console.log(`API Server running at http://localhost:${port}`)
})
