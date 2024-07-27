import express from "express"
import pool from "./database.js"
import cors from "cors"

const app = express()
const port = 3000

app.use(cors())

const processQueryResult = rows => {
	return rows.map(row => {
		const words = row.words
			? row.words.split("|").map(w => {
					const [id, token, tag, lemma, score] = w.split(":")
					return { id: Number(id), sentence_id: row.id, token, tag, lemma, score: Number(score) }
			  })
			: []

		const processSentences = sentences => {
			return sentences
				? sentences
						.split("|")
						.filter(Boolean)
						.map(s => {
							const [id, sentence, score] = s.split(":")
							return { id: Number(id), sentence, total_score: Number(score) }
						})
				: []
		}

		return {
			id: row.id,
			current_sentence: row.current_sentence,
			total_score: row.total_score,
			words,
			prev_sentences: processSentences(row.prev_sentences),
			next_sentences: processSentences(row.next_sentences),
		}
	})
}

app.get("/sentences", async (req, res) => {
	try {
		const { minScore, maxScore, maxWordScore = 10 } = req.query

		const query = `
			SELECT 
				s.id, s.current_sentence, s.total_score,
				COALESCE(GROUP_CONCAT(DISTINCT w.id, ':', w.token, ':', w.tag, ':', w.lemma, ':', w.score SEPARATOR '|'), '') AS words,
				COALESCE(GROUP_CONCAT(DISTINCT CASE WHEN sr.relation_type = 'prev' THEN CONCAT(rs.id, ':', rs.current_sentence, ':', rs.total_score) END SEPARATOR '|'), '') AS prev_sentences,
				COALESCE(GROUP_CONCAT(DISTINCT CASE WHEN sr.relation_type = 'next' THEN CONCAT(rs.id, ':', rs.current_sentence, ':', rs.total_score) END SEPARATOR '|'), '') AS next_sentences
			FROM sentences s
			JOIN words w ON s.id = w.sentence_id
			LEFT JOIN sentence_relations sr ON s.id = sr.main_sentence_id
			LEFT JOIN sentences rs ON sr.related_sentence_id = rs.id
			WHERE s.total_score BETWEEN ? AND ?
			GROUP BY s.id
			HAVING MAX(w.score) <= ?
				AND s.total_score >= COALESCE(AVG(rs.total_score), 0)
				AND COUNT(DISTINCT w.id) >= 4
			ORDER BY RAND()
			LIMIT 1
			`

		const [rows] = await pool.query(query, [minScore, maxScore, maxWordScore])

		const processedSentences = processQueryResult(rows)

		res.json(processedSentences)
	} catch (error) {
		console.error("Error fetching sentences:", error)
		res.status(500).json({ error: "Internal server error", details: error.message, stack: error.stack })
	}
})

app.listen(port, () => {
	console.log(`API Server running at http://localhost:${port}`)
})
