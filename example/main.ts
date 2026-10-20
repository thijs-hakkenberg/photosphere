import { PerspectiveCamera, Scene, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createProceduralSun, type SunSurface } from '../src';

const renderer = new WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
renderer.setPixelRatio(devicePixelRatio);
document.body.appendChild(renderer.domElement);

const scene = new Scene();
const camera = new PerspectiveCamera(40, 1, 0.001, 1000);
camera.position.set(0, 0, 4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.minDistance = 1.002;

const yearInput = document.querySelector<HTMLInputElement>('#year')!;
const yearLabel = document.querySelector<HTMLSpanElement>('#yearLabel')!;
const whiteInput = document.querySelector<HTMLInputElement>('#white')!;

let sun: SunSurface;
function build() {
	if (sun) {
		scene.remove(sun.object);
		sun.dispose();
	}
	sun = createProceduralSun({ radius: 1, style: whiteInput.checked ? 'white' : 'halpha' });
	scene.add(sun.object);
}
whiteInput.addEventListener('change', build);
build();

function resize() {
	renderer.setSize(innerWidth, innerHeight);
	camera.aspect = innerWidth / innerHeight;
	camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

const t0 = performance.now();
renderer.setAnimationLoop(() => {
	controls.update();
	const year = Number(yearInput.value);
	yearLabel.textContent = year.toFixed(2);
	// Far view fades toward white light as the camera backs away
	const far = Math.min(1, Math.max(0, (camera.position.length() - 20) / 80));
	sun.update({ year, elapsed: (performance.now() - t0) / 1000, camera, far });
	renderer.render(scene, camera);
});
