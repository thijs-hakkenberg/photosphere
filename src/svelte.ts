/**
 * Svelte context helpers: provide a Sun surface factory high in the component
 * tree and resolve it where the Sun is rendered (works with Threlte or any
 * other Svelte + three.js setup).
 */

import { getContext, setContext } from 'svelte';
import { createProceduralSun } from './procedural.js';
import type { SunSurfaceFactory } from './types.js';

const KEY = Symbol.for('photosphere:sun-surface');

/** Provide a Sun surface implementation to descendants (defaults to the procedural Sun). */
export function provideSunSurface(factory: SunSurfaceFactory | undefined) {
	setContext(KEY, factory ?? createProceduralSun);
}

export function useSunSurface(): SunSurfaceFactory {
	return getContext<SunSurfaceFactory | undefined>(KEY) ?? createProceduralSun;
}
