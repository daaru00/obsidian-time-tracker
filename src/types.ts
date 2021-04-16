export interface OnTimerSaveEvent {
	detail: {
		id: string,
    duration: number,
		startedAt: Date
	}
}
