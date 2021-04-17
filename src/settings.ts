export default interface TimerTrackerPluginSettings {
	approximation: number;
	storageFile: string;
	enableStatusBar: boolean;
}

export const DEFAULT_SETTINGS: TimerTrackerPluginSettings = {
	approximation: 0,
	storageFile: 'TimerTracker',
	enableStatusBar: true
}
