import TimerTrackerPlugin from './main';
import { ItemView, WorkspaceLeaf } from "obsidian";

export const VIEW_TYPE_OUTPUT = 'jira-timers'

export default class TimerView extends ItemView {
	outputElem: HTMLElement;
	plugin: TimerTrackerPlugin
  timerList: HTMLUListElement;

	constructor(leaf: WorkspaceLeaf, plugin: TimerTrackerPlugin) {
		super(leaf);
		this.plugin = plugin
	}

	getViewType(): string {
		return VIEW_TYPE_OUTPUT;
	}

	getDisplayText(): string {
		return 'Jira timers';
	}

	// getIcon(): string {
	// 	return "jira";
	// }

	async onOpen(): Promise<void> {
		const { containerEl } = this;
		containerEl.empty();
    this.timerList = containerEl.createEl('ul')
    this.registerInterval(window.setInterval(this.drawTimerList.bind(this), 500))
	}

  drawTimerList(): void {
    this.timerList.empty()

    const timers = this.plugin.timeManager.getAll()
    for (const timer of timers) {
      this.timerList.createEl('li', {
        text: timer.getFormattedDurationString()
      })
    }
  }
}
