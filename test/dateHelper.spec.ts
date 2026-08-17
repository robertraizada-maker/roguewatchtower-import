import { describe, expect, it } from "vitest";

import {
	getYesterdayInImportTimeZone,
	isImportScheduleTime,
} from "../src/utils/dateHelper";

describe("UK import schedule", () => {
	it.each([
		"2026-01-15T06:00:00.000Z",
		"2026-01-15T15:00:00.000Z",
		"2026-07-15T05:00:00.000Z",
		"2026-07-15T14:00:00.000Z",
	])("runs at 06:00 and 15:00 UK time (%s)", (timestamp) => {
		expect(isImportScheduleTime(new Date(timestamp))).toBe(true);
	});

	it.each([
		"2026-01-15T05:00:00.000Z",
		"2026-01-15T14:00:00.000Z",
		"2026-07-15T06:00:00.000Z",
		"2026-07-15T15:00:00.000Z",
	])("skips the inactive UTC cron during GMT or BST (%s)", (timestamp) => {
		expect(isImportScheduleTime(new Date(timestamp))).toBe(false);
	});

	it("uses the previous UK calendar date", () => {
		expect(
			getYesterdayInImportTimeZone(new Date("2026-07-15T05:00:00.000Z"))
		).toBe("2026-07-14");
	});
});