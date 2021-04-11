import * as os from 'os'
import { Plugin, WorkspaceLeaf } from 'obsidian'
import TimerTrackerPluginSettings, { DEFAULT_SETTINGS } from './settings'
import JiraIssueSettingTab from './settings-tab'
import TimerManager from './lib/timer'
import TimerView, { VIEW_TYPE_OUTPUT } from './timer-view'
import SaveModal from './save-modal'
import TimerWidget from './timer-widget'

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
		this.timeManager.on('timer-save', (event) => {
			new SaveModal(this, event.timer).open()
		})
	}

	async timerBlockProcessor(content: string, el: HTMLElement): Promise<void> {
		el.empty()

		new TimerWidget(this, el)
			.setIdentifier(content.replace(new RegExp(os.EOL, 'g'), ''))
	}

	postProcessor(el: HTMLElement): void {
		const codeBlocks = Array.from(el.querySelectorAll(".timer-tracker-compatible"))		

		if (!codeBlocks.length) {
			return;
		}

		for (const codeBlock of codeBlocks) {
			const identifier = codeBlock.getAttribute('data-identifier')
			if (!identifier) {
				continue
			}

			const container = codeBlock.parentElement.createDiv({ cls: ['timer-control-container'] })
			new TimerWidget(this, container)
				.setIdentifier(identifier)
		}
	}

	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings)
	}
}
