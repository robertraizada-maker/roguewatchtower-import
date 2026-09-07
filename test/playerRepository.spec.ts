import { env } from 'cloudflare:test';
import { beforeEach, expect, it } from 'vitest';
import { upsertPlayer, upsertPlayers } from '../src/repositories/playerRepository';
beforeEach(async () => {
 await env.DB.exec("CREATE TABLE players (id INTEGER PRIMARY KEY, name TEXT UNIQUE, country TEXT, updated_at TEXT); CREATE TABLE player_writes (name TEXT); CREATE TRIGGER count_player_updates AFTER UPDATE ON players BEGIN INSERT INTO player_writes VALUES (new.name); END;");
});
it('returns existing identities without writing unchanged players, while updating changed countries', async () => {
 const original = await upsertPlayers(env.DB, [{name:'same',country:'GB',displayName:'Same'}, {name:'changed',country:null,displayName:'Changed'}]);
 const repeated = await upsertPlayers(env.DB, [{name:'same',country:'GB',displayName:'New display'}, {name:'changed',country:'US',displayName:'Changed'}, {name:'new',country:null,displayName:'New'}]);
 expect(repeated.get('same')).toBe(original.get('same'));
 expect(repeated.get('changed')).toBe(original.get('changed'));
 expect(repeated.has('new')).toBe(true);
 expect((await env.DB.prepare('SELECT name FROM player_writes').all()).results).toEqual([{name:'changed'}]);
 expect(await upsertPlayer(env.DB,{name:'same',country:'GB',displayName:'Same'})).toBe(original.get('same'));
 expect((await env.DB.prepare('SELECT name FROM player_writes').all()).results).toHaveLength(1);
});
it('handles empty inputs, duplicate names and more than one lookup batch', async () => {
 expect((await upsertPlayers(env.DB,[])).size).toBe(0);
 const players=Array.from({length:181},(_,i)=>({name:'player'+i,country:null,displayName:'Player'}));
 const initial=await upsertPlayers(env.DB,players);
 expect(initial.size).toBe(181);
 expect(await upsertPlayers(env.DB,[...players,players[0]])).toEqual(initial);
 expect((await env.DB.prepare('SELECT name FROM player_writes').all()).results).toHaveLength(0);
});
