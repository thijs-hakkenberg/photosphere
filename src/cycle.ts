/**
 * Solar activity model for the procedural Sun.
 *
 * - 11-year cycle phased to the Cycle 25 minimum (Dec 2019), with a fast rise
 *   (~4 yr) and slow decline, as in observed cycles.
 * - Sunspot groups are born as a deterministic hash-driven process, so the
 *   same date always shows the same spots when scrubbing.
 * - Latitudes follow Spörer's law (butterfly diagram: ~28° at cycle start
 *   drifting to ~8° at the end); groups are tilted per Joy's law.
 * - Longitudes drift with Snodgrass differential rotation relative to the
 *   Carrington frame the mesh rotates in.
 *
 * This is a statistical model, not a forecast: future cycles repeat Cycle 25's
 * timing and amplitude.
 */

import { JD_J2000, yearToJD } from './units.js';

export const CYCLE25_MIN = 2019.96;
export const CYCLE_YEARS = 11.0;
/** Carrington sidereal rotation (deg/day): the frame the mesh spins in. */
export const CARRINGTON_DEG_PER_DAY = 360 / 25.38;
export const CARRINGTON_PERIOD_HOURS = 25.38 * 24;

export function cyclePhase(year: number): number {
	const x = (year - CYCLE25_MIN) / CYCLE_YEARS;
	return x - Math.floor(x);
}

/** Cycle number (Cycle 25 began at its Dec 2019 minimum). */
export function cycleNumber(year: number): number {
	return 25 + Math.floor((year - CYCLE25_MIN) / CYCLE_YEARS);
}

/** Relative activity 0..1: peaks ~4 yr after minimum, decays over ~7 yr. */
export function activity(year: number): number {
	const x = cyclePhase(year) / 0.37;
	return x * x * Math.exp(1 - x * x);
}

/** Snodgrass & Ulrich (1990) sidereal rotation rate (deg/day) at latitude. */
export function rotationRate(latDeg: number): number {
	const s2 = Math.sin((latDeg * Math.PI) / 180) ** 2;
	return 14.713 - 2.396 * s2 - 1.787 * s2 * s2;
}

export interface Spot {
	/** Unit direction in the Sun's body (Carrington) frame: y = rotation axis */
	dir: [number, number, number];
	/** Angular radius of the whole spot (penumbra), radians */
	radius: number;
	/** Umbra radius as a fraction of radius */
	umbra: number;
}

export interface ActiveGroup {
	latDeg: number;
	lonDeg: number;
	spots: Spot[];
	/** 0..1 through its life */
	age: number;
}

const BIN_DAYS = 1;
const MAX_LIFE_DAYS = 60;
/** Mean number of groups present on the whole sphere at cycle maximum */
const GROUPS_AT_MAX = 22;
const GROUPS_AT_MIN = 0.3;

/** Deterministic hash → [0, 1). */
function hash(a: number, b: number): number {
	let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul((b | 0) + 0x165667b1, 0x85ebca6b);
	h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
	h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
	h ^= h >>> 15;
	return (h >>> 0) / 4294967296;
}

function lifetimeDays(r: number): number {
	// Most groups are short-lived; a few large ones last two rotations
	return 3 + 55 * r * r;
}

const MEAN_LIFE = 3 + 55 / 3;

function toDir(latDeg: number, lonDeg: number): [number, number, number] {
	const la = (latDeg * Math.PI) / 180;
	const lo = (lonDeg * Math.PI) / 180;
	return [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
}

/** Active sunspot groups present at a decimal year. */
export function activeGroups(year: number): ActiveGroup[] {
	const day = yearToJD(year) - JD_J2000;
	const out: ActiveGroup[] = [];
	const first = Math.floor((day - MAX_LIFE_DAYS) / BIN_DAYS);
	const last = Math.floor(day / BIN_DAYS);
	for (let bin = first; bin <= last; bin++) {
		const birth = bin * BIN_DAYS;
		const birthYear = year - (day - birth) / 365.25;
		const a = activity(birthYear);
		const expected = ((GROUPS_AT_MIN + (GROUPS_AT_MAX - GROUPS_AT_MIN) * a) / MEAN_LIFE) * BIN_DAYS;
		// Up to 3 births per bin, each with probability expected/3
		for (let k = 0; k < 3; k++) {
			if (hash(bin, k * 7 + 1) >= expected / 3) continue;
			const life = lifetimeDays(hash(bin, k * 7 + 2));
			const age = (day - birth) / life;
			if (age < 0 || age >= 1) continue;

			const phase = cyclePhase(birthYear);
			const meanLat = 28 - 20 * phase;
			const lat = (hash(bin, k * 7 + 3) < 0.5 ? 1 : -1) * Math.max(3, meanLat + (hash(bin, k * 7 + 4) - 0.5) * 10);
			const lon0 = hash(bin, k * 7 + 5) * 360;
			// Differential rotation relative to the Carrington frame since birth
			const lon = lon0 + (rotationRate(lat) - CARRINGTON_DEG_PER_DAY) * (day - birth);

			// Size grows quickly, decays slowly
			const envelope = Math.sqrt(Math.sin(Math.PI * Math.pow(age, 0.6)));
			const big = hash(bin, k * 7 + 6);
			const leaderR = (0.01 + 0.035 * big * big) * envelope;
			// Joy's law: leader closer to the equator, tilt ~ 0.5 × latitude
			const tilt = 0.5 * lat;
			const sep = 6 + 6 * big; // deg between leader and follower
			const spots: Spot[] = [];
			const tr = (tilt * Math.PI) / 180;
			const leadLat = lat - Math.sign(lat) * Math.abs((Math.sin(tr) * sep) / 2);
			const follLat = lat + Math.sign(lat) * Math.abs((Math.sin(tr) * sep) / 2);
			spots.push({ dir: toDir(leadLat, lon + (Math.cos(tr) * sep) / 2), radius: leaderR, umbra: 0.42 });
			if (big > 0.25)
				spots.push({ dir: toDir(follLat, lon - (Math.cos(tr) * sep) / 2), radius: leaderR * 0.7, umbra: 0.35 });
			// Small pores between leader and follower in larger groups
			const pores = Math.floor(big * 4);
			for (let p = 0; p < pores; p++) {
				const t = hash(bin, 100 + k * 10 + p) - 0.5;
				spots.push({
					dir: toDir(lat + (hash(bin, 200 + k * 10 + p) - 0.5) * 3, lon + t * sep),
					radius: leaderR * 0.25,
					umbra: 0.3
				});
			}
			out.push({ latDeg: lat, lonDeg: ((lon % 360) + 360) % 360, spots, age });
		}
	}
	return out;
}

/** Flattened spot list, largest first, capped for the shader's uniform array. */
export function spotsAt(year: number, max: number): Spot[] {
	return activeGroups(year)
		.flatMap((g) => g.spots)
		.sort((a, b) => b.radius - a.radius)
		.slice(0, max);
}
