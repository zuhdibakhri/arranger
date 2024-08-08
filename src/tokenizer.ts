import nlp from "compromise"

interface Token {
	id: number
	text: string
	tags: string[]
	root: string
}

const createPunctuationToken = (char: string, id: number): Token => ({
	id,
	text: char,
	tags: char === " " ? ["Space"] : ["Punctuation"],
	root: char,
})

const createWordToken = (content: string, id: number, tags: string[]): Token => {
	const doc = nlp(content)
	doc.compute("root")
	const rootWord = doc.json()[0].terms[0].root || doc.json()[0].terms[0].normal
	return { id, text: content, tags, root: rootWord }
}

const addTokens = (tokens: Token[], content: string, isPunctuation: boolean, id: number, tags?: string[]): number => {
	if (content === "") return id

	if (isPunctuation) {
		content.split("").forEach((char, index) => {
			tokens.push(createPunctuationToken(char, id + index))
		})
		return id + content.length
	} else {
		tokens.push(createWordToken(content, id, tags!))
		return id + 1
	}
}

const normalizeText = (text: string): string => {
	const doc = nlp(text)
	doc.normalize({ unicode: true, acronyms: true })
	return doc.text().replace(/--/g, " – ")
}

const processSentences = (text: string): Token[][] => {
	const normalizedText = normalizeText(text)
	const doc = nlp(normalizedText)

	return doc.sentences().map(sentence => {
		const tokens: Token[] = []
		let id = 0

		sentence.terms().forEach(term => {
			const { pre, text, post, tags } = term.out("json")[0].terms[0]
			id = addTokens(tokens, pre, true, id)
			id = addTokens(tokens, text, false, id, tags)
			id = addTokens(tokens, post, true, id)
		})

		return tokens
	}) as Token[][]
}

const inputText = "I am building a building."
const result = processSentences(inputText)[0]

console.log(JSON.stringify(result, null, 2))
