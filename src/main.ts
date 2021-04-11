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
	}

	async timerBlockProcessor(content: string, el: HTMLElement): Promise<void> {
		el.empty()

		new TimerWidget(this, el, null)
			.setIdentifier(content.replace(new RegExp(os.EOL, 'g'), ''))
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

			new TimerWidget(this, timerWidget, issueBlock)
				.setIdentifier(identifier)
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
