import type { GameMode } from "./types"

export const gameModes: Record<string, GameMode> = {
	normal: {
		timer: null,
		hintsWeight: {
			lock: 3,
			connect: 3,
			extraTime: null,
			extraLife: 1,
		},
		autoCheck: false,
		lives: 3,
		isRelaxMode: false,
	},
	timer: {
		timer: {
			initial: 15,
			resetOnNewLevel: true,
			increment: 15,
		},
		hintsWeight: {
			lock: 2,
			connect: 2,
			extraTime: 1,
			extraLife: null,
		},
		autoCheck: true,
		lives: null,
		isRelaxMode: false,
	},
	countdown: {
		timer: {
			initial: 300,
			resetOnNewLevel: false,
			increment: 0,
		},
		hintsWeight: {
			lock: 2,
			connect: 2,
			extraTime: 1,
			extraLife: null,
		},
		autoCheck: true,
		lives: null,
		isRelaxMode: false,
	},
	relax: {
		timer: null,
		hintsWeight: {
			lock: 3,
			connect: 3,
			extraTime: null,
			extraLife: 1,
		},
		autoCheck: false,
		lives: 3,
		isRelaxMode: true,
	},
}
