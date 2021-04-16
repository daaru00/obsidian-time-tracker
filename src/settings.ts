export default interface TimerTrackerPluginSettings {
	approximation: number;
	storageFile: string;
}

export const DEFAULT_SETTINGS: TimerTrackerPluginSettings = {
	approximation: 0,
	storageFile: 'TimerTracker'
}
