export function getYesterdayUtcDate(): string {
	const now = new Date();
	const yesterday = new Date(now);

	yesterday.setUTCDate(now.getUTCDate() - 1);

	return yesterday.toISOString().slice(0, 10);
}

export function getDatePart(value: string): string {
	return value.slice(0, 10);
}
