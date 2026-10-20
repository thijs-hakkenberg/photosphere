# photosphere

A procedural, physically-motivated Sun for [three.js](https://threejs.org). It renders on the GPU, needs no textures, and you can swap it in through a small factory interface.

**[Live demo](https://photosphere-eta.vercel.app)**: the example viewer, redeployed with every release.

- **Granulation** at true scale (~1,400 km cells, ~500 per solar radius), using evolving Worley cells with dark intergranular lanes. When granules shrink below a pixel they fade out instead of aliasing.
- **Meso- and supergranulation** keep some texture on the unresolved disc.
- **Sunspots** come from a statistical 11-year cycle phased to the Cycle 25 minimum. Latitudes follow Spörer's law (the butterfly diagram) and groups tilt per Joy's law. Each spot has an umbra (~3,900 K) and a filamentary penumbra (~5,500 K), with faculae near the limb.
- **Differential rotation** (Snodgrass & Ulrich 1990) moves the spots relative to the Carrington frame.
- **Wavelength-dependent limb darkening**, which also reddens the limb.
- **Corona, spicule fringe and prominences** on a camera-facing quad. Prominences get taller and more frequent near solar maximum.
- **Two looks:** Hα-style false colour (`'halpha'`, the default) and white light (`'white'`). Hosts can fade toward white as the camera moves away.

Spots are generated deterministically, so a given date always shows the same Sun when you scrub through time. This is a visual model, not a forecast: future cycles repeat Cycle 25's timing and amplitude.

## Install

```sh
npm install photosphere three
```

`three` is a peer dependency (>= 0.160). `svelte` is an optional peer, needed only for `photosphere/svelte`.

## Usage (three.js)

```ts
import { createProceduralSun, dateToYear } from 'photosphere';

const sun = createProceduralSun({ radius: 1, style: 'halpha' });
scene.add(sun.object);

const t0 = performance.now();
renderer.setAnimationLoop(() => {
	sun.update({
		year: dateToYear(new Date()), // simulated time: rotation, cycle, sunspots
		elapsed: (performance.now() - t0) / 1000, // wall-clock seconds: granule motion
		camera,
		far: 0 // 0 = close view, 1 = far view (fades false colour to white)
	});
	renderer.render(scene, camera);
});

// later
scene.remove(sun.object);
sun.dispose();
```

`radius` is in your scene units. The shaders include three's logarithmic depth buffer chunks, so you can use `logarithmicDepthBuffer: true` for solar-system scales.

**Ownership:** the surface owns its geometry, materials, axial tilt (7.25°) and spin. The host owns the Sun's position, lights, glow sprites and labels. Translate `sun.object` freely, but don't rotate it: the corona quad copies the camera's orientation.

## Injection

Hosts should depend only on the interface below and accept a factory. That way the built-in Sun can be replaced, for example by a texture-based Sun or a lighter mobile version:

```ts
import type { SunSurfaceFactory } from 'photosphere';

interface SunSurfaceOptions { radius: number; style?: 'halpha' | 'white' }
interface SunFrame { year: number; elapsed: number; camera: Camera; far?: number }
interface SunSurface { readonly object: Object3D; update(frame: SunFrame): void; dispose(): void }
type SunSurfaceFactory = (options: SunSurfaceOptions) => SunSurface;
```

### Svelte / Threlte

`photosphere/svelte` passes the factory through Svelte context. Provide it high in the tree, then resolve it where the Sun is drawn. If nothing is provided, `createProceduralSun` is used.

```svelte
<!-- App.svelte -->
<script lang="ts">
	import { provideSunSurface } from 'photosphere/svelte';
	import type { SunSurfaceFactory } from 'photosphere';
	let { sunSurface }: { sunSurface?: SunSurfaceFactory } = $props();
	provideSunSurface(sunSurface);
</script>
```

```svelte
<!-- Sun.svelte (inside <Canvas>) -->
<script lang="ts">
	import { T, useTask, useThrelte } from '@threlte/core';
	import { onDestroy } from 'svelte';
	import { useSunSurface } from 'photosphere/svelte';

	let { year }: { year: number } = $props();
	const { camera } = useThrelte();
	const surface = useSunSurface()({ radius: 1 });
	onDestroy(() => surface.dispose());

	let elapsed = 0;
	useTask((dt) => {
		elapsed += dt;
		surface.update({ year, elapsed, camera: camera.current });
	});
</script>

<T is={surface.object} />
```

## Solar cycle model

The activity model is exported on its own, for use in charts or HUDs:

```ts
import { activity, cycleNumber, activeGroups, spotsAt, rotationRate } from 'photosphere';

activity(2024.5); // 0..1 relative activity
cycleNumber(2032); // 26
activeGroups(2024.5); // [{ latDeg, lonDeg, age, spots: [...] }, ...]
spotsAt(2024.5, 48); // flattened spots, largest first
rotationRate(30); // sidereal deg/day at 30° latitude
```

## Development

```sh
npm install
npm run dev       # example viewer (vite) with a year slider
npm run test:run  # vitest
npm run check     # tsc
npm run build     # emits dist/
```

### Releasing

Releases go out from GitHub Actions through npm trusted publishing (`.github/workflows/publish.yml`). Bump the version and push the tag:

```sh
npm version patch   # or minor / major
git push --follow-tags
```

The workflow checks that the tag matches `package.json`, then runs the type check, tests and build before publishing with provenance.

## Credits

- 3-D simplex noise: Ashima Arts, [webgl-noise](https://github.com/ashima/webgl-noise) (MIT)
- Hash without sine: Dave Hoskins (MIT)
- Blackbody colour fit: Tanner Helland

Originally built for the Project Dyson 3-D explorer.

## License

MIT
