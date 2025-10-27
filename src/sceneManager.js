import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { MathUtils } from 'three';
import { Vector3 } from 'three';
import { ExtrudeGeometry, Shape } from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';



export class SceneManager {
	handleKeyPress = (event) => {
		const torreta = this.scene.getObjectByName('torreta');
		const canon = this.scene.getObjectByName('canon');
		switch(event.key) {
			case 'j':
				if (torreta) {
					torreta.rotation.y += MathUtils.degToRad(5);
				}
				break;
			case 'l':
				if (torreta) {
					torreta.rotation.y -= MathUtils.degToRad(5);
				}
				break;
			case 'i':
				if (canon) {
					canon.rotation.z += MathUtils.degToRad(5);
					canon.rotation.z = Math.min(canon.rotation.z, MathUtils.degToRad(0));
				}
				break;
			case 'k':
				if (canon) {
					canon.rotation.z -= MathUtils.degToRad(5);
					canon.rotation.z = Math.max(canon.rotation.z, MathUtils.degToRad(-90));
				}
				break;
			default:
				break;
		}
	}

	onModelLoaded = (glb) => {
		console.log('Modelo 3D cargado: ', glb);
		glb.scene.scale.set(2,2,2);
		const model = new THREE.Group();
		model.add(glb.scene);
		model.name = 'Destructor';
		this.scene.add(model);
		document.addEventListener('keydown', this.handleKeyPress);
	}

	onProgress = (event) =>{
		console.log((event.loaded / event.total * 100) + '% cargado');
	}

	onLoadError = (error) => {
		console.error('Error al cargar: ', error);
	}

	constructor(scene, camera) {
		this.scene = scene;
		this.camera = camera;

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

		const ambientLight = new THREE.AmbientLight(0xffffff,0.25);
		scene.add(ambientLight);

		const grid = new THREE.GridHelper(200, 20, 0x888888, 0x444444);
		grid.position.y = 112;
		scene.add(grid);

		const axes = new THREE.AxesHelper(100);
		axes.position.y = 112;
		scene.add(axes);

        const waterGeometry = new THREE.PlaneGeometry(3000, 3000);
		waterGeometry.rotateX(-Math.PI / 2);

		const waterMaterial = new THREE.MeshPhongMaterial({
			color: 0x1e90ff,
		});

		const water = new THREE.Mesh(waterGeometry, waterMaterial);
		scene.add(water);

		const islandGroup = new THREE.Group();
		scene.add(islandGroup);

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

				const islandMaterial = new THREE.MeshPhongMaterial({
				displacementMap: heightMap,
				displacementScale: 112,
				displacementBias: 0,
				color: 0x3a5f3a,
				side: THREE.DoubleSide
				});

				const island = new THREE.Mesh(islandGeometry, islandMaterial);
				island.position.y = -5;
				islandGroup.add(island);
			},

			undefined,

			(error) => {
				console.error('Error al cargar iwojima.png:', error);
				console.warn('Asegúrate de que el archivo esté en: public/iwojima.png');
			}
		);

		const geometry = new THREE.BufferGeometry();
		const vertices = [];
		const indices = [];
		const uvs = [];

		// === 4 ANILLOS CLAVE (solo donde cambia la forma) ===
		const levels = [
		{ y: 0,      w: 10, d: 10, uv: 0.0 },   // Base
		{ y: 50,     w: 10, d: 10, uv: 0.3 },   // Final de fuste
		{ y: 60,     w: 30, d: 30, uv: 0.6 },   // Inicio sala de control
		{ y: 65,     w: 0,  d: 0,  uv: 1.0 }    // Punta (colapsada)
		];

		levels.forEach(level => {
		const hw = level.w / 2;
		const hd = level.d / 2;
		// 4 vértices por anillo (orden horario)
		vertices.push(-hw, level.y, -hd);
		vertices.push( hw, level.y, -hd);
		vertices.push( hw, level.y,  hd);
		vertices.push(-hw, level.y,  hd);

		// UVs: repite horizontal, escala vertical
		uvs.push(0, level.uv);
		uvs.push(1, level.uv);
		uvs.push(1, level.uv);
		uvs.push(0, level.uv);
		});

		// === CONECTAR ANILLOS CON QUADS (solo 4 segmentos) ===
		for (let i = 0; i < levels.length - 1; i++) {
			const a = i * 4;
			const b = a + 1;
			const c = a + 2;
			const d = a + 3;
			const e = a + 4;
			const f = b + 4;
			const g = c + 4;
			const h = d + 4;

			// Caras en sentido horario (CW) → normales externas
			indices.push(a, f, b); indices.push(a, e, f);
			indices.push(b, g, c); indices.push(b, f, g);
			indices.push(c, h, d); indices.push(c, g, h);
			indices.push(d, e, a); indices.push(d, h, e);
		}

		geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
		geometry.setIndex(indices);

		geometry.computeVertexNormals();

		const material = new THREE.MeshPhongMaterial({
			color: 0xaaaaaa,
			flatShading: true,
		});

		const torre = new THREE.Mesh(geometry, material);

		const barrack = new THREE.CylinderGeometry(7.5, 7.5, 30, 32);
		barrack.rotateX(Math.PI / 2);
		barrack.rotateY(Math.PI / 2);
		const barrackMaterial = new THREE.MeshPhongMaterial({ color: 0x8b4513 });

		const loader = new GLTFLoader();
		loader.load('/destructor.glb', this.onModelLoaded, this.onProgress, this.onLoadError);

		const pistas = new THREE.Group();
		const edificios = new THREE.Group();
		const block = new THREE.BoxGeometry(10, 10, 10);
		const blockMaterial = new THREE.MeshPhongMaterial({ color: 0x7d7d7d });
		const pista1 = new THREE.Mesh(block, blockMaterial);
		const pista2 = new THREE.Mesh(block, blockMaterial);

		edificios.add(pista2);
		edificios.add(torre);
		for(let i=0; i<7; i++){
			const barrackN = new THREE.Mesh(barrack, barrackMaterial);
			barrackN.position.set(0,5,62.5 - i*17.5);
			edificios.add(barrackN);
		}
		torre.position.set(10,0,-60);
		pista1.scale.set(5,1,25);
		pista1.position.set(-25,0,0);
		pista2.scale.set(5,1,15);
		edificios.position.set(25,0,-50);
		pistas.add(pista1);
		pistas.add(edificios);
		pistas.rotateY(MathUtils.degToRad(-50));
		pistas.position.set(100,105,-150);
		islandGroup.add(pistas);
	}

	animate() {
		const destructor = this.scene.getObjectByName("Destructor");
		const barquito = this.scene.getObjectByName("destructor");
    
    	if (barquito) {
			destructor.rotation.y += 0.003;
			const shipWorldPos = new THREE.Vector3();
			barquito.getWorldPosition(shipWorldPos);

			const localOffset = new THREE.Vector3(0, 40, -120);
			const worldOffset = localOffset.clone().applyQuaternion(destructor.quaternion);
			const cameraPos = shipWorldPos.clone().add(worldOffset);

			this.camera.position.lerp(cameraPos, 0.1);
			this.camera.lookAt(shipWorldPos);
		}
	}
}