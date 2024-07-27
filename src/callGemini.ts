import { GoogleGenerativeAI } from "@google/generative-ai"

const GOOGLE_API_KEY: string = import.meta.env.VITE_GOOGLE_API_KEY as string

export interface ModelParameters {
	model: string
	messages: {
		role: string
		content: string
	}[]
}

export default async function callGemini(parameters: ModelParameters): Promise<string | null> {
	const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY)
	const model = genAI.getGenerativeModel({ model: parameters.model })
	const result = await model.generateContent(parameters.messages[0].content)
	return result.response.text() || null
}
