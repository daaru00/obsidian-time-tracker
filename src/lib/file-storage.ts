import { TFile } from 'obsidian'
import TimerTrackerPlugin from '../main'
import * as os from 'os'
import { Timer } from './timer'

export default class FileStorage {
  plugin: TimerTrackerPlugin

  constructor(plugin: TimerTrackerPlugin) {
    this.plugin = plugin
  }

  getStorageFilePath(): string {
    const { settings } = this.plugin
    return settings.storageFile.endsWith('.md') ? settings.storageFile : `${settings.storageFile}.md`
  }

  getStorageFile(): TFile|undefined {
    const { vault } = this.plugin.app
    const filePath = this.getStorageFilePath()

    return vault.getFiles().find(file => file.path === filePath)
  }

  formatTimerData(timer: Timer): string {
    const { settings } = this.plugin
    const duration = timer.getApproximatedDuration(settings.approximation)
    return timer.id + ': `' + timer.getFormattedDurationString(duration) +'`'
  }

  formatHeader(): string {
    const todayDate = (new Date()).toISOString().substr(0, 10)
    return `## ${todayDate}`
  }

  async save(timer: Timer): Promise<void> {
    const { vault } = this.plugin.app

    const filePath = this.getStorageFilePath()
    const header = this.formatHeader()
    const data = this.formatTimerData(timer)

    let file = this.getStorageFile()
    if (file) {
      const content = await vault.read(file)
      let newContent = content.toString()

      if (!content.contains(header)) {
        if (content.trim().length > 0) {
          newContent += os.EOL + os.EOL
        }
        newContent += header + os.EOL
      }

      await vault.modify(file, newContent + os.EOL + data)
    } else {
      file = await vault.create(filePath, header + os.EOL + os.EOL + data)
    }
  }
}
