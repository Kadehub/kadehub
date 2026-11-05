import { describe, expect, it } from 'vitest';
import { isTrackedPage } from './meta-pixel';
import { requiresOptIn } from './privacy-consent';

const LIVE = 'kadehub.com';

describe('isTrackedPage', () => {
  it.each([
    ['kadehub.com', '/'],
    ['www.kadehub.com', '/'],
    ['pos.kadehub.com', '/'],
    ['pos.kadehub.com', '/register'],
    ['pos.kadehub.com', '/landing'],
    ['cod.kadehub.com', '/'],
    ['cod.kadehub.com', '/register'],
    ['staff.kadehub.com', '/'],
    ['staff.kadehub.com', '/register'],
    ['tasks.kadehub.com', '/'],
    ['tasks.kadehub.com', '/register'],
  ])('tracks %s%s', (host, path) => {
    expect(isTrackedPage(host, path, LIVE)).toBe(true);
  });

  it.each([
    ['cod.kadehub.com', '/orders'],
    ['cod.kadehub.com', '/orders/12'],
    ['pos.kadehub.com', '/dashboard'],
    ['staff.kadehub.com', '/jobs/abc123'],
    ['cod.kadehub.com', '/login'],
    ['kadehub.com', '/super-admin'],
    ['kadehub.com', '/account'],
    ['tasks.kadehub.com', '/u/5'],
    ['kadehub.com', '/privacy'],
  ])('leaves out the private page %s%s', (host, path) => {
    expect(isTrackedPage(host, path, LIVE)).toBe(false);
  });

  it('leaves out shop addresses', () => {
    expect(isTrackedPage('acme.kadehub.com', '/', LIVE)).toBe(false);
  });

  it('leaves out local and staging roots', () => {
    expect(isTrackedPage('localhost:3000', '/', LIVE)).toBe(false);
    expect(isTrackedPage('cod.lvh.me:3000', '/', 'lvh.me:3000')).toBe(false);
  });
});

describe('requiresOptIn', () => {
  it.each(['DE', 'FR', 'IE', 'NO', 'GB', 'CH', 'de'])('needs a prior yes in %s', country => {
    expect(requiresOptIn(country)).toBe(true);
  });

  it.each(['LK', 'US', 'IN', 'AE', 'AU'])('runs with notice and opt-out in %s', country => {
    expect(requiresOptIn(country)).toBe(false);
  });

  it.each([null, undefined, '', 'XX', 'T1'])('takes the stricter path when the location is %s', country => {
    expect(requiresOptIn(country)).toBe(true);
  });
});
