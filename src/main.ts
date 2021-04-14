import * as os from 'os'
import { Plugin, WorkspaceLeaf } from 'obsidian'
import TimerTrackerPluginSettings, { DEFAULT_SETTINGS } from './settings'
import JiraIssueSettingTab from './settings-tab'
import TimerManager from './lib/timer'
import TimerView, { VIEW_TYPE_OUTPUT } from './timer-view'
import TimerWidget from './timer-widget'

interface OnTimerSavedEvent {
	detail: {
		id: string
	}
}

export default class TimerTrackerPlugin extends Plugin {
	settings: TimerTrackerPluginSettings
	timeManager: TimerManager
	timerView: TimerView
	statusBarItem: HTMLElement

	async onload(): Promise<void> {
		await this.loadSettings()
		this.addSettingTab(new JiraIssueSettingTab(this.app, this))

		this.initTimerManager()
		
		this.registerMarkdownCodeBlockProcessor('timer', this.timerBlockProcessor.bind(this))
		this.registerMarkdownPostProcessor(this.postProcessor.bind(this))

		this.registerView(
			VIEW_TYPE_OUTPUT,
			(leaf: WorkspaceLeaf) => {
				this.timerView = new TimerView(leaf, this)
				return this.timerView
			}
		)

		this.addCommand({
			id: 'app:show-timers',
			name: 'Show timers',
			callback: () => this.initLeaf(),
			hotkeys: []
		})

		this.addCommand({
			id: 'app:pause-all-timers',
			name: 'Pause all timers',
			callback: () => this.timeManager.pauseAll(),
			hotkeys: []
		})

		this.addCommand({
			id: 'app:delete-all-timers',
			name: 'Delete all timers',
			callback: () => this.timeManager.deleteAll(),
			hotkeys: []
		})

		this.statusBarItem = this.addStatusBarItem()
		this.statusBarItem.addClass('timer-view-status-bar')
		this.registerInterval(window.setInterval(() => {
			const runningTimer = this.timeManager.getRunningTimer()
			if (!runningTimer) {
				if (this.statusBarItem.childElementCount > 0) {
					this.statusBarItem.empty()
				}
				return
			}
			this.statusBarItem.empty()

			this.statusBarItem.createSpan({
				text: runningTimer.id
			})
			this.statusBarItem.createSpan({
				text: runningTimer.getFormattedDurationString()
			}).addClass('timer-view')

		}, 1000))

		this.registerInterval(window.setInterval(() => {
			window.document.querySelectorAll('.timer-control-container.timer-view')
				.forEach(timeWidget => timeWidget.dispatchEvent(new CustomEvent('tick')))
		}, 1000))
	}

	initLeaf(): void {
		const { workspace } = this.app

		if (workspace.getLeavesOfType(VIEW_TYPE_OUTPUT).length > 0) {
			return
		}

		const leaf = workspace.getRightLeaf(false)
		if (!leaf) {
			return
		}

		leaf.setViewState({
			type: VIEW_TYPE_OUTPUT,
			active: true
		});
	}

	initTimerManager(): void {
		this.timeManager = new TimerManager()
		this.timeManager.on('timer-saved', ({ timer }) => {
			const issueBlock = window.document.querySelector(`.timer-tracker-compatible[data-identifier="${timer.id}"]`)
			if (issueBlock) {
				issueBlock.dispatchEvent(new CustomEvent('timersave', { detail: timer }))
			}
		})
	}

	async timerBlockProcessor(content: string, el: HTMLElement): Promise<void> {
		el.empty()
		el.addClasses(['timer-control-container', 'timer-view'])

		new TimerWidget(this, el)
			.setIdentifier(content.replace(new RegExp(os.EOL, 'g'), ''))
			.showTimerView()
			.showTimerControl()
	}

	postProcessor(el: HTMLElement): void {
		const issueBlocks = Array.from(el.querySelectorAll(".timer-tracker-compatible"))		

		if (!issueBlocks.length) {
			return;
		}

		for (const issueBlock of issueBlocks) {
			const identifier = issueBlock.getAttribute('data-identifier')
			if (!identifier) {
				continue
			}

			const timerWidget = issueBlock.parentElement.createDiv({ cls: ['timer-control-container'] })
			timerWidget.addEventListener('timersaved', this.onTimeSaved.bind(this))

			new TimerWidget(this, timerWidget)
				.setIdentifier(identifier)
				.showTimerControl()
		}
	}

	async onTimeSaved(event: OnTimerSavedEvent): Promise<void> {
		this.timeManager.deleteById(event.detail.id)
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings)
	}
}
