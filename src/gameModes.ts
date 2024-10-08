import type { GameMode } from "./types"

export const gameModes: Record<string, GameMode> = {
	survival: {
		timer: null,
		hintsWeight: {
			lock: 3,
			connect: 3,
			extraTime: null,
			extraLife: 1,
			translate: 1,
		},
		autoCheck: false,
		lives: 3,
		constantScoreRange: false,
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
			translate: 1,
		},
		autoCheck: true,
		lives: null,
		constantScoreRange: false,
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
			translate: 1,
		},
		autoCheck: true,
		lives: null,
		constantScoreRange: false,
	},
	normal: {
		timer: null,
		hintsWeight: {
			lock: 3,
			connect: 3,
			extraTime: null,
			extraLife: 1,
			translate: 1,
		},
		autoCheck: false,
		lives: 3,
		constantScoreRange: true,
	},
	zen: {
		timer: null,
		hintsWeight: {
			lock: 1,
			connect: 1,
			extraTime: null,
			extraLife: null,
			translate: 1,
		},
		autoCheck: true,
		lives: null,
		constantScoreRange: false,
	},
}
