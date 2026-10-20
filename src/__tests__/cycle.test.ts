import { describe, expect, it } from 'vitest';
import { activity, activeGroups, cycleNumber, rotationRate, spotsAt, CYCLE25_MIN } from '../cycle.js';

describe('solar cycle model', () => {
	it('activity is ~0 at minimum and peaks ~4 years later', () => {
		expect(activity(CYCLE25_MIN)).toBeLessThan(0.01);
		expect(activity(CYCLE25_MIN + 4.07)).toBeGreaterThan(0.99);
		expect(activity(CYCLE25_MIN + 10.5)).toBeLessThan(0.05);
	});

	it('numbers cycles from Cycle 25', () => {
		expect(cycleNumber(2024)).toBe(25);
		expect(cycleNumber(2032)).toBe(26);
	});

	it('equator rotates faster than high latitudes (Snodgrass)', () => {
		expect(rotationRate(0)).toBeCloseTo(14.713, 3);
		expect(rotationRate(60)).toBeLessThan(rotationRate(30));
	});

	it('more groups near maximum than near minimum (averaged over a year)', () => {
		const count = (y0: number) => {
			let n = 0;
			for (let d = 0; d < 365; d += 5) n += activeGroups(y0 + d / 365.25).length;
			return n / 73;
		};
		const atMax = count(CYCLE25_MIN + 3.6);
		const atMin = count(CYCLE25_MIN + 10.6);
		expect(atMax).toBeGreaterThan(8);
		expect(atMin).toBeLessThan(atMax / 4);
	});

	it("latitudes follow Spörer's law: high early in the cycle, low late", () => {
		const meanLat = (y0: number) => {
			const lats: number[] = [];
			for (let d = 0; d < 365; d += 3) for (const g of activeGroups(y0 + d / 365.25)) lats.push(Math.abs(g.latDeg));
			return lats.reduce((s, x) => s + x, 0) / lats.length;
		};
		expect(meanLat(CYCLE25_MIN + 1.5)).toBeGreaterThan(meanLat(CYCLE25_MIN + 8.5) + 8);
	});

	it('is deterministic and spot directions are unit vectors', () => {
		const a = spotsAt(2025.3, 48);
		const b = spotsAt(2025.3, 48);
		expect(a).toEqual(b);
		expect(a.length).toBeGreaterThan(0);
		for (const s of a) expect(Math.hypot(...s.dir)).toBeCloseTo(1, 9);
	});
});
