import type { Word } from "./types"

export function swapElements<T>(arr: T[], index1: number, index2: number): void {
	;[arr[index1], arr[index2]] = [arr[index2], arr[index1]]
}

export function indexOfWord(words: Word[], target: number | string) {
	return words.findIndex(word => (typeof target === "number" ? word.id === target : word.token === target))
}
