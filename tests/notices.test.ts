import { describe, expect, it } from 'vitest';
import { plainNotice } from '../src/ui/notices';

describe('plain notices', () => {
  it('turns shouting into sentences', () => {
    expect(plainNotice('MATERIALS COMMITTED · CREW MUST WORK NEAR SITE')).toBe('Materials committed. Crew must work near site.');
    expect(plainNotice('CREW WORK COMPLETE · NO ACTIVE ORDERS')).toBe('Crew work complete. No active orders.');
    expect(plainNotice('QUEUE LIMIT: 16 ORDERS')).toBe('Queue limit: 16 orders.');
  });

  it('keeps key letters and key names capitalised', () => {
    expect(plainNotice('CHECKPOINT SAVED · K TO UPDATE · L TO LOAD')).toBe('Checkpoint saved. K to update. L to load.');
    expect(plainNotice('AIRLOCK OPEN · A/D WALK · SPACE JUMP')).toBe('Airlock open. A/D walk. Space jump.');
    expect(plainNotice('FACILITY WRECKED · U TO REPAIR')).toBe('Facility wrecked. U to repair.');
    expect(plainNotice('LAUNCH ABOVE 200 m BEFORE STARTING A PATROL · SAVE WITH K FIRST')).toBe(
      'Launch above 200 m before starting a patrol. Save with K first.',
    );
  });

  it('keeps names and units, and drops internal words', () => {
    expect(plainNotice('SELENE AND NACRE')).toBe('Selene and Nacre.');
    expect(plainNotice('FUEL TRANSFERRED · +12.5 kg')).toBe('Fuel transferred. +12.5 kg.');
    expect(plainNotice('SERVICE NEEDS 2 kJ OF STORED POWER')).toBe('Service needs 2 kJ of stored power.');
    expect(plainNotice('CHECKPOINT INVALID · NEW RUNTIME STARTED · OLD SAVE KEPT')).toBe(
      'Checkpoint invalid. New game started. Old save kept.',
    );
    expect(plainNotice('NO AVAILABLE WORK · QUEUE A PAID SITE FIRST')).toBe('No available work. Queue a building site first.');
  });

  it('leaves sentences that already read well alone', () => {
    expect(plainNotice('Keep the landing pad clear')).toBe('Keep the landing pad clear.');
    expect(plainNotice('Needs 2 more wire.')).toBe('Needs 2 more wire.');
    expect(plainNotice('')).toBe('');
  });

  it('handles messages with embedded numbers and punctuation', () => {
    expect(plainNotice('FACILITY #3 UPGRADED TO TIER 2 · CAPACITY STARTS EMPTY')).toBe('Facility #3 upgraded to tier 2. Capacity starts empty.');
    expect(plainNotice('NO SAFE TOW TARGET · WITHIN 180 m · MATCH VELOCITY TO 15 m/s · CLEAR THE TERRAIN')).toBe(
      'No safe tow target. Within 180 m. Match velocity to 15 m/s. Clear the terrain.',
    );
  });
});
