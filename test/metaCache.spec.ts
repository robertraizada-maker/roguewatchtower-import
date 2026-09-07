import { describe, expect, it } from "vitest";
import { getMetaCacheKey, getRogueCacheTtl } from "../src/utils/metaCache";

describe("meta cache", () => {
	it("normalises rogue cache keys and ignores cache-busting parameters", () => {
		const request = new Request(
			"https://api.example/meta/rogue?date=2026-09-03&build=abc"
		);

		expect(getMetaCacheKey(request, "2026-09-03").toString()).toBe(
			"https://api.example/meta/rogue?names=limitless-v2&date=2026-09-03"
		);
	});

	it("uses a short TTL for recent dates and a long TTL for history", () => {
		const now = new Date("2026-09-04T12:00:00Z");

		expect(getRogueCacheTtl("2026-09-03", now)).toBe(300);
		expect(getRogueCacheTtl("2026-08-01", now)).toBe(86400);
	});
});