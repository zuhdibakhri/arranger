import express from "express"
import pool from "./database.js"
import cors from "cors"

const app = express()
const port = 3000

app.use(cors())

app.get("/sentences", async (req, res) => {
	try {
		const { minScore, maxScore, maxWordScore = 10 } = req.query

		const [sentencesRows] = await pool.query(
			`
			SELECT s.*,
			GROUP_CONCAT(DISTINCT w.token) AS words,
			AVG(related.total_score) AS avg_related_score
			FROM sentences s
			JOIN words w ON s.id = w.sentence_id
			LEFT JOIN sentence_relations sr ON s.id = sr.main_sentence_id
			LEFT JOIN sentences related ON sr.related_sentence_id = related.id
			WHERE s.total_score BETWEEN ? AND ?
			GROUP BY s.id
			HAVING MAX(w.score) <= ?
			AND s.total_score >= avg_related_score
			AND (LENGTH(words) - LENGTH(REPLACE(words, ',', '')) + 1) >= 4
			ORDER BY RAND()
			LIMIT 1000
			`,
			[minScore, maxScore, maxWordScore]
		)

		const sentences = /** @type {Array<{id: number, current_sentence: string, total_score: number}>} */ (
			sentencesRows
		)

		if (sentences.length === 0) {
			return res.json([])
		}

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
