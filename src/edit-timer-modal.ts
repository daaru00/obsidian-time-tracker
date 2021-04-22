import { ButtonComponent, Modal, TextComponent } from 'obsidian'
import { Timer } from './lib/timer'
import TimerTrackerPlugin from './main'

export default class TimerEditModal extends Modal {
  plugin: TimerTrackerPlugin
  timer: Timer
  hoursInput: TextComponent
  minutesInput: TextComponent
  secondsInput: TextComponent

	constructor(plugin: TimerTrackerPlugin, timer: Timer) {
		super(plugin.app)
    this.plugin = plugin
    this.timer = timer
	}

  onOpen(): void {
    this.contentEl.empty()

    this.contentEl.createEl('h2', {
      text: `Edit timer ${this.timer.id} duration`,
      cls: ['time-tracker-modal-title']
    })

    const duration = this.timer.getFormattedDurationObject()

    const form = this.contentEl.createEl('form')
    form.onsubmit = this.onTimerEdit.bind(this)
    form.addClass('time-tracker-edit')

    this.hoursInput = new TextComponent(form)
    this.hoursInput.setValue(duration.hours.toString())
    this.hoursInput.inputEl.type = 'number'
    this.hoursInput.inputEl.setAttribute('min', '0')
    this.hoursInput.inputEl.setAttribute('max', '24')
    this.hoursInput.inputEl.focus()

    form.createSpan({
      text: ':'
    })

    this.minutesInput = new TextComponent(form)
    this.minutesInput.setValue(duration.minutes.toString())
    this.minutesInput.inputEl.type = 'number'
    this.minutesInput.inputEl.setAttribute('min', '0')
    this.minutesInput.inputEl.setAttribute('max', '59')

    form.createSpan({
      text: ':'
    })

    this.secondsInput = new TextComponent(form)
    this.secondsInput.setValue(duration.seconds.toString())
    this.secondsInput.inputEl.type = 'number'
    this.secondsInput.inputEl.setAttribute('min', '0')
    this.secondsInput.inputEl.setAttribute('max', '59')

    const commandContainer = form.createDiv({ cls: ['time-tracker-modal-commands'] })
    new ButtonComponent(commandContainer)
      .setButtonText('edit')
  }

  onTimerEdit(event: Event): void {
    event.stopPropagation()

    const hours = parseInt(this.hoursInput.getValue().trim() || '0')
    const minutes = parseInt(this.minutesInput.getValue().trim() || '0')
    const seconds = parseInt(this.secondsInput.getValue().trim() || '0')

    this.timer.setDuration(seconds + (minutes*60) + (hours*60*60))
    this.close()
  }
}
