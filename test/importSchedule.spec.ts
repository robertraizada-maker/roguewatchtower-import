import { env } from "cloudflare:test";
import { beforeEach, expect, it, vi } from "vitest";
import worker from "../src/index";
import { ImportService } from "../src/services/importService";
import { triggerPagesDeploy } from "../src/utils/triggerPagesDeploy";
vi.mock("../src/services/importService", () => ({ ImportService: vi.fn() }));
vi.mock("../src/utils/triggerPagesDeploy", () => ({ triggerPagesDeploy: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
it.each([
    ["2026-01-15T06:00:00Z", false], ["2026-01-15T15:00:00Z", true],
    ["2026-07-15T05:00:00Z", false], ["2026-07-15T14:00:00Z", true],
])("uses the correct import mode at %s", async (timestamp, incremental) => {
    const importDate = vi.fn().mockResolvedValue({ reportDate: "date", importRunId: 1 });
    vi.mocked(ImportService).mockImplementation(() => ({ importDate }) as unknown as ImportService);
    await worker.scheduled({ scheduledTime: Date.parse(timestamp as string), cron: "cron" } as ScheduledController, env);
    expect(importDate).toHaveBeenCalledWith((timestamp as string).slice(0, 8) + "14", incremental);
    expect(triggerPagesDeploy).toHaveBeenCalledTimes(1);
});
it("does not rebuild the website after an import or snapshot failure", async () => {
    vi.mocked(ImportService).mockImplementation(() => ({ importDate: vi.fn().mockRejectedValue(new Error("failed")) }) as unknown as ImportService);
    await expect(worker.scheduled({ scheduledTime: Date.parse("2026-07-15T14:00:00Z"), cron: "cron" } as ScheduledController, env)).rejects.toThrow("failed");
    expect(triggerPagesDeploy).not.toHaveBeenCalled();
});
