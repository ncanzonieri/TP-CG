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
	};

	handleCameraSwitch = (event) => {
        const key = event.key;
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(key)) {
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

		const loadSkin = new THREE.TextureLoader();
		loadSkin.load('/lol.png', this.onShipSkinLoaded, this.onProgress, this.onLoadError);
		loadSkin.load('/torreta_skin.jpg', this.onTurretSkinLoaded, this.onProgress, this.onLoadError);
	};

	onProgress = (event) =>{
		console.log((event.loaded / event.total * 100) + '% cargado');
	};

	onLoadError = (error) => {
		console.error('Error al cargar: ', error);
	};

	onTextureLoaded = (heightMap) => {
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
		color: 0x3a5f3a
		});

		const island = new THREE.Mesh(islandGeometry, islandMaterial);
		island.position.y = -10;
		const islandGroup = this.scene.getObjectByName('islandGroup');
		islandGroup.add(island);
	};

	onShipSkinLoaded = (map) => {
		console.log('Mapa de colores del destructor cargado correctamente: ', map);
		map.flipY = false;
		const destructor = this.scene.getObjectByName('destructor');
		if (destructor) {
			destructor.material.map = map;
			destructor.material.needsUpdate = true;
		}
	};

	onTurretSkinLoaded = (map) => {
		console.log('Mapa de colores de la torreta cargado correctamente: ', map);
		map.flipY = false;
		const torreta = this.scene.getObjectByName('torreta');
		if (torreta) {
			torreta.material.map = map;
			torreta.material.needsUpdate = true;
		}
	};

	createZeroFuselage() {
        const radius = 1;
        const profileShape = new THREE.Shape();
        profileShape.absellipse(0, 0, radius, radius, 0, Math.PI * 2, false, 0); 
        
        const profilePoints = profileShape.extractPoints(10).shape; 
        const profileCount = profilePoints.length;

        const length = 10;
        const segments = 50; 

        const vertices = [];
        const indices = [];

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            
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

            const z = THREE.MathUtils.lerp(-length / 2, length / 2, t);
            const position = new THREE.Vector3(0, 0, z);

            const normal = new THREE.Vector3(0, 1, 0); 
            const binormal = new THREE.Vector3(1, 0, 0); 
            
            for (let j = 0; j < profileCount; j++) {
                const profilePoint = profilePoints[j];
                
                const x = profilePoint.x * scaleX;
                const y = profilePoint.y * scaleY;
                
                const vertex = new THREE.Vector3().copy(position);
                vertex.add(normal.clone().multiplyScalar(y));
                vertex.add(binormal.clone().multiplyScalar(x));

                vertices.push(vertex.x, vertex.y, vertex.z);
            }
            
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
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setIndex(indices);
        geometry.computeVertexNormals();
        
        const material = new THREE.MeshPhongMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const fuselage = new THREE.Mesh(geometry, material);
        fuselage.name = 'ZeroFuselage';

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

		const cumulativeLengths = new Array(profileCount);
		cumulativeLengths[0] = 0;
		let totalLength = 0;
		for (let j = 1; j < profileCount; j++) {
			const p1 = profilePoints[j - 1];
			const p2 = profilePoints[j];
			const dist = Math.sqrt(
				Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2)
			);
			cumulativeLengths[j] = cumulativeLengths[j - 1] + dist;
			totalLength += dist;
		}

		// === 2. Parámetros del barrido ===
		const totalSpan = 5;        // Longitud total del ala (de punta a punta)
		const segments = 80;        // Alta resolución para colapso suave

		const vertices = [];
		const indices = [];
		const uvs = [];

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
				const u = (z + totalSpan / 2) / totalSpan;
				const v = (cumulativeLengths[j] / totalLength) * scaleFactor;
				uvs.push(u, v);
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
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
		geometry.setIndex(indices);
		geometry.computeVertexNormals();

		const material = new THREE.MeshPhongMaterial({
			color: 0xffffff
		});

		const wing = new THREE.Mesh(geometry, material);

		return wing;
	}

	createLandingGear() {
		const gear = new THREE.Group();

		const wheelProfile = [
			new THREE.Vector2(0.60, 0.00), // borde exterior (radio)
			new THREE.Vector2(0.55, 0.08),
			new THREE.Vector2(0.45, 0.16),
			new THREE.Vector2(0.30, 0.24), // pared de llanta
			new THREE.Vector2(0.18, 0.32),
			new THREE.Vector2(0.08, 0.24),
			new THREE.Vector2(0.04, 0.12),
			new THREE.Vector2(0.00, 0.00)  // centro: X = 0 (eje)
		];

		// Más segmentos mejora la apariencia exterior
		const wheelGeom = new THREE.LatheGeometry(wheelProfile, 64);
		wheelGeom.computeVertexNormals();

		// Material: usar DoubleSide evita que una cara invertida desaparezca
		const wheelMat = new THREE.MeshPhongMaterial({
			color: 0x111111,
			shininess: 30,
			side: THREE.DoubleSide
		});

		const wheel = new THREE.Mesh(wheelGeom, wheelMat);
		wheel.castShadow = true;
		wheel.receiveShadow = true;

		// Ajustes: centrar el eje de rotación de la rueda
		wheel.rotation.x = Math.PI / 2;
		wheel.rotation.z = Math.PI / 2;

		const legGeometry = new THREE.BoxGeometry(0.1, 1, 0.1);
		const legMaterial = new THREE.MeshPhongMaterial({ color: 0x555555, shininess: 10 });
		const leg = new THREE.Mesh(legGeometry, legMaterial);

		// --- 3) Uniones y posicionamiento dentro del group ---
		// colocamos la rueda al extremo de la pierna:
		wheel.position.set(0, -1, 0);

		gear.add(leg);
		gear.add(wheel);

		return gear;
	}

	// Rueda de cola simple (pequeña)
	createTailWheel() {
		const tail = new THREE.Group();
		const profile = [
			new THREE.Vector2(0.24, 0.00),
			new THREE.Vector2(0.20, 0.08),
			new THREE.Vector2(0.16, 0.12),
			new THREE.Vector2(0.08, 0.08),
			new THREE.Vector2(0.00, 0.00)
		];

		const g = new THREE.LatheGeometry(profile, 48);
		g.computeVertexNormals();

		const m = new THREE.MeshPhongMaterial({
			color: 0x111111,
			side: THREE.DoubleSide
		});
		const wheel = new THREE.Mesh(g, m);
		wheel.rotation.x = Math.PI/2;
		wheel.rotation.z = Math.PI/2;
		tail.add(wheel);
		return tail;
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

		const light = new THREE.DirectionalLight(0xffffff, 3);

		light.position.copy(sunPosition);
		scene.add(light);

		const ambientLight = new THREE.HemisphereLight(0xccccff, 0xaaaaaa, 0.6);
		scene.add(ambientLight);

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
		islandGroup.name = 'islandGroup';
		this.scene.add(islandGroup);
		const textureLoader = new THREE.TextureLoader();
		textureLoader.load('/iwojima.png', this.onTextureLoaded, this.onProgress, this.onLoadError);

		const geometry = new THREE.BufferGeometry();
		const vertices = [];
		const indices = [];
		const uvs = [];

		// === 4 ANILLOS CLAVE (solo donde cambia la forma) ===
		const levels = [
		{ y: 0,      w: 10, d: 10, uv: 0.0 },   // Base
		{ y: 50,     w: 10, d: 10, uv: 0.5 },   // Final de fuste
		{ y: 60,     w: 30, d: 30, uv: 0.75 },   // Inicio sala de control
		{ y: 65,     w: 0,  d: 0,  uv: 1.0 }    // Punta (colapsada)
		];
		let vertexIndex = 0;
		levels.forEach(level => {
			const hw = level.w / 2;
			const hd = level.d / 2;
			// 4 vértices por anillo (orden horario)
			vertices.push(-hw, level.y, -hd);
			vertices.push( hw, level.y, -hd);
			vertices.push( hw, level.y, -hd);
			vertices.push( hw, level.y,  hd);
			vertices.push(-hw, level.y,  hd);

			// UVs: repite horizontal, escala vertical
			uvs.push(0.75, level.uv);
			uvs.push(1.00, level.uv);
			uvs.push(0.0, level.uv);
			uvs.push(0.25, level.uv);
			uvs.push(0.5, level.uv);
			if(vertexIndex > 0){
				// Cuatro caras (cada una es un quad = 2 triángulos)
				// Orden ajustado para normales externas (counterclockwise desde fuera)

				// Cara trasera
				indices.push(vertexIndex -4, vertexIndex -5, vertexIndex +1);
				indices.push(vertexIndex -5, vertexIndex , vertexIndex +1);

				// Cara derecha
				indices.push(vertexIndex -3, vertexIndex -4, vertexIndex +2);
				indices.push(vertexIndex -4, vertexIndex +1, vertexIndex +2);

				// Cara frontal
				indices.push(vertexIndex -2, vertexIndex -3, vertexIndex +3);
				indices.push(vertexIndex -3, vertexIndex +2, vertexIndex +3);

				// Cara izquierda
				indices.push(vertexIndex -1, vertexIndex -2, vertexIndex +4);
				indices.push(vertexIndex -2, vertexIndex +3, vertexIndex +4);

				indices.push(vertexIndex -5, vertexIndex -1, vertexIndex );
				indices.push(vertexIndex -1, vertexIndex +4, vertexIndex );
			}

			vertexIndex += 5;
		});

		geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
		geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
		geometry.setIndex(indices);

		geometry.computeVertexNormals();
		const towerTexture = textureLoader.load('/torre_control.png');
		const towerMaterial = new THREE.MeshPhongMaterial({ map: towerTexture });

		const torre = new THREE.Mesh(geometry, towerMaterial);
		torre.name = 'torre';

		/// Barracas Central
		const barrack = new THREE.CylinderGeometry(7.5, 7.5, 30, 32);
		const uvArray = barrack.attributes.uv.array;
		for(let i=0; i<uvArray.length/2; i++){
			let u = uvArray[i*2];
			let v = uvArray[i*2+1];
			uvArray[i*2] = v;
			uvArray[i*2+1] = 1-u;
		}
		barrack.rotateX(Math.PI / 2);
		barrack.rotateY(Math.PI / 2);
		const normalTexture = textureLoader.load('/metal_corrugado.jpg');
		normalTexture.wrapS = THREE.RepeatWrapping;
		const wallTexture = textureLoader.load('/hangar_wall.jpg');
		const doorTexture = textureLoader.load('/hangar_door.jpg');
		const backTexture = doorTexture.clone();
		backTexture.flipY = false;
		backTexture.needsUpdate = true;
		const wallMaterial = new THREE.MeshPhongMaterial({ normalMap: normalTexture, map: wallTexture, normalScale: new THREE.Vector2(0.5, 0.5) });
		const doorMaterial = new THREE.MeshPhongMaterial({ map: doorTexture });
		const backMaterial = new THREE.MeshPhongMaterial({ map: backTexture });
		const barrackMaterials = [ wallMaterial, doorMaterial, backMaterial ];

		const loader = new GLTFLoader();
		loader.load('/destructor.glb', this.onModelLoaded, this.onProgress, this.onLoadError);

		const pistas = new THREE.Group();
		const edificios = new THREE.Group();
		const block = new THREE.BoxGeometry(10, 10, 10);
		const blockMaterial = new THREE.MeshPhongMaterial({ color: 0x7d7d7d });
		const pista1 = new THREE.Mesh(block, blockMaterial);
		pista1.name = "pista";
		const pista2 = new THREE.Mesh(block, blockMaterial);

		///  Foo Fighters
		const fighter = new THREE.Group();
		fighter.name = "Fighter";
		const fuselage = this.createZeroFuselage();
		fuselage.scale.set(1.2,1.2,1.2);
		fighter.add(fuselage);
		const wingTexture = textureLoader.load('/wing.png');
		const wingMaterial = new THREE.MeshPhongMaterial({ map: wingTexture , side: THREE.DoubleSide });
		const wing1 = this.createWing();
		wing1.material = wingMaterial;
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
		propeller1.material.color = new THREE.Color(0x000000);
		propeller1.scale.set(0.2,0.5,0.1);
		propellers.rotation.x = MathUtils.degToRad(90);
		propellers.position.set(0,0,-6);
		propellers.add(propeller1);
		const propeller2 = propeller1.clone();
		propeller2.scale.set(0.2,0.5,0.1);
		propeller2.rotation.y= MathUtils.degToRad(120);
		propellers.add(propeller2);
		const propeller3 = propeller1.clone();
		propeller3.scale.set(0.2,0.5,0.1);
		propeller3.rotation.y= MathUtils.degToRad(-120);
		propellers.add(propeller3);
		const leftGear = this.createLandingGear();
		leftGear.name = "leftGear";
		leftGear.position.set(-4, -0.5, 0);
		const rightGear = this.createLandingGear();
		rightGear.name = "rightGear";
		rightGear.position.set(-4, -0.5, 0);
		const tailWheel = this.createTailWheel();
		tailWheel.position.set(0, -0.5, 5.0);
		wing1.add(leftGear);
		wing2.add(rightGear);
		fighter.add(tailWheel);
		
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

			minY: 107
		});
		this.airplaneController.setTransform({
			position: new THREE.Vector3(150, 107, -225),
			euler: new THREE.Euler(0, MathUtils.degToRad(130), 0, 'YXZ'),
			throttle: 0
		});
		document.addEventListener('keydown', (e) => {
			if (e.code === 'KeyR') {
				this.airplaneController.setTransform({
            		position: new THREE.Vector3(150, 107, -225),
            		euler: new THREE.Euler(0, MathUtils.degToRad(130), 0, 'YXZ'),
            		throttle: 0
				});
			}
		});

		edificios.add(pista2);
		edificios.add(torre);
		for(let i=0; i<7; i++){
			const barrackN = new THREE.Mesh(barrack, barrackMaterials);
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
		scene.add(fighter);
		fighter.position.set(150,107,-225);
		pistas.rotateY(MathUtils.degToRad(-50));
		pistas.position.set(100,100,-150);
		islandGroup.add(pistas);
		this.clock = new THREE.Clock();
	}

	animate() {
		const destructor = this.scene.getObjectByName("Destructor");
		const barquito = this.scene.getObjectByName("destructor");
		const torreta = this.scene.getObjectByName("torreta");
		const canon = this.scene.getObjectByName("canon");
		const leftGear = this.scene.getObjectByName("leftGear");
		const rightGear = this.scene.getObjectByName("rightGear");
    
    	if (!barquito) return;
		destructor.rotation.y += 0.003;

		const dt = Math.min(0.05, this.clock.getDelta()); // clamp por si se pausa un tab
  		this.airplaneController.update(dt);
		const propellers = this.scene.getObjectByName("propellers");
		propellers.rotation.y += 0.5* this.airplaneController.getEnginePower()*100;
		if(this.airplaneController.isAirborne()){
			leftGear.rotation.z = Math.min(leftGear.rotation.z + dt * 1.5, Math.PI / 4);
			rightGear.rotation.z = Math.min(rightGear.rotation.z + dt * 1.5, Math.PI / 4);
		}else{
			leftGear.rotation.z = Math.max(leftGear.rotation.z - dt * 1.5, 0);
			rightGear.rotation.z = Math.max(rightGear.rotation.z - dt * 1.5, 0);
		}

		const shipWorldPos = new THREE.Vector3();
		barquito.getWorldPosition(shipWorldPos);
		const fighter = this.scene.getObjectByName("Fighter");
		const airplaneWorldPos = new THREE.Vector3();
		fighter.getWorldPosition(airplaneWorldPos);
		let localOffset = new THREE.Vector3();
		let worldOffset = new THREE.Vector3();
		switch (this.mode) {
			case '1':  // Orbital general centrada en la isla
				this.controls.enable = true;
				this.controls.target.set(0,0,0);  // Posición de pistas/isla
				this.camera.position.copy(new THREE.Vector3(0, 1000, 0));
				break;
			case '2':  // Persecución del avión (detrás)
				this.controls.enable = false;
				localOffset = new THREE.Vector3(0, 10, 25);
				worldOffset = localOffset.clone().applyQuaternion(fighter.quaternion);
				const chaseCameraPos = airplaneWorldPos.clone().add(worldOffset);
				this.camera.position.lerp(chaseCameraPos, 0.1);
				this.camera.lookAt(airplaneWorldPos);
				break;
			case '3':  // Primera persona del avión (cockpit)
				this.controls.enable = false;
				fighter.getWorldPosition(airplaneWorldPos);
				localOffset = new THREE.Vector3(0, 1.5, -3); // Posición en cockpit; ajusta valores
				const dogfightCameraPos = localOffset.clone().applyQuaternion(fighter.quaternion).add(airplaneWorldPos);
				this.camera.position.copy(dogfightCameraPos);
				this.camera.quaternion.copy(fighter.quaternion);
				break;
			case '4':  // Orbital centrada en el barco
				this.controls.enable = true;
				this.controls.target.copy(shipWorldPos);
				this.camera.position.copy(shipWorldPos.clone().add(new THREE.Vector3(0, 500, 0)));
				break;
			case '5':  // De persecución del barco (detrás)
				this.controls.enable = false;
				localOffset = new THREE.Vector3(0, 40, -120);
				worldOffset = localOffset.clone().applyQuaternion(destructor.quaternion);
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
			case '9':  // Freecam
				this.controls.enable = true;
				break;
			default:
				break;
		}
		
		if (this.controls.enable) {
        	this.controls.update();
    	}
	}
}