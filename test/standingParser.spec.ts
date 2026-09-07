import { describe, expect, it } from 'vitest';
import { parseStanding } from '../src/parsers/standingParser';
describe('Limitless display names', () => {
 it('uses only the standings name for display and retains the URL identity', () => {
 const standing = parseStanding({name:'Alexandra Montiel', player:'drallen', record:{wins:1,losses:0,ties:0}});
 expect(standing.player.displayName).toBe('Alexandra Montiel');
 expect(standing.player.name).toBe('drallen');
 });
 it.each([undefined, null, '', '  '])('rejects a missing display name instead of using a handle (%s)', name => {
 expect(() => parseStanding({name,player:'ptcgl-handle'})).toThrow('display name');
 });
});
