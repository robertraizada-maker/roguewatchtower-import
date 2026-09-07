import { describe, expect, it } from "vitest";
import { requireAdminApiToken } from "../src/utils/adminAuth";

describe("requireAdminApiToken", () => {
	it("fails closed when the token is not configured", () => {
		expect(requireAdminApiToken(new Request("https://api.example/import"), {})?.status).toBe(503);
	});

	it("rejects missing and incorrect bearer tokens", () => {
		const env = { ADMIN_API_TOKEN: "correct-token" };
		expect(requireAdminApiToken(new Request("https://api.example/import"), env)?.status).toBe(401);
		expect(requireAdminApiToken(new Request("https://api.example/import-range", {
			headers: { Authorization: "Bearer wrong-token" },
		}), env)?.status).toBe(401);
	});

	it("accepts the configured bearer token", () => {
		expect(requireAdminApiToken(new Request("https://api.example/import", {
			headers: { Authorization: "Bearer correct-token" },
		}), { ADMIN_API_TOKEN: "correct-token" })).toBeNull();
	});
});