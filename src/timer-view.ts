import TimerTrackerPlugin from './main'
import { ButtonComponent, ItemView, WorkspaceLeaf } from 'obsidian'
import TimerEditModal from './edit-timer-modal'

export const VIEW_TYPE_OUTPUT = 'time-tracker'

export default class TimerView extends ItemView {
	outputElem: HTMLElement;
	plugin: TimerTrackerPlugin
  timerList: HTMLUListElement;
	timerTable: HTMLTableSectionElement;

	constructor(leaf: WorkspaceLeaf, plugin: TimerTrackerPlugin) {
		super(leaf)
		this.plugin = plugin
	}

	getViewType(): string {
		return VIEW_TYPE_OUTPUT
	}

	getDisplayText(): string {
		return 'Time Tracker'
	}

	getIcon(): string {
		return 'clock'
	}

	async onOpen(): Promise<void> {
		const { containerEl } = this
		containerEl.empty()

    const table = containerEl.createEl('table')
		table.addClass('time-tracker-table')
		this.timerTable = table.createTBody()

		this.refreshTimerList()
    //this.registerInterval(window.setInterval(this.refreshTimerList.bind(this), 1000))
	}

  refreshTimerList(): void {
    this.timerTable.empty()

    const timers = this.plugin.timeManager.getAll()
		if (timers.length === 0) {
			const row = this.timerTable.createEl('tr')
			row.createEl('td', {
				text: 'no timers found',
				attr: {
					'col-span': '3'
				}
			})
			return
		}

    for (const timer of timers) {
			const row = this.timerTable.createEl('tr')

			row.createEl('td', {
				text: timer.id,
				cls: ['time-tracker-table-id']
			})

			row.createEl('td', {
				text: timer.getFormattedDurationString(),
				cls: ['time-tracker-table-time']
			}).addClass('timer-view')

      const commandContainer = row.createEl('td', {
				cls: ['time-tracker-table-commands']
			})

			if (timer.isRunning) {
        new ButtonComponent(commandContainer)
          .setIcon('time-tracker-pause')
          .onClick(() => {
            timer.pause()
						this.refreshTimerList()
          })
      } else {
        new ButtonComponent(commandContainer)
          .setIcon('time-tracker-resume')
          .onClick(() => {
            timer.resume()
						this.refreshTimerList()
          })
      }

			new ButtonComponent(commandContainer)
        .setIcon('pencil')
        .onClick(() => {
					timer.pause()
					this.refreshTimerList()

          new TimerEditModal(this.plugin, timer).open()
        })

      new ButtonComponent(commandContainer)
        .setIcon('time-tracker-stop')
        .onClick(() => {
          timer.save()
					this.refreshTimerList()
        })

      new ButtonComponent(commandContainer)
        .setIcon('trash')
        .onClick(() => {
          this.plugin.timeManager.deleteById(timer.id)
					this.refreshTimerList()
        })
    }
  }
}
