import { describe, expect, it } from 'vitest';
import { Mesh, PerspectiveCamera, ShaderMaterial, Vector3 } from 'three';
import { createProceduralSun } from '../procedural.js';

function meshes(sun: ReturnType<typeof createProceduralSun>) {
	const out: Mesh[] = [];
	sun.object.traverse((o) => {
		if (o instanceof Mesh) out.push(o);
	});
	return out;
}

describe('procedural sun', () => {
	it('builds a sphere and a corona quad at the requested radius', () => {
		const sun = createProceduralSun({ radius: 2 });
		const [sphere, corona] = meshes(sun);
		sphere.geometry.computeBoundingSphere();
		expect(sphere.geometry.boundingSphere!.radius).toBeCloseTo(2, 6);
		expect(corona.frustumCulled).toBe(false);
		sun.dispose();
	});

	it('style selects the false-colour or white-light look', () => {
		const look = (style: 'halpha' | 'white') =>
			(meshes(createProceduralSun({ radius: 1, style }))[0].material as ShaderMaterial).uniforms.uHalpha.value;
		expect(look('halpha')).toBe(1);
		expect(look('white')).toBe(0);
	});

	it('update spins the surface, faces the corona to the camera and loads sunspots', () => {
		const sun = createProceduralSun({ radius: 1 });
		const [sphere, corona] = meshes(sun);
		const uniforms = (sphere.material as ShaderMaterial).uniforms;
		const camera = new PerspectiveCamera();
		camera.position.set(0, 3, 10);
		camera.lookAt(new Vector3());
		camera.updateMatrixWorld();

		sun.update({ year: 2024.5, elapsed: 1, camera, far: 0.3 });
		const spin = sphere.rotation.y;
		expect(uniforms.uSpotCount.value).toBeGreaterThan(0);
		expect(uniforms.uFar.value).toBe(0.3);
		expect(corona.quaternion.equals(camera.quaternion)).toBe(true);

		sun.update({ year: 2024.5 + 1 / 365.25, elapsed: 2, camera });
		expect(sphere.rotation.y).not.toBeCloseTo(spin, 3);
		sun.dispose();
	});
});
