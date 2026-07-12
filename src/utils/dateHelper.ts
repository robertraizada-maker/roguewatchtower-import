const DEFAULT_IMPORT_TIME_ZONE = "UTC";

function getDatePartsInTimeZone(date: Date, timeZone: string) {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);

	const value = (type: string) => {
		const part = parts.find((item) => item.type === type);

		if (!part) {
			throw new Error(`Missing ${type} date part`);
		}

		return Number(part.value);
	};

	return {
		year: value("year"),
		month: value("month"),
		day: value("day"),
	};
}

function formatDateParts(date: Date) {
	return date.toISOString().slice(0, 10);
}

export function getYesterdayUtcDate(): string {
	const now = new Date();
	const yesterday = new Date(now);

	yesterday.setUTCDate(now.getUTCDate() - 1);

	return yesterday.toISOString().slice(0, 10);
}

export function getDatePart(value: string): string {
	return value.slice(0, 10);
}

export function getUtcDateDaysAgo(daysAgo: number): string {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - daysAgo);

	return date.toISOString().substring(0, 10);
}

export function getDateDaysAgoInTimeZone(
	daysAgo: number,
	timeZone = DEFAULT_IMPORT_TIME_ZONE,
	now = new Date()
): string {
	const current = getDatePartsInTimeZone(now, timeZone);
	const targetDate = new Date(
		Date.UTC(current.year, current.month - 1, current.day - daysAgo)
	);

	return formatDateParts(targetDate);
}

export function getYesterdayInImportTimeZone(now = new Date()): string {
	return getDateDaysAgoInTimeZone(1, DEFAULT_IMPORT_TIME_ZONE, now);
}

export function isImportScheduleTime(now: Date): boolean {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: DEFAULT_IMPORT_TIME_ZONE,
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
	}).formatToParts(now);

	const value = (type: string) =>
		parts.find((item) => item.type === type)?.value;

	return value("hour") === "00" && value("minute") === "15";
}
