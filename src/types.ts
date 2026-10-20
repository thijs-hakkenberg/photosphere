/**
 * Injection seam for a Sun surface renderer.
 *
 * Hosts depend only on this interface, so `createProceduralSun` can be swapped
 * for any other `SunSurfaceFactory`. Implementations own their geometry,
 * materials and spin; the host owns position, lights and labels.
 */

import type { Camera, Object3D } from 'three';

export interface SunFrame {
	/** Simulated decimal year (drives rotation, solar cycle, sunspots) */
	year: number;
	/** Wall-clock seconds since start (drives short-timescale animation) */
	elapsed: number;
	camera: Camera;
	/** 0 = close view, 1 = far view; renderers may shift toward how the Sun looks from afar (white) */
	far?: number;
}

export interface SunSurface {
	/** Root object, centred on the Sun, in the host's scene units */
	readonly object: Object3D;
	update(frame: SunFrame): void;
	dispose(): void;
}

export interface SunSurfaceOptions {
	/** Photospheric radius in the host's scene units */
	radius: number;
	/** 'halpha': false-colour chromosphere look (default); 'white': white-light photosphere */
	style?: 'halpha' | 'white';
}

export type SunSurfaceFactory = (options: SunSurfaceOptions) => SunSurface;
