# All-time search deployment (2026-09-09)

Production Worker version: e1109b98-0fd7-4e02-bd2a-fb4cd2465767.

Adds optional range=all to /meta/available-dates. Default requests still return the latest 28 reports. All-time requests return every completed report date and use a separate cache key. Verified 116 dates, starting 2026-05-16.

The production artifact is based on the previously active import-history hotfix cde72ca7-637d-4e00-ac34-8e729ead1711, preserving its dynamic ranking behavior and paused cron schedule. The pending snapshot rollout remains separate. Matching source changes are included in src/index.ts and src/repositories/metaRepository.ts.

Reproduce using:

    node scripts/build-search-history-hotfix.mjs .cache/import-history-hotfix/index.mjs .cache/import-history-hotfix/wrangler.json .cache/search-history-hotfix

Validate with the existing import-history hotfix regression script and Wrangler dry-run. Checks passed for default/all-time SQL, import history behavior, and artifact reproducibility. The website now exports all historical decks-of-the-day pages for working search result links.
