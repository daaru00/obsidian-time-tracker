import { ButtonComponent, Modal, Setting } from 'obsidian'
import TimerTrackerPlugin from './main'

export default class NewTimerModal extends Modal {
  plugin: TimerTrackerPlugin

	constructor(plugin: TimerTrackerPlugin) {
		super(plugin.app)
    this.plugin = plugin
	}

  onOpen(): void {
    this.contentEl.empty()

    this.contentEl.createEl('h2', {
      text: 'Start a new timer',
      cls: ['time-tracker-modal-title']
    })

    const form = this.contentEl.createEl('form')

    let identifier = ''
    new Setting(form)
      .setName('Identifier')
      .setDesc('It must be unique')
      .addText(text => text
        .setValue(identifier)
        .onChange(async (value) => {
          identifier = value
        })
        .inputEl
          .focus()
      )

    const commandContainer = form.createDiv({ cls: ['time-tracker-modal-commands'] })
    const btnSave = new ButtonComponent(commandContainer)
      .setButtonText('start')
    
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const modal = this
    form.onsubmit = function(event) {
      event.stopPropagation()

      if (identifier.trim().length === 0) {
        return
      }
      btnSave.setDisabled(true)

      try {
        const timer = modal.plugin.timeManager.createNew(identifier)  
        timer.start()
      } finally {
        btnSave.setDisabled(false)
      }
      
      modal.close()
    }
  }
}
