import express from "express"
import pool from "./database.js"
import cors from "cors"

const app = express()
const port = 3000

app.use(cors())
const processQueryResult = rows => {
	return rows.map(processRow)
}

const processRow = row => {
	return {
		id: row.id,
		current_sentence: row.current_sentence,
		total_syllables: row.total_syllables,
		words: parseWords(row.words, row.id),
		prev_sentences: parseSentences(row.prev_sentences),
		next_sentences: parseSentences(row.next_sentences),
	}
}

const parseWords = (wordsString, sentenceId) => {
	if (!wordsString) return []

	return wordsString.split("|").map(word => {
		const [id, token, tag, lemma, syllable_count] = word.split(":")
		return {
			id: Number(id),
			sentence_id: sentenceId,
			token,
			tag,
			lemma,
			syllable_count: Number(syllable_count),
		}
	})
}

const parseSentences = sentencesString => {
	if (!sentencesString) return []

	return sentencesString
		.split("|")
		.filter(Boolean)
		.map(sentence => {
			const [id, sentenceText, total_syllables] = sentence.split(":")
			return {
				id: Number(id),
				sentence: sentenceText,
				total_syllables: Number(total_syllables),
			}
		})
}
app.get("/sentences", async (req, res) => {
	try {
		const { minSyllables, maxSyllables, maxWordSyllables = 5 } = req.query
		const sentences = await fetchSentences(minSyllables, maxSyllables, maxWordSyllables)
		res.json(sentences)
	} catch (error) {
		handleError(error, res)
	}
})

async function fetchSentences(minSyllables, maxSyllables, maxWordSyllables) {
	const query = buildSentenceQuery()
	const [rows] = await pool.query(query, [minSyllables, maxSyllables, maxWordSyllables])
	return processQueryResult(rows)
}

function buildSentenceQuery() {
	return `
		SELECT 
				s.id, s.current_sentence, s.total_syllables,
				COALESCE(GROUP_CONCAT(DISTINCT w.id, ':', w.token, ':', w.tag, ':', w.lemma, ':', w.syllable_count SEPARATOR '|'), '') AS words,
				COALESCE(GROUP_CONCAT(DISTINCT CASE WHEN sr.relation_type = 'prev' THEN CONCAT(rs.id, ':', rs.current_sentence, ':', rs.total_syllables) END SEPARATOR '|'), '') AS prev_sentences,
				COALESCE(GROUP_CONCAT(DISTINCT CASE WHEN sr.relation_type = 'next' THEN CONCAT(rs.id, ':', rs.current_sentence, ':', rs.total_syllables) END SEPARATOR '|'), '') AS next_sentences
		FROM sentences s
		JOIN words w ON s.id = w.sentence_id
		LEFT JOIN sentence_relations sr ON s.id = sr.main_sentence_id
		LEFT JOIN sentences rs ON sr.related_sentence_id = rs.id
		WHERE s.total_syllables BETWEEN ? AND ?
		GROUP BY s.id
		HAVING MAX(w.syllable_count) <= ?
				AND s.total_syllables >= 0.5 * GREATEST(COALESCE(MAX(CASE WHEN sr.relation_type = 'prev' THEN rs.total_syllables END), 0),
																								COALESCE(MAX(CASE WHEN sr.relation_type = 'next' THEN rs.total_syllables END), 0))
				AND COUNT(DISTINCT w.id) >= 3
		ORDER BY RAND()
		LIMIT 1
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
