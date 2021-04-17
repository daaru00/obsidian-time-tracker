import { App, PluginSettingTab, Setting } from 'obsidian'
import TimerTrackerPlugin from './main'

export default class TimeTrackerIssueSettingTab extends PluginSettingTab {
	plugin: TimerTrackerPlugin;

	constructor(app: App, plugin: TimerTrackerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	async display(): Promise<void> {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Timer approximation')
			.setDesc('Round spent time')
			.addDropdown(dropdown => dropdown
				.addOptions({
					'0': "disabled",
					'60': "1 minute",
					'300': "5 minutes",
					'600': "10 minutes",
					'900': "15 minutes"
				})
				.setValue(this.plugin.settings.approximation.toString())
				.onChange(async (value) => {
					this.plugin.settings.approximation = parseInt(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
      .setName('Storage file')
			.setDesc('The path of file used to store saved timers')
      .addText(text => text
        .setValue(this.plugin.settings.storageFile)
        .onChange(async (value) => {
          this.plugin.settings.storageFile = value
					await this.plugin.saveSettings();
        }))

		new Setting(containerEl)
      .setName('Status bar item')
			.setDesc('Enable the status bar item for current running timer')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableStatusBar)
        .onChange(async (value) => {
          this.plugin.settings.enableStatusBar = value
					await this.plugin.saveSettings();
        }))
	}
}
