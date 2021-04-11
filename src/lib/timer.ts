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
  time_entry_id: string
  issue_id: string
  comments: string
  durationAcc: number
  startedAt: Date
  resumedAt: Date
  pausedAt: Date
  isRunning: boolean
  timerManager: TimerManager

  constructor(id: string, timerManager: TimerManager) {
    this.id = id
    this.timerManager = timerManager
  }

  start(): void {
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

  resume(): void {
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

  getFormattedDurationObject(): TimerDuration {
    const parts = this.getFormattedDurationString().split(':')
    return {
      hours: parseInt(parts[0]),
      minutes: parseInt(parts[1]),
      seconds: parseInt(parts[2])
    }
  }

  getFormattedDurationString(): string {
    const seconds = this.getDuration()
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

  save(): void {
    this.pause()
    this.timerManager.emit('timer-save', { timer: this })
  }
}

interface TimerEvent {
  timer?: Timer
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

  getById(id: string): Timer|undefined {
    return this.timers.find(timer => timer.id === id)
  }

  createNew(id: string): Timer {
    if (this.getById(id) !== undefined) {
      throw 'Duplicated Timer Identifier'
    }
    const timer = new Timer(id, this)
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
    this.timers = []
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
}
