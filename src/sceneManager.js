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

	handleCameraSwitch = (event) => {
        const key = event.key;
        if (['1', '4', '5', '6', '7', '8'].includes(key)) {
            this.mode = key;
            console.log('Modo cámara cambiado a:', key);
        }
    };

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

	constructor(scene, camera,controls) {
		this.scene = scene;
		this.camera = camera;
		this.controls = controls;
		this.mode = 1;

		document.addEventListener('keypress', this.handleCameraSwitch);

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

        const waterGeometry = new THREE.PlaneGeometry(50000, 50000);
		waterGeometry.rotateX(-Math.PI / 2);

		const waterMaterial = new THREE.MeshPhongMaterial({
			color: 0x1e90ff,
		});

		const water = new THREE.Mesh(waterGeometry, waterMaterial);
		water.position.y = 5;
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
				island.position.y = -10;
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
		torre.name = 'torre';

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
		pista1.name = "pista";
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
		const torreta = this.scene.getObjectByName("torreta");
		const canon = this.scene.getObjectByName("canon");
    
    	if (!barquito) return;
		destructor.rotation.y += 0.003;

		const shipWorldPos = new THREE.Vector3();
		barquito.getWorldPosition(shipWorldPos);

		switch (this.mode) {
			case '1':  // Orbital general centrada en la isla
				this.controls.enable = true;
				this.controls.target.set(0,0,0);  // Posición de pistas/isla
				this.camera.position.copy(new THREE.Vector3(0, 1000, 0));
				break;
			case '4':  // Orbital centrada en el barco
				this.controls.enable = true;
				this.controls.target.copy(shipWorldPos);
				this.camera.position.copy(shipWorldPos.clone().add(new THREE.Vector3(0, 500, 0)));
				break;
			case '5':  // De persecución del barco (detrás)
				this.controls.enable = false;
				const localOffset = new THREE.Vector3(0, 40, -120);
				const worldOffset = localOffset.clone().applyQuaternion(destructor.quaternion);
				const cameraPos = shipWorldPos.clone().add(worldOffset);
				this.camera.position.lerp(cameraPos, 0.1);
				this.camera.lookAt(shipWorldPos);
				break;
			case '6':  // Dirección que apunta el cañón (vista desde cañón)
				this.controls.enable = false;
				// 1. Definir el offset (desplazamiento) LOCAL para la posición de la cámara
				// El cañón está rotado por la torreta (Y) y por sí mismo (Z).
				// Necesitamos que la cámara se desplace un poco en el eje local:
				// X: Lateral (para ver el cañón al lado)
				// Y: Arriba/Abajo (para ver el cañón desde arriba o abajo)
				// Z: Adelante/Atrás (para ver desde la boca o desde atrás)
				
				// Ejemplo de offset: 5 unidades a la DERECHA, 2 unidades ARRIBA, 10 unidades ATRÁS (del punto pivote del cañón)
				const localCameraOffset = new THREE.Vector3(0, 10, 0); 
				
				// 2. Transformar el offset local a coordenadas mundiales (para la posición de la cámara)
				// Usamos un clon del offset.
				const worldCameraPos = localCameraOffset.clone();
				canon.localToWorld(worldCameraPos); // Este es el punto mundial donde estará la cámara
				
				this.camera.position.copy(worldCameraPos);
				
				// ----------------------------------------------------
				// 3. Calcular el punto de enfoque (mismo que antes, asumiendo (0, 1, 0) es la dirección correcta)
				const lookAheadDistance = 500; 
				const localDirection = new THREE.Vector3(0, 1, 0); // Eje de disparo corregido
				
				const localTarget = localDirection.multiplyScalar(lookAheadDistance);
				
				// La posición inicial del cañón es (0,0,0) en su espacio local.
				// Transformamos el punto local (0, 500, 0) a coordenadas mundiales
				const canonWorldTarget = localTarget.clone();
				canon.localToWorld(canonWorldTarget);

				// 4. Apuntar la cámara a ese punto
				this.camera.lookAt(canonWorldTarget);
				break;
			case '7':  // Orbital centrada en torre de control
				this.controls.enable = true;
				const torre = this.scene.getObjectByName('torre');
                const torrePos = new THREE.Vector3();
                torre.getWorldPosition(torrePos);
                this.controls.target.copy(torrePos);
                this.camera.position.copy(torrePos.clone().add(new THREE.Vector3(0, 100, 200)));
				break;
			case '8':  // Orbital centrada en pista de aeródromo
				this.controls.enable = true;
				const pistaPos = new THREE.Vector3();
				this.scene.getObjectByName('pista').getWorldPosition(pistaPos);
				this.controls.target.copy(pistaPos);
				this.camera.position.copy(pistaPos.clone().add(new THREE.Vector3(-70, 70, 70)));
				break;
			default:
				break;
		}
		
		if (this.controls.enable) {
        	this.controls.update();
    	}
	}
}