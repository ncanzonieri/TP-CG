import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { MathUtils } from 'three';
import { Vector3 } from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';


// Crea un cilindro dividido en paredes y tapas.
// radio: número (requerido)
// altura: número (requerido)
// radialSegments: número (opcional, default 64)

function makeSplitCylinder(radius, height, radialSegments = 64) {
	const walls = new THREE.CylinderGeometry(
		radius, // radiusTop
		radius, // radiusBottom
		height, // height
		radialSegments, // radialSegments
		1, // heightSegments
		true // openEnded
	);

	// --- TAPAS ---
	const top = new THREE.CircleGeometry(radius, radialSegments);
	top.rotateX(-Math.PI / 2);
	top.translate(0, height / 2, 0);

	const bottom = new THREE.CircleGeometry(radius, radialSegments);
	bottom.rotateX(Math.PI / 2);
	bottom.translate(0, -height / 2, 0);

	function scaleV(geometry, factor = 10) {
		const uv = geometry.attributes.uv;
		if (uv) {
			for (let i = 0; i < uv.count; i++) {
				uv.setY(i, uv.getY(i) * factor);
			}
			uv.needsUpdate = true;
		}
	}

	scaleV(walls);
	scaleV(top);
	scaleV(bottom);

	return {
		walls,
		caps: {
			top,
			bottom,
		},
	};
}


export class SceneManager {
	constructor(scene) {
        const sky = new Sky();

        sky.scale.setScalar( 450000 );

        const phi = MathUtils.degToRad( 70 );
        const theta = MathUtils.degToRad( 180 );
        const sunPosition = new Vector3().setFromSphericalCoords( 1, phi, theta );

        sky.material.uniforms.sunPosition.value = sunPosition;

        scene.add( sky );

		const light = new THREE.DirectionalLight(0xffffff, 1);

		light.position.copy(sunPosition);
		scene.add(light);

		const ambientLight = new THREE.AmbientLight(0xffffff,0.5);
		scene.add(ambientLight);

		const grid = new THREE.GridHelper(200, 20, 0x888888, 0x444444);
		scene.add(grid);

		const axes = new THREE.AxesHelper(100);
		scene.add(axes);

        const waterGeometry = new THREE.PlaneGeometry(3000, 3000);
		waterGeometry.rotateX(-Math.PI / 2);

		const waterMaterial = new THREE.MeshStandardMaterial({
			color: 0x1e90ff,
		});

		const water = new THREE.Mesh(waterGeometry, waterMaterial);
		scene.add(water);

		const textureLoader = new THREE.TextureLoader();

		textureLoader.load(
			'/iwojima.png',

			(heightMap) => {
				console.log('Heightmap cargado correctamente');

				heightMap.minFilter = THREE.LinearFilter;
				heightMap.magFilter = THREE.LinearFilter;
				heightMap.anisotropy = 16;

				const islandSize = 1000;
				const segments = 256;

				const islandGeometry = new THREE.PlaneGeometry(islandSize, islandSize, segments, segments);
				islandGeometry.rotateX(-Math.PI / 2);

				const islandMaterial = new THREE.MeshStandardMaterial({
				displacementMap: heightMap,
				displacementScale: 112,
				displacementBias: 0,
				color: 0x3a5f3a,
				metalness: 0.1,
				roughness: 0.9,
				side: THREE.DoubleSide
				});

				const island = new THREE.Mesh(islandGeometry, islandMaterial);
				island.position.y = -5;
				scene.add(island);
			},

			undefined,

			(error) => {
				console.error('Error al cargar iwojima.png:', error);
				console.warn('Asegúrate de que el archivo esté en: public/iwojima.png');
			}
		);
	}

	animate() {
	}
}