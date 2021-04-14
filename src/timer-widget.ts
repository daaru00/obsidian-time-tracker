import TimerTrackerPlugin from './main'
import { ButtonComponent } from 'obsidian'

export default class TimerWidget {
  el: HTMLElement;
  plugin: TimerTrackerPlugin;
  identifier: string;
  timerControlContainer: HTMLDivElement;
  issueBlock: Element;
  timerView: Element;

  constructor(plugin: TimerTrackerPlugin, el: HTMLElement) {
    this.plugin = plugin
    this.el = el
    this.plugin.timeManager.on('timer-start', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-paused', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-resumed', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-reset', this.refreshTimerControl.bind(this))
    this.plugin.timeManager.on('timer-deleted', this.refreshTimerControl.bind(this))

    this.el.addEventListener('tick', this.refreshTimerView.bind(this))
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
    this.timerView.empty()

    const timer = this.plugin.timeManager.getById(this.identifier)
    if (!timer) {
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
    if (!timer) {
      new ButtonComponent(this.timerControlContainer)
        .setButtonText("\u23F5")
        .onClick(() => {
          const timer = this.plugin.timeManager.createNew(this.identifier)
          timer.start()
          this.refreshTimerView()
        })
    } else {
      if (timer.isRunning) {
        new ButtonComponent(this.timerControlContainer)
          .setButtonText("\u23F8")
          .onClick(() => {
            timer.pause()
            this.refreshTimerView()
          })
      } else {
        new ButtonComponent(this.timerControlContainer)
          .setButtonText("\u23EF")
          .onClick(() => {
            timer.resume()
            this.refreshTimerView()
          })
      }

      new ButtonComponent(this.timerControlContainer)
        .setButtonText("\u23F9")
        .onClick(() => {
          timer.save()
          this.refreshTimerView()
        })
    }
  }
}
