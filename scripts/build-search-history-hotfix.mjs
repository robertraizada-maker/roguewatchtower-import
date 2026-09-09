import fs from 'node:fs';
import path from 'node:path';
const [input, configPath, output] = process.argv.slice(2);
if (!input || !configPath || !output) throw Error('Usage: node scripts/build-search-history-hotfix.mjs <active-worker.js> <config.json> <output-directory>');
let source = fs.readFileSync(input, 'utf8');
const replaceOnce = (before, after) => {
    if (source.split(before).length !== 2) throw Error('Unexpected production source: ' + before);
    source = source.replace(before, after);
};
replaceOnce('async function getAvailableMetaDates(db)', 'async function getAvailableMetaDates(db, allTime = false)');
replaceOnce('ORDER BY report_date DESC\nLIMIT 28' + '`', 'ORDER BY report_date DESC\n' + '$' + '{allTime ? "" : "LIMIT 28"}' + '`');
replaceOnce('getAvailableMetaDates(env.DB)', 'getAvailableMetaDates(env.DB, url.searchParams.get("range") === "all")');
replaceOnce('  key.searchParams.set("names", "limitless-v2");', '  key.searchParams.set("names", "limitless-v2");\n  if (new URL(request.url).searchParams.get("range") === "all") {\n    key.searchParams.set("range", "all");\n  }');
fs.mkdirSync(output, {recursive:true});
fs.writeFileSync(path.join(output,'index.mjs'), source);
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
config.main = 'index.mjs';
config.keep_vars = true;
fs.writeFileSync(path.join(output,'wrangler.json'), JSON.stringify(config,null,2)+'\n');
