import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { MathUtils } from 'three';
import { Vector3 } from 'three';
import { ExtrudeGeometry, Shape } from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { AirplaneController, AIRPLANE_KEYS } from './airplaneController.js';

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

	createZeroFuselage() {
        // ... (Secciones 1 y 2 - Perfil y Parámetros - sin cambios)
        const radius = 1;
        const profileShape = new THREE.Shape();
        profileShape.absellipse(0, 0, radius, radius, 0, Math.PI * 2, false, 0); 
        
        const profilePoints = profileShape.extractPoints(10).shape; 
        const profileCount = profilePoints.length;

        const length = 10;
        const segments = 50; 
        
        // El recorrido es una línea recta a lo largo del eje Z
        // No necesitamos FrenetFrames para una línea recta simple.

        const vertices = [];
        const indices = [];

        // --- 4. Iterar y Aplicar Escala Variable ---
        for (let i = 0; i <= segments; i++) {
            const t = i / segments; // Valor normalizado del recorrido (0.0 a 1.0)
            
            // ------------------------------------------------------------------
            // CÁLCULO DE ESCALA (Sin cambios)
            let scaleFactor;
            if (t <= 0.05) {
                scaleFactor = t / 0.05;
            } else if (t <= 0.6) {
				scaleFactor = 1.0;
			} else {
                const t_colapse = (t - 0.6) * 2; 
                scaleFactor = 1.0 - t_colapse;
            }
            const scaleX = scaleFactor * 1.0; 
            const scaleY = scaleFactor * 0.9; 
            // ------------------------------------------------------------------
            
            // CÁLCULO MANUAL DE POSICIÓN Y MARCOS PARA LÍNEA RECTA
            
            // 1. Posición: Interpolación lineal a lo largo del eje Z
            // Z va de -length/2 a +length/2
            const z = THREE.MathUtils.lerp(-length / 2, length / 2, t);
            const position = new THREE.Vector3(0, 0, z);

            // 2. Marcos de orientación (para que el perfil esté perpendicular a la línea Z)
            // Normal (Vertical): Eje Y local
            const normal = new THREE.Vector3(0, 1, 0); 
            // Binormal (Horizontal): Eje X local
            const binormal = new THREE.Vector3(1, 0, 0); 
            // La tangente es (0, 0, 1) y no se usa directamente en la fórmula P = Pos + ...
            
            // Transformar puntos 2D del perfil a 3D
            for (let j = 0; j < profileCount; j++) {
                const profilePoint = profilePoints[j];
                
                // Aplicar escala y mover al espacio 3D
                const x = profilePoint.x * scaleX;
                const y = profilePoint.y * scaleY;
                
                // La posición final es:
                // Posición de la línea (position)
                // + Desplazamiento vertical (normal * y)
                // + Desplazamiento horizontal (binormal * x)
                
                const vertex = new THREE.Vector3().copy(position);
                vertex.add(normal.clone().multiplyScalar(y));
                vertex.add(binormal.clone().multiplyScalar(x));

                vertices.push(vertex.x, vertex.y, vertex.z);
            }
            
            // --- Conexión de Anillos (sin cambios) ---
            if (i < segments) {
                const a = i * profileCount;
                const b = a + profileCount;
                for (let j = 0; j < profileCount; j++) {
                    const c = a + ((j + 1) % profileCount);
                    const d = b + ((j + 1) % profileCount);

                    indices.push(a + j, b + j, c);
                    indices.push(b + j, d, c);
                }
            }
        }
        
        // --- 5. Finalizar la Geometría (sin cambios) ---
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshPhongMaterial({ color: 0xaa9955, side: THREE.DoubleSide });
        const fuselage = new THREE.Mesh(geometry, material);
        fuselage.name = 'ZeroFuselage';
        
        // La rotación en X está correcta para alinear el fuselaje con la escena.
        //fuselage.rotation.x = Math.PI / 2; 

        return fuselage;
    }

	createWing() {
		// === 1. Perfil 2D: medio óvalo simétrico (arriba y abajo) ===
		const maxChord = 10;
		const maxThickness = 0.25;

		const profileShape = new THREE.Shape();
		profileShape.moveTo(0, 0);
		profileShape.bezierCurveTo(
			maxChord * 0.3, maxThickness,
			maxChord * 0.7, maxThickness,
			maxChord, 0
		);
		profileShape.bezierCurveTo(
			maxChord * 0.7, -maxThickness,
			maxChord * 0.3, -maxThickness,
			0, 0
		);

		const profilePoints = profileShape.extractPoints(32).shape;
		const profileCount = profilePoints.length;

		// === 2. Parámetros del barrido ===
		const totalSpan = 5;        // Longitud total del ala (de punta a punta)
		const segments = 80;        // Alta resolución para colapso suave

		const vertices = [];
		const indices = [];

		for (let i = 0; i <= segments; i++) {
			const t = i / segments; // 0 a 1

			// === 3. Posición en Z: centrada, simétrica ===
			const z = THREE.MathUtils.lerp(-totalSpan / 2, totalSpan / 2, t);
			const position = new THREE.Vector3(0, 0, z);

			// === 4. Escala: máxima en el centro, colapsa rápido en puntas ===
			const distFromCenter = Math.abs(z) / (totalSpan / 2); // 0 en centro, 1 en puntas
			let scaleFactor;
			scaleFactor = 1 - distFromCenter * distFromCenter; // Colapso cuadrático

			const scaleX = scaleFactor;
			const scaleY = scaleFactor; // Grosor proporcional

			// === 5. Marcos locales (perfil en XY, barrido en Z) ===
			const normal = new THREE.Vector3(0, 1, 0);   // Y = grosor
			const binormal = new THREE.Vector3(1, 0, 0); // X = cuerda

			// === 6. Generar vértices del anillo ===
			for (let j = 0; j < profileCount; j++) {
				const p = profilePoints[j];
				const x = p.x * scaleX;
				const y = p.y * scaleY;

				const vertex = new THREE.Vector3()
					.copy(position)
					.add(normal.clone().multiplyScalar(y))
					.add(binormal.clone().multiplyScalar(x));

				vertices.push(vertex.x, vertex.y, vertex.z);
			}

			// === 7. Conectar anillos ===
			if (i < segments) {
				const a = i * profileCount;
				const b = a + profileCount;
				for (let j = 0; j < profileCount; j++) {
					const c = a + ((j + 1) % profileCount);
					const d = b + ((j + 1) % profileCount);
					indices.push(a + j, b + j, c);
					indices.push(b + j, d, c);
				}
			}
		}

		// === 8. Geometría final ===
		const geometry = new THREE.BufferGeometry();
		geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		geometry.setIndex(indices);
		geometry.computeVertexNormals();

		const material = new THREE.MeshPhongMaterial({
			color: 0xcccccc
		});

		const wing = new THREE.Mesh(geometry, material);

		return wing;
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

		const fighter = new THREE.Group();
		const fuselage = this.createZeroFuselage();
		fuselage.scale.set(1.2,1.2,1.2);
		fighter.add(fuselage);
		const wing1 = this.createWing();
		const wing2 = wing1.clone();
		wing2.scale.set(-1,1,1);
		fighter.add(wing2);
		wing2.position.set(1,0,-1);
		fighter.add(wing1);
		wing1.position.set(-1,0,-1);
		const tailWing1 = wing1.clone();
		tailWing1.scale.set(0.3,0.3,0.3);
		tailWing1.position.set(0,0,5);
		fighter.add(tailWing1);
		const tailWing2 = tailWing1.clone();
		tailWing2.scale.set(-0.3,0.3,0.3);
		tailWing2.position.set(0,0,5);
		fighter.add(tailWing2);
		const tailWing3 = tailWing1.clone();
		tailWing3.scale.set(0.2,0.3,0.3);
		tailWing3.rotation.z = MathUtils.degToRad(90);
		fighter.add(tailWing3);
		const propellers = new THREE.Group();
		propellers.name = "propellers";
		fighter.add(propellers);
		const propeller1 = this.createWing();
		propeller1.scale.set(0.1,0.5,0.1);
		propellers.rotation.x = MathUtils.degToRad(90);
		propellers.position.set(0,0,-6);
		propellers.add(propeller1);
		const propeller2 = propeller1.clone();
		propeller2.scale.set(0.1,0.5,0.1);
		propeller2.rotation.y= MathUtils.degToRad(120);
		propellers.add(propeller2);
		const propeller3 = propeller1.clone();
		propeller3.scale.set(0.1,0.5,0.1);
		propeller3.rotation.y= MathUtils.degToRad(-120);
		propellers.add(propeller3);
		this.airplaneController = new AirplaneController(fighter,{
			maxSpeed: 120,
			accelResponse: 2.2,
			drag: 0.015,

			pitchLimit: THREE.MathUtils.degToRad(45),
			bankLimit:  THREE.MathUtils.degToRad(60),

			pitchCmdRateDeg: 60,
			bankCmdRateDeg:  90,

			pitchResponse: 5.0,
			bankResponse:  6.0,

			pitchCentering: 1.0,
			bankCentering:  1.5,

			turnRateGain: 1.3,
			yawTaxiRate: Math.PI * 1.4,

			stallSpeed: 12,
			ctrlVRange: 25,

			minY: 2
		});
		this.airplaneController.setTransform({
			position: new THREE.Vector3(0, 2, 0),
			euler: new THREE.Euler(0, 0, 0, 'YXZ'), // heading=0 → forward -Z
			throttle: 0
		});
		document.addEventListener('keydown', (e) => {
			if (e.code === 'KeyR') {
				this.airplaneController.setTransform({
				position: new THREE.Vector3(0, 2, 0),
				euler: new THREE.Euler(0, 0, 0, 'YXZ'), // nivelado, nariz hacia -Z
				throttle: 0
				});
			}
		});

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
		pistas.add(fighter);
		fighter.position.set(-25,7,-100);
		fighter.rotation.y = MathUtils.degToRad(180);
		pistas.rotateY(MathUtils.degToRad(-50));
		pistas.position.set(100,100,-150);
		islandGroup.add(pistas);
	}

	animate() {
		const destructor = this.scene.getObjectByName("Destructor");
		const barquito = this.scene.getObjectByName("destructor");
		const torreta = this.scene.getObjectByName("torreta");
		const canon = this.scene.getObjectByName("canon");
    
    	if (!barquito) return;
		destructor.rotation.y += 0.003;

		const clock = new THREE.Clock();
		const dt = Math.min(0.05, clock.getDelta()); // clamp por si se pausa un tab
  		this.airplaneController.update(dt);
		const propellers = this.scene.getObjectByName("propellers");
		propellers.rotation.y += 0.5* this.airplaneController.getEnginePower()*100;

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