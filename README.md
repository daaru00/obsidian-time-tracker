# Obsidian Timer Tracker Plugin

An [Obsidian.md](https://obsidian.md/) plugin that help to keep track of time spent on different tasks.

## Usage

Add this code block where you want to show the timer widget:
````makrdown
```timetracker
example-identifier
```
````

Interact with timers, start, pause, resume, delete:

![time tracker](./doc/gifs/timers.gif)

## Commands

You can also use commands to interact with timer in the same way as the UI:

![time tracker commands](./doc/gifs/timers-commands.gif)

## Saving

When you use the stop action for a timer it will be deleted from the list of timers and saved into a configurable "storage file":

![time tracker save](./doc/gifs/save-timers.gif)

The plugin will create an title header for each day:

![time tracker save different days](./doc/gifs/save-timers-different-days.gif)

## Compatible Plugins

This plugin is compatible with [Jira Issue](https://github.com/daaru00/obsidian-jira-issue) and [Redmine Issue](https://github.com/daaru00/obsidian-redmine-issue) widgets.

With these plugins you will be able to save timers to a remote system like Redmine or Jira.
