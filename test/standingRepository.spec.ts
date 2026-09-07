import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { upsertStandings } from '../src/repositories/standingRepository';
it('stores and updates the standings display name without changing player identity', async () => {
 await env.DB.exec('CREATE TABLE tournament_standings (tournament_id INTEGER, player_id INTEGER, standing INTEGER, record_wins INTEGER, record_losses INTEGER, record_ties INTEGER, deck_limitless_id TEXT, deck_name TEXT, decklist_export TEXT, player_display_name TEXT, updated_at TEXT, UNIQUE(tournament_id,player_id));');
 const row = {tournamentId:1,playerId:2,placing:1,wins:3,losses:0,ties:0,deckLimitlessId:'deck',deckName:'Deck',decklistExport:'cards',playerDisplayName:'Limitless Name'};
 await upsertStandings(env.DB,[row]);
 await upsertStandings(env.DB,[{...row,playerDisplayName:'Updated Name'}]);
 const results=await env.DB.prepare('SELECT player_id, player_display_name, decklist_export FROM tournament_standings').all();
 expect(results.results).toEqual([{player_id:2,player_display_name:'Updated Name',decklist_export:'cards'}]);
});
