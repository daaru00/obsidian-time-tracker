interface TimerDuration {
  hours: number
  minutes: number
  seconds: number
}

function getTimestamp(date?: Date): number {
  date = date || new Date()
  return Math.trunc(date.getTime() / 1000)
}

export class Timer {
  id: string
  durationAcc: number
  startedAt: Date
  resumedAt: Date
  pausedAt: Date
  isRunning: boolean
  timerManager: TimerManager
  tags: string[]

  constructor(timerManager: TimerManager, id: string) {
    this.timerManager = timerManager
    this.id = id
    this.startedAt = null
    this.pausedAt = null
    this.resumedAt = null
    this.durationAcc = 0
    this.tags = []
  }

  start(): void {
    this.timerManager.pauseAll()

    if (this.startedAt !== null) {
      return this.resume()
    }
    this.startedAt = new Date()
    this.isRunning = true

    this.timerManager.emit('timer-start', { timer: this })
  }

  reset(): void {
    this.startedAt = null
    this.pausedAt = null
    this.resumedAt = null
    this.durationAcc = 0

    this.timerManager.emit('timer-reset', { timer: this })
  }

  restart(): void {
    this.reset()
    this.start()
  }

  pause(): void {
    if (!this.isRunning) {
      return
    }
    // timer was already paused at least once
    if (this.pausedAt !== null) {
      this.updateDurationAccumulator()
    }
    this.pausedAt = new Date()
    this.isRunning = false

    this.timerManager.emit('timer-paused', { timer: this })
  }

  save(): void {
    this.pause()
    this.timerManager.emit('timer-saved', { timer: this })
  }

  resume(): void {
    this.timerManager.pauseAll()

    if (this.isRunning) {
      return
    }
    // timer was already resumed at least once
    if (this.resumedAt !== null) {
      this.updateDurationAccumulator()
    }
    this.resumedAt = new Date()
    this.isRunning = true

    this.timerManager.emit('timer-resumed', { timer: this })
  }

  updateDurationAccumulator(): void {
    this.durationAcc = this.getDuration()
  }

  getFormattedDurationObject(seconds?: number): TimerDuration {
    const parts = this.getFormattedDurationString(seconds).split(':')
    return {
      hours: parseInt(parts[0]),
      minutes: parseInt(parts[1]),
      seconds: parseInt(parts[2])
    }
  }

  getFormattedDurationString(seconds?: number): string {
    seconds = seconds || this.getDuration()
    return (new Date(seconds * 1000)).toISOString().substr(11, 8)
  }

  forceDuration(seconds: number): void {
    if (this.isRunning) {
      this.pause()
    }
    this.durationAcc = seconds
    this.resumedAt = this.pausedAt
  }

  getApproximatedDuration(seconds: number): number {
    let duration = this.getDuration()
    if (seconds === 0) {
      return duration
    }

    const approximationEdge = seconds / 2
    const leftHours = duration % seconds
  
    if (leftHours < approximationEdge) {
      duration = duration - leftHours
    } else {
      duration = duration - leftHours + seconds
    }
  
    if (duration <= 0) {
      duration = seconds
    }
  
    return Math.ceil(duration)
  }

  getDuration(): number {
    const now = getTimestamp()

    // timer started
    if (this.startedAt !== null &&
       this.isRunning &&
       this.pausedAt === null &&
       this.resumedAt === null
    ) {
      return now - getTimestamp(this.startedAt)
    }

    // timer paused
    if (this.startedAt !== null &&
       !this.isRunning &&
       this.pausedAt !== null &&
       this.resumedAt === null
    ) {
      return getTimestamp(this.pausedAt) - getTimestamp(this.startedAt)
    }

    // timer resumed
    if (this.startedAt !== null &&
       this.isRunning &&
       this.pausedAt !== null &&
       this.resumedAt !== null &&
       this.durationAcc === 0
    ) {
      return (getTimestamp(this.pausedAt) - getTimestamp(this.startedAt)) + (now - getTimestamp(this.resumedAt))
    }

    // timer paused an other time
    if (this.startedAt !== null &&
       !this.isRunning &&
       this.pausedAt !== null &&
       this.resumedAt !== null &&
       this.durationAcc > 0
    ) {
      return this.durationAcc
    }

    // timer resumed an other timer
    if (this.startedAt !== null &&
       this.isRunning &&
       this.pausedAt !== null &&
       this.resumedAt !== null &&
       this.durationAcc > 0
    ) {
      return this.durationAcc + (now - getTimestamp(this.resumedAt))
    }

    return 0
  }

  addTag(tag: string): void {
    this.tags.push(tag)
  }

  hasTag(tag: string): boolean {
    return this.tags.indexOf(tag) !== -1
  }

  removeTag(tag: string): void {
    const index = this.tags.indexOf(tag)
    if (index === -1) {
      return
    }
    this.tags.splice(index, 1)
  }
}

export interface TimerEvent {
  timer?: Timer
}

interface ExportedTimer extends Object {
  id: string
  durationAcc: number
  startedAt: Date
  resumedAt: Date
  pausedAt: Date
  isRunning: boolean
  tags: string[]
}

export default class TimerManager {
  timers: Timer[]
  subscriptions: Map<string, [(event: TimerEvent) => void]>

  constructor() {
    this.timers = []
    this.subscriptions = new Map()
  }

  getAll(): Timer[] {
    return this.timers
  }

  getRunningTimer(): Timer|undefined {
    return this.timers.find(timer => timer.isRunning)
  }

  getById(id: string): Timer|undefined {
    return this.timers.find(timer => timer.id === id)
  }

  createNew(id: string): Timer {
    if (this.getById(id) !== undefined) {
      throw 'Duplicated Timer Identifier'
    }
    const timer = new Timer(this, id)
    this.timers.push(timer)
    return timer
  }

  pauseAll(): void {
    for (const timer of this.timers) {
      timer.pause()
    }
  }

  deleteById(id: string): void {
    const index = this.timers.findIndex(timer => timer.id === id)
    if (index === -1) {
      throw 'Timer Identifier Not Found'
    }
    this.timers.splice(index, 1)
    this.emit('timer-deleted', { timer: { id } })
  }

  deleteAll(): void {
    const ids = this.timers.map(timer => timer.id)
    this.timers = []
    for (const id of ids) {
      this.emit('timer-deleted', { timer: { id } })
    }
  }

  on(event: string, callback: (event: TimerEvent) => void): void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, [callback])
      return
    }
    const subscriptions = this.subscriptions.get(event)
    subscriptions.push(callback)
    this.subscriptions.set(event, subscriptions)
  }

  emit(event: string, data: unknown = {}): void {
    if (!this.subscriptions.has(event)) {
      return
    }
    const subscriptions = this.subscriptions.get(event)
    for (const subscription of subscriptions) {
      subscription(data)
    }
  }

  dump(): ExportedTimer[] {
    return this.timers.map(timer => ({
      id: timer.id,
      durationAcc: timer.durationAcc,
      startedAt: timer.startedAt,
      resumedAt: timer.resumedAt,
      pausedAt: timer.pausedAt,
      isRunning: timer.isRunning,
      tags: timer.tags,
    }))
  }

  restore(timers: ExportedTimer[]): void {
    const imported = []
    for (const timer of timers) {
      const newTimer = new Timer(this, timer.id)
      for (const key in timer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const value = (timer as any)[key]
        switch (key) {
          case 'durationAcc':
            newTimer.durationAcc = parseInt(value)
            break
          case 'startedAt':
            newTimer.startedAt = new Date(value)
            break
          case 'resumedAt':
            newTimer.resumedAt = new Date(value)
            break
          case 'pausedAt':
            newTimer.pausedAt = new Date(value)
            break
          case 'isRunning':
            newTimer.isRunning = value
            break
          case 'tags':
            newTimer.tags = value
            break
        }
      }
      imported.push(newTimer)
    }

    if (imported.length === 0) {
      return
    }

    this.timers = imported
  }
}
