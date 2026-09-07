1. Install Node 22
2. npm install
3. npx wrangler login
4. Create .dev.vars
5. Create .env.local
6. npm run dev

## Incremental imports and saved rankings

- 06:00 Europe/London: full import of yesterday, then calculate and save yesterday's top five.
- 15:00 Europe/London: fetch yesterday's source results, compare against existing standings, and write only new or changed tournaments, players and results. This catches late placements and decklists as well as newly listed tournaments. Unchanged records retain their timestamps.
- Limitless standings are still fetched to detect changes; the importer has no reliable source completion marker that would let it skip that request safely.
- Both successful runs publish the snapshot before triggering the static website rebuild. Player points and ranking pages are generated during that build, not on visitor page loads.
- Public /meta/rogue requests perform one primary-key lookup in ranking_snapshots. They never calculate rankings, even if a snapshot is missing (503). An empty saved array is a valid ranking.
- API responses are not cached across refreshes; the static website serves visitors and Next's build fetch cache deduplicates its requests. Available dates also refresh immediately after an import.
- A failed ranking calculation retains the previous snapshot and prevents the scheduled website rebuild. Import logs/responses include mode, standingsWritten and tournamentsUnchanged.
- Manual imports and the protected repopulate action also save snapshots. Historical imports/deletions refresh existing later snapshots within the affected 28-day meta window. Changing meta criteria requires using Repopulate for the affected report dates to update saved rankings.

### First production rollout

Wait until D1 reads are available. No production migration or deployment is performed by the test suite.

1. Ensure existing schema migrations through 012 are applied. In particular, apply 011_optimize_meta_reads.sql if not already applied; its indexes reduce the scheduled calculations' reads.
2. Apply the new table: npx wrangler d1 execute roguewatchtower-db --remote --file database/013_add_ranking_snapshots.sql
3. Deploy the worker: npm run deploy
4. Set API_BASE_URL to the worker URL and ADMIN_API_TOKEN to the existing admin token in your shell environment, then run: node scripts/populate-ranking-snapshots.mjs
5. Rebuild the website once after every historical snapshot is populated. The next scheduled run continues the normal twice-daily cycle.

The population script fills the latest 28 imported dates, skips saved dates, stops on errors, and can be resumed. It uses the protected repopulate endpoint with redeploy:false so it does not launch a website build for each date. Historical population still runs expensive calculations once per date: if it exhausts the quota, resume after the reset. Do not rebuild during partial population. The existing static website remains available during rollout, but unsaved dates on the API return 503 until populated.

For an explicit recalculation of an existing date, POST JSON {"date":"YYYY-MM-DD","redeploy":false} to /admin/deck-of-the-day/repopulate with the same bearer token, then rebuild once when all requested dates are ready.

### Additional database savings

Player upserts reuse existing IDs without updating unchanged countries, including when tournament results change. Identity lookups use batches of at most 90 names. Ranking calculation uses a windowed minimum so the daily candidate joins are evaluated once rather than repeated for the best-finish join. Regression tests compare the previous SQL with ties, Other decks, date boundaries and small events. A local comparison also matched all 28 historical report dates; production quota savings still need measurement after rollout.

### Scheduled imports paused for rollout (2026-09-07)

The user authorized pausing the live cron trigger and restoring it after the next completed update. `wrangler.jsonc` deliberately contains `crons: []` so deploying the importer during rollout does not prematurely restart imports. Keep it paused while deploying the optimized worker, populating historical snapshots, importing the missed report date(s), and publishing/verifying the website. Once those steps succeed, restore `crons: ["0 5,6,14,15 * * *"]` and run `npx wrangler triggers deploy`. The handler selects 06:00 and 15:00 Europe/London from these UTC triggers. No further user permission is needed to restore the schedule after that successful rollout.
