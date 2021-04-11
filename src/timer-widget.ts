import TimerTrackerPlugin from './main'
import { ButtonComponent } from 'obsidian'

export default class TimerWidget {
  el: HTMLElement;
  plugin: TimerTrackerPlugin;
  identifier: string;
  timerControlContainer: HTMLDivElement;
  issueTransitions: import("/home/fabio/Obsidian/Bitbull/.obsidian/plugins/obsidian-jira-issue/src/lib/jira").JiraIssueTransitions[];
  transitionControlContainer: HTMLDivElement;
  saveCommandIdentifier: string;
  issueBlock: Element;

  constructor(plugin: TimerTrackerPlugin, el: HTMLElement, issueBlock?: Element) {
    this.plugin = plugin
    this.el = el
    this.issueBlock = issueBlock
    this.plugin.timeManager.on('timer-start', this.showTimerControl.bind(this))
    this.plugin.timeManager.on('timer-paused', this.showTimerControl.bind(this))
    this.plugin.timeManager.on('timer-resumed', this.showTimerControl.bind(this))
    this.plugin.timeManager.on('timer-reset', this.showTimerControl.bind(this))
    this.plugin.timeManager.on('timer-deleted', this.showTimerControl.bind(this))
  }

  setIdentifier(identifier: string): TimerWidget {
    this.el.dataset.identifier = identifier

    this.el.empty()

    this.identifier = identifier
    this.showTimerControl()

    return this
  }

  setSaveCommandCallback(identifier: string): void {
    this.saveCommandIdentifier = identifier
  }

  showTimerControl(): void {    
    if (!this.identifier) {
      return
    }

    if (!this.timerControlContainer) {
      this.timerControlContainer = this.el.createDiv({ cls: ['timer-control'] })
    } else {
      this.timerControlContainer.empty()
    }    

    const timer = this.plugin.timeManager.getById(this.identifier)
    if (!timer) {
      new ButtonComponent(this.timerControlContainer)
        .setButtonText("start")
        .onClick(() => {
          const timer = this.plugin.timeManager.createNew(this.identifier)
          timer.start()
        })
    } else {
      if (timer.isRunning) {
        new ButtonComponent(this.timerControlContainer)
          .setButtonText("pause")
          .onClick(() => {
            timer.pause()
          })
      } else {
        new ButtonComponent(this.timerControlContainer)
          .setButtonText("resume")
          .onClick(() => {
            timer.resume()
          })
      }
      new ButtonComponent(this.timerControlContainer)
        .setButtonText("reset")
        .onClick(() => {
          timer.reset()
        })

      new ButtonComponent(this.timerControlContainer)
        .setButtonText("save")
        .onClick(() => {
          timer.pause()
          this.issueBlock.dispatchEvent(new CustomEvent('timersave', { detail: timer }))
        })
    }
  }
}
