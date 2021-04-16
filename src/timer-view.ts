import TimerTrackerPlugin from './main';
import { ButtonComponent, ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_OUTPUT = 'time-tracker'

export default class TimerView extends ItemView {
	outputElem: HTMLElement;
	plugin: TimerTrackerPlugin
  timerList: HTMLUListElement;
	timerTable: HTMLTableSectionElement;

	constructor(leaf: WorkspaceLeaf, plugin: TimerTrackerPlugin) {
		super(leaf);
		this.plugin = plugin
	}

	getViewType(): string {
		return VIEW_TYPE_OUTPUT;
	}

	getDisplayText(): string {
		return 'Time Tracker';
	}

	getIcon(): string {
		return "clock";
	}

	async onOpen(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();

    const table = containerEl.createEl('table')
		table.addClass('time-tracker-table')

		table.createTHead().createEl('th').setText('Identifier')
		table.createTHead().createEl('th').setText('Time')
		table.createTHead().createEl('th').setText('Commands')
		this.timerTable = table.createTBody()

		this.refreshTimerList()
    this.registerInterval(window.setInterval(this.refreshTimerList.bind(this), 1000))
	}

  refreshTimerList(): void {
    this.timerTable.empty()

    const timers = this.plugin.timeManager.getAll()
    for (const timer of timers) {
			const row = this.timerTable.createEl('tr')

			row.createEl('td', {
				text: timer.id
			})

			row.createEl('td', {
				text: timer.getFormattedDurationString()
			}).addClass('timer-view')

      const commandContainer = row.createEl('td')

			if (timer.isRunning) {
        new ButtonComponent(commandContainer)
          .setButtonText("\u23F8")
          .onClick(() => {
            timer.pause()
						this.refreshTimerList()
          })
      } else {
        new ButtonComponent(commandContainer)
          .setButtonText("\u23EF")
          .onClick(() => {
            timer.resume()
						this.refreshTimerList()
          })
      }

      new ButtonComponent(commandContainer)
        .setButtonText("\u23F9")
        .onClick(() => {
          timer.save()
					this.refreshTimerList()
        })

      new ButtonComponent(commandContainer)
        .setIcon("trash")
        .onClick(() => {
          this.plugin.timeManager.deleteById(timer.id)
					this.refreshTimerList()
        })
    }
  }
}
