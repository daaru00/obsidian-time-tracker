import TimerTrackerPlugin from './main'
import { ButtonComponent } from 'obsidian'
import TimerEditModal from './edit-timer-modal'

export default class TimerWidget {
  el: HTMLElement;
  plugin: TimerTrackerPlugin;
  identifier: string;
  timerControlContainer: HTMLDivElement;
  issueBlock: Element;
  timerView: Element;
  externalTypeName: string;

  constructor(plugin: TimerTrackerPlugin, el: HTMLElement) {
    this.plugin = plugin
    this.el = el
    this.plugin.timeManager.on('timer-start', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-paused', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-resumed', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-reset', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-deleted', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-edited', this.refreshTimerControl.bind(this))

    this.el.addEventListener('tick', this.refreshTimerView.bind(this))
  }

  setType(name: string): TimerWidget {
    this.externalTypeName = name

    return this
  }

  setIdentifier(identifier: string): TimerWidget {
    this.el.dataset.identifier = identifier
    this.el.empty()

    this.identifier = identifier

    return this
  }

  showTimerView(): TimerWidget {
    this.timerView = this.el.createSpan({ cls: ['timer-view'] })
    this.refreshTimerView()

    return this
  }

  refreshTimerView(): void {
    if (!this.timerView) {
      return
    }

    const timer = this.plugin.timeManager.getById(this.identifier)
    if (!timer) {
      this.timerView.setText('00:00:00')
      return
    }

    this.timerView.setText(timer.getFormattedDurationString())
  }

  showTimerControl(): TimerWidget {
    this.timerControlContainer = this.el.createDiv({ cls: ['timer-control'] })
    this.refreshTimerControl()

    return this
  }

  refreshTimerControl(): void {
    if (!this.timerControlContainer) {
      return
    }
    this.timerControlContainer.empty()

    const timer = this.plugin.timeManager.getById(this.identifier)
    if (timer) {
      new ButtonComponent(this.timerControlContainer)
        .setIcon('trash').setTooltip('Delete Timer')
        .onClick(() => {
          this.plugin.timeManager.deleteById(timer.id)
          this.refreshTimerView()
        })

      new ButtonComponent(this.timerControlContainer)
        .setIcon('pencil').setTooltip('Edit Timer')
        .onClick(() => {
          timer.pause()
          this.refreshTimerView()

          new TimerEditModal(this.plugin, timer).open()
        })

      new ButtonComponent(this.timerControlContainer)
        .setIcon('time-tracker-stop').setTooltip('Stop Timer')
        .onClick(() => {
          timer.save()
          this.refreshTimerView()
        })

      if (timer.isRunning) {
        new ButtonComponent(this.timerControlContainer)
          .setIcon('time-tracker-pause').setTooltip('Pause Timer')
          .onClick(() => {
            timer.pause()
            this.refreshTimerView()
          })
      } else {
        new ButtonComponent(this.timerControlContainer)
          .setIcon('time-tracker-resume').setTooltip('Start Timer')
          .onClick(() => {
            timer.resume()
            this.refreshTimerView()
          })
      }

    } else {
      new ButtonComponent(this.timerControlContainer)
        .setIcon('time-tracker-play').setTooltip('Start Timer')
        .onClick(() => {
          const timer = this.plugin.timeManager.createNew(this.identifier)
          if (this.externalTypeName) {
            timer.addTag(this.externalTypeName)
          }

          timer.start()
          this.refreshTimerView()
        })
    }

    new ButtonComponent(this.timerControlContainer)
      .setIcon('clock').setTooltip('Store Time')
      .onClick(() => {
        const pomodoro = this.plugin.timeManager.createNewPomodoro(this.identifier, this.plugin.settings.pomodoroDuration)
        if (this.externalTypeName) {
          pomodoro.addTag(this.externalTypeName)
        }

        pomodoro.save()
      })
  }
}
