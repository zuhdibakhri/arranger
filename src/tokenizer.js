import nlp from "compromise"

const createPunctuationToken = (char, id) => ({
	id,
	text: char,
	tags: ["Punctuation"],
	root: char,
})

const createWordToken = (content, id, tags) => {
	const doc = nlp(content)
	doc.compute("root")
	const rootWord = doc.json()[0].terms[0].root || doc.json()[0].terms[0].normal
	return { id, text: content, tags, root: rootWord }
}

const addTokens = (tokens, content, isPunctuation, id, tags) => {
	if (content === "") return id

	if (isPunctuation) {
		content.split("").forEach(char => {
			if (char !== " ") {
				tokens.push(createPunctuationToken(char, id))
				id++
			}
		})
		return id
	} else {
		tokens.push(createWordToken(content, id, tags))
		return id + 1
	}
}

const normalizeText = text => {
	const doc = nlp(text)
	doc.normalize({ unicode: true, acronyms: true })
	return doc.text().replace(/--/g, " – ")
}

export const processSentences = text => {
	const normalizedText = normalizeText(text)
	const doc = nlp(normalizedText)

	return doc.sentences().map(sentence => {
		const tokens = []
		let id = 0

		sentence.terms().forEach(term => {
			const { pre, text, post, tags } = term.out("json")[0].terms[0]
			id = addTokens(tokens, pre, true, id)
			id = addTokens(tokens, text, false, id, tags)
			id = addTokens(tokens, post, true, id)
		})

		return tokens
	})[0]
}
