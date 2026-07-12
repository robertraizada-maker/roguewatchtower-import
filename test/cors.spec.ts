import { describe, expect, it } from "vitest";
import {
	corsHeaders,
	corsPreflightResponse,
	getAllowedOrigins,
	isOriginAllowed,
	jsonWithCors,
} from "../src/utils/cors";

describe("cors", () => {
	it("allows configured production origins", () => {
		const env = {
			ALLOWED_ORIGINS:
				"https://roguewatchtower.pages.dev,https://roguewatchtower.com",
		};

		expect(getAllowedOrigins(env)).toEqual([
			"https://roguewatchtower.pages.dev",
			"https://roguewatchtower.com",
		]);
		expect(
			isOriginAllowed("https://roguewatchtower.com", env)
		).toBe(true);
		expect(isOriginAllowed("https://evil.example", env)).toBe(false);
	});

	it("returns CORS headers for allowed origins", () => {
		const request = new Request("https://api.example/meta/available-dates", {
			headers: {
				Origin: "http://localhost:3000",
			},
		});

		expect(corsHeaders(request, {})).toEqual({
			"Access-Control-Allow-Origin": "http://localhost:3000",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Max-Age": "86400",
			Vary: "Origin",
		});
	});

	it("handles preflight requests", async () => {
		const request = new Request("https://api.example/meta/available-dates", {
			method: "OPTIONS",
			headers: {
				Origin: "http://localhost:3000",
			},
		});

		const response = corsPreflightResponse(request, {});

		expect(response.status).toBe(204);
		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			"http://localhost:3000"
		);
	});

	it("wraps JSON responses with CORS headers", async () => {
		const request = new Request("https://api.example/meta/rogue", {
			headers: {
				Origin: "http://localhost:3000",
			},
		});

		const response = jsonWithCors(request, {}, { success: true, dates: [] });

		expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
			"http://localhost:3000"
		);
		expect(await response.json()).toEqual({ success: true, dates: [] });
	});
});
