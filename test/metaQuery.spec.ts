import { env } from 'cloudflare:test';
import { expect, it } from 'vitest';
import { getTopRogueDecksForDate } from '../src/repositories/metaRepository';
import originalSql from './fixtures/ranking-before-optimization.sql?raw';
import criteriaSchema from '../database/010_add_meta_deck_criteria.sql?raw';
it('preserves ranking, ties, Other identities, date bounds and small-event exclusions', async () => {
 await env.DB.exec(criteriaSchema.replace(/\n/g,' '));
 await env.DB.exec("CREATE TABLE tournaments (id INTEGER PRIMARY KEY, limitless_id TEXT, name TEXT, players INTEGER, tournament_date TEXT); CREATE INDEX dates ON tournaments(tournament_date); CREATE TABLE players(id INTEGER PRIMARY KEY, name TEXT); CREATE TABLE tournament_standings(tournament_id INTEGER, player_id INTEGER, deck_name TEXT, standing INTEGER, record_wins INTEGER, record_losses INTEGER, record_ties INTEGER, player_display_name TEXT, decklist_export TEXT, UNIQUE(tournament_id,player_id));");
 await env.DB.exec("WITH RECURSIVE n(i) AS (VALUES(1) UNION ALL SELECT i+1 FROM n WHERE i<200) INSERT INTO players SELECT i, 'Player '||i FROM n;");
 await env.DB.exec("INSERT INTO tournaments VALUES(1,'history','History',200,'2026-08-10'),(2,'daily','Daily',200,'2026-09-05T12:00:00Z'),(3,'small','Small',16,'2026-09-05'),(4,'future','Future',200,'2026-09-06'),(5,'old','Old',200,'2026-08-01');");
 await env.DB.exec("INSERT INTO tournament_standings SELECT t.id,p.id,CASE WHEN p.id%10=0 THEN 'Other' WHEN p.id%11=0 THEN 'Unknown' WHEN p.id%13=0 THEN NULL ELSE 'Deck '||(p.id%60) END, CASE WHEN p.id%17=0 THEN NULL ELSE p.id%15+1 END,3,1,0,p.name,'cards' FROM tournaments t CROSS JOIN players p;");
 for(const date of ['2026-09-05','2026-09-06','2026-10-10']) {
   const before=await env.DB.prepare(originalSql).bind(date,28,date,date,date,50,5).all();
   const after=await getTopRogueDecksForDate(env.DB,date);
   expect(after).toEqual(before.results);
   if(date==='2026-09-05') {expect(after).toHaveLength(5);expect(after.every(row=>row.tournament_id===2)).toBe(true);}
 }
});
