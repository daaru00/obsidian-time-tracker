import { FuzzySuggestModal, Notice } from 'obsidian'
import { Timer } from './lib/timer'
import TimerTrackerPlugin from './main'

abstract class TimerModal extends FuzzySuggestModal<Timer> {
  plugin: TimerTrackerPlugin

	constructor(plugin: TimerTrackerPlugin) {
		super(plugin.app)
    this.plugin = plugin
	}

  getItems(): Timer[] {
    return this.plugin.timeManager.getAll()
  }

  getItemText(timer: Timer): string {
    return `${timer.id} ${timer.getFormattedDurationString()}`
  }
}

export class StartTimerModal extends TimerModal {
  onChooseItem(timer: Timer): void {
    if (timer.isRunning) {
      new Notice(`Timer ${timer.id} is already running`)
      return  
    }
    timer.start()
    new Notice(`Timer ${timer.id} started`)
  }
}

export class PauseTimerModal extends TimerModal {
  onChooseItem(timer: Timer): void {
    if (!timer.isRunning) {
      new Notice(`Timer ${timer.id} is not running`)
      return  
    }
    timer.pause()
    new Notice(`Timer ${timer.id} paused`)
  }
}

export class DeleteTimerModal extends TimerModal {
  onChooseItem(timer: Timer): void {
    timer.timerManager.deleteById(timer.id)
    new Notice(`Timer ${timer.id} deleted`)
  }
}

export class SaveTimerModal extends TimerModal {
  onChooseItem(timer: Timer): void {
    timer.save()
  }
}
