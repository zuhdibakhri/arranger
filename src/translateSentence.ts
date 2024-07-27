import callGemini from "./callGemini"

const modelName = "gemini-1.5-flash"

export default async function translateSentence(sentence: string, language: string): Promise<string | null> {
	const prompt = `Translate the sentence below into ${language}. Respond with nothing else.\n\nSentence: ${sentence}`
	const parameters = { model: modelName, messages: [{ role: "user", content: prompt }] }
	const response = await callGemini(parameters)

	return response
}
