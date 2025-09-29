import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { MathUtils } from 'three';
import { Vector3 } from 'three';

let disc;

export class SceneManager {
	constructor(scene) {
        const sky = new Sky();

        sky.scale.setScalar( 450000 );

        const phi = MathUtils.degToRad( 85 );
        const theta = MathUtils.degToRad( 180 );
        const sunPosition = new Vector3().setFromSphericalCoords( 1, phi, theta );

        sky.material.uniforms.sunPosition.value = sunPosition;

        scene.add( sky );

		const light = new THREE.DirectionalLight(0xffffff, 1);

		light.position.copy(sunPosition);
		scene.add(light);

		const ambientLight = new THREE.AmbientLight(0x666666);
		scene.add(ambientLight);

		const grid = new THREE.GridHelper(10, 10);
		scene.add(grid);

		const axes = new THREE.AxesHelper(3);
		scene.add(axes);

        disc = new THREE.Mesh( new THREE.CylinderGeometry(400000, 1 ,0), new THREE.MeshPhongMaterial({color: 0x0000ff}));
        scene.add(disc);
	}

	animate() {
	}
}