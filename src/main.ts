import * as os from 'os'
import { Notice, Plugin, WorkspaceLeaf } from 'obsidian'
import TimerTrackerPluginSettings, { DEFAULT_SETTINGS } from './settings'
import JiraIssueSettingTab from './settings-tab'
import TimerManager from './lib/timer'
import TimerView, { VIEW_TYPE_OUTPUT } from './timer-view'
import TimerWidget from './timer-widget'
import { OnTimerSaveEvent } from './types'
import FileStorage from './lib/file-storage'
import { DeleteTimerModal, PauseTimerModal, StartTimerModal, SaveTimerModal } from './timer-modal'

const NO_TIMER_RUNNING_LABEL = 'no running timer'

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
	fileStorage: FileStorage

	async onload(): Promise<void> {
		await this.loadSettings()
		this.addSettingTab(new JiraIssueSettingTab(this.app, this))

		this.initFileStorage()

		this.initTimerManager()
		await this.loadTimers()
		
		this.registerMarkdownCodeBlockProcessor('timetracker', this.timerBlockProcessor.bind(this))
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
			id: 'app:start-timer',
			name: 'Start timer',
			callback: () => {
				new StartTimerModal(this).open();
			},
			hotkeys: []
		})

		this.addCommand({
			id: 'app:pause-all-timers',
			name: 'Pause all timers',
			callback: () => this.timeManager.pauseAll(),
			hotkeys: []
		})

		this.addCommand({
			id: 'app:pause-timer',
			name: 'Pause timer',
			callback: () => {
				new PauseTimerModal(this).open();
			},
			hotkeys: []
		})

		this.addCommand({
			id: 'app:delete-all-timers',
			name: 'Delete all timers',
			callback: () => this.timeManager.deleteAll(),
			hotkeys: []
		})

		this.addCommand({
			id: 'app:delete-timer',
			name: 'Delete timer',
			callback: () => {
				new DeleteTimerModal(this).open();
			},
			hotkeys: []
		})

		this.addCommand({
			id: 'app:save-timer',
			name: 'Save timer',
			callback: () => {
				new SaveTimerModal(this).open();
			},
			hotkeys: []
		})

		this.initStatusBar()
		this.registerInterval(window.setInterval(() => {
			this.refreshStatusBar()
			window.document.querySelectorAll('.timer-control-container.has-timer-view')
				.forEach(timeWidget => timeWidget.dispatchEvent(new CustomEvent('tick')))
		}, 1000))
	}

	initStatusBar(): void {
		if (!this.settings.enableStatusBar) {
			if (this.statusBarItem) {
				this.statusBarItem.remove()
				this.statusBarItem = null
			}
			return
		}

		if (this.statusBarItem) {
			return
		}

		this.statusBarItem = this.addStatusBarItem()
		this.statusBarItem.addClass('timer-view-status-bar')
	}

	refreshStatusBar(): void {
		if (!this.statusBarItem) {
			return
		}
		
		const runningTimer = this.timeManager.getRunningTimer()
		if (!runningTimer) {
			this.statusBarItem.innerHTML = NO_TIMER_RUNNING_LABEL
			return
		}

		this.statusBarItem.empty()
		this.statusBarItem.createSpan({
			text: runningTimer.id
		})
		this.statusBarItem.createSpan({
			text: runningTimer.getFormattedDurationString()
		}).addClass('timer-view')
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

	initFileStorage(): void {
		this.fileStorage = new FileStorage(this)
	}

	initTimerManager(): void {
		this.timeManager = new TimerManager()
		this.timeManager.on('timer-start', this.saveTimers.bind(this))
    this.timeManager.on('timer-paused', this.saveTimers.bind(this))
    this.timeManager.on('timer-resumed', this.saveTimers.bind(this))
    this.timeManager.on('timer-reset', this.saveTimers.bind(this))
    this.timeManager.on('timer-deleted', this.saveTimers.bind(this))
		this.timeManager.on('timer-saved', ({ timer }) => {
			if (timer.hasTag('external') === false) {
				this.fileStorage.save(timer).then(() => {
					new Notice(`Timer saved to file '${this.settings.storageFile}'`)
					this.onTimeSaved({
						detail: timer
					})
				})
				return
			}

			const issueBlock = window.document.querySelector(`.timer-tracker-compatible[data-identifier="${timer.id}"]`)
			if (!issueBlock) {
				return
			}

			const event: OnTimerSaveEvent = {
				detail: {
					id: timer.id,
					duration: timer.getApproximatedDuration(this.settings.approximation),
					startedAt: timer.startedAt
				}
			}
			
			issueBlock.dispatchEvent(new CustomEvent('timersave', event))
		})
	}

	async timerBlockProcessor(content: string, el: HTMLElement): Promise<void> {
		el.empty()
		el.addClasses(['timer-control-container', 'has-timer-view'])

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
				.setExternalSource(true)
		}
	}

	async onTimeSaved(event: OnTimerSavedEvent): Promise<void> {
		this.timeManager.deleteById(event.detail.id)
	}

	async loadSettings(): Promise<void> {
		let data  = await this.loadData()
		data = data || {settings:{}}
		this.settings = Object.assign({}, DEFAULT_SETTINGS, data.settings || {})
	}

	async loadTimers(): Promise<void> {
		let data  = await this.loadData()
		data = data || {timers:[]}
		if (data.timers.length === 0) {
			return
		}
		this.timeManager.restore(data.timers)
	}

	async saveSettings(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			timers: this.timeManager.dump()
		})
		this.initStatusBar()
	}

	async saveTimers(): Promise<void> {
		await this.saveData({
			settings: this.settings,
			timers: this.timeManager.dump()
		})
	}
}
