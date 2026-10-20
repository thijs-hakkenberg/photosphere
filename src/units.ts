/** Time and colour helpers shared by the cycle model and the renderer. */

export const DAYS_PER_YEAR = 365.25;
export const JD_J2000 = 2451545.0;
/** Mean solar radius (km), IAU nominal */
export const SUN_RADIUS_KM = 695_700;

/** Decimal year (e.g. 2026.77) to Julian Date. */
export function yearToJD(year: number): number {
	return JD_J2000 + (year - 2000.0) * DAYS_PER_YEAR;
}

/** Calendar date to decimal year (UTC). */
export function dateToYear(d: Date): number {
	const y = d.getUTCFullYear();
	const start = Date.UTC(y, 0, 1);
	const end = Date.UTC(y + 1, 0, 1);
	return y + (d.getTime() - start) / (end - start);
}

/** Spin angle (rad) at a decimal year, from J2000. */
export function spinAngle(rotationHours: number, year: number): number {
	const hours = (yearToJD(year) - JD_J2000) * 24;
	const turns = hours / rotationHours;
	return (turns - Math.floor(turns)) * Math.PI * 2;
}

/** Approximate sRGB colour of a blackbody (Tanner Helland fit), channels 0..1. */
export function blackbodyRGB(tempK: number): [number, number, number] {
	const t = Math.max(1000, Math.min(40000, tempK)) / 100;
	let r: number, g: number, b: number;
	if (t <= 66) {
		r = 255;
		g = 99.4708025861 * Math.log(t) - 161.1195681661;
		b = t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
	} else {
		r = 329.698727446 * Math.pow(t - 60, -0.1332047592);
		g = 288.1221695283 * Math.pow(t - 60, -0.0755148492);
		b = 255;
	}
	const clamp = (v: number) => Math.max(0, Math.min(255, v)) / 255;
	return [clamp(r), clamp(g), clamp(b)];
}
