import * as os from 'os'
import { Notice, Plugin, WorkspaceLeaf } from 'obsidian'
import './lib/icons'
import TimerTrackerPluginSettings, { DEFAULT_SETTINGS } from './settings'
import JiraIssueSettingTab from './settings-tab'
import TimerManager, {TimerEvent} from './lib/timer'
import TimerView, { VIEW_TYPE_OUTPUT } from './timer-view'
import TimerWidget from './timer-widget'
import FileStorage from './lib/file-storage'
import { DeleteTimerModal, PauseTimerModal, StartTimerModal, SaveTimerModal, EditTimerModal } from './timer-commands-modal'
import NewTimerModal from './new-timer-modal'
import { OnTimerSavedEvent } from './types'

const NO_TIMER_RUNNING_LABEL = 'no running timer'
const EVENT_BUS_NAME = 'time-tracker-event-bus'

declare global {
	interface Window {
		timeTrackerEventBus: Comment;
		jiraEventBus: Comment;
		redmineEventBus: Comment;
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
				new StartTimerModal(this).open()
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
				new PauseTimerModal(this).open()
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
				new DeleteTimerModal(this).open()
			},
			hotkeys: []
		})

		this.addCommand({
			id: 'app:save-timer',
			name: 'Save timer',
			callback: () => {
				new SaveTimerModal(this).open()
			},
			hotkeys: []
		})

		this.addCommand({
			id: 'app:new-timer',
			name: 'New timer',
			callback: () => {
				new NewTimerModal(this).open()
			},
			hotkeys: []
		})

		this.addCommand({
			id: 'app:edit-timer',
			name: 'Edit timer',
			callback: () => {
				new EditTimerModal(this).open()
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
		})
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
    this.timeManager.on('timer-edited', this.saveTimers.bind(this))
		this.timeManager.on('timer-saved', this.onTimerSave.bind(this))

		window.timeTrackerEventBus = document.createComment(EVENT_BUS_NAME)
		window.timeTrackerEventBus.addEventListener('timersaved', this.onTimerSaved.bind(this))
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

	async timerBlockProcessor(content: string, el: HTMLElement): Promise<void> {
		el.empty()
		el.addClasses(['timer-control-container', 'has-timer-view'])

		new TimerWidget(this, el)
			.setIdentifier(content.replace(new RegExp(os.EOL, 'g'), ''))
			.showTimerView()
			.showTimerControl()
	}

	postProcessor(el: HTMLElement): void {
		const issueBlocks = Array.from(el.querySelectorAll('.timer-tracker-compatible'))		

		if (!issueBlocks.length) {
			return
		}

		for (const issueBlock of issueBlocks) {
			const identifier = issueBlock.getAttribute('data-identifier')
			if (!identifier) {
				continue
			}

			const typeName = issueBlock.getAttribute('data-type')
			if (!typeName) {
				continue
			}

			const timerWidget = issueBlock.parentElement.createDiv({ cls: ['timer-control-container'] })

			new TimerWidget(this, timerWidget)
				.setIdentifier(identifier)
				.setType(typeName)
				.showTimerControl()
		}
	}

	onTimerSave(event: TimerEvent): void {
		const { timer } = event

		if (timer.hasTag('jira') && window.jiraEventBus) {
			window.jiraEventBus.dispatchEvent(new CustomEvent('timersave', {
				detail: {
					id: timer.id,
					duration: timer.getApproximatedDuration(this.settings.approximation),
					startedAt: timer.startedAt,
					tags: timer.tags
				}
			}))
			// this.onTimerSaved will be fired by jira plugin
			return
		}

		if (timer.hasTag('redmine') && window.redmineEventBus) {
			window.redmineEventBus.dispatchEvent(new CustomEvent('timersave', {
				detail: {
					id: timer.id,
					duration: timer.getApproximatedDuration(this.settings.approximation),
					startedAt: timer.startedAt,
					tags: timer.tags
				}
			}))
			// this.onTimerSaved will be fired by redmine plugin
			return
		}
		
		this.fileStorage.save(timer).then(() => {
			if (timer.hasTag('pomodoro')) {
				new Notice(`Pomodoro saved to file '${this.settings.storageFile}'`)
			} else {
				new Notice(`Timer saved to file '${this.settings.storageFile}'`)
			}
			this.onTimerSaved({
				detail: {
					id: timer.id,
					tags: timer.tags
				}
			})
		})
	}

	onTimerSaved(event: OnTimerSavedEvent): void {
		if (event.detail.tags.includes('pomodoro')) {
			return
		}
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

	onunload(): void {
		delete window.timeTrackerEventBus
	}
}
