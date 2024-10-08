import { gameState } from "./stores"
import { get } from "svelte/store"
import { gameModes } from "./gameModes"
import type { Timer } from "./types"

let gameTimerInterval: number | undefined

export function setupGameTimer(starting: boolean = false) {
    stopGameTimer()

    const timerConfig = gameModes[get(gameState).mode].timer
    if (timerConfig === null) return

    const newTime = calculateNewTime(timerConfig, starting)

    gameState.setTime(newTime)
    gameTimerInterval = setInterval(decrementGameTimer, 1000) as unknown as number
}

export function stopGameTimer() {
    if (gameTimerInterval === undefined) return
    clearInterval(gameTimerInterval)
}

function calculateNewTime(timerConfig: Timer, starting: boolean) {
    if (timerConfig.resetOnNewLevel) {
        return timerConfig.increment * (1 + Math.floor(get(gameState).level / 5))
    }
    return starting ? timerConfig.initial : get(gameState).timeRemaining + timerConfig.increment
}

function decrementGameTimer() {
    gameState.updateTime(-1)
    if (get(gameState).timeRemaining > 0) return
    stopGameTimer()
    gameState.gameOver()
}

export function resetTimerForNextSentence() {
    const timer = gameModes[get(gameState).mode].timer
    if (timer === null) return
    stopGameTimer()
    setupGameTimer()
}