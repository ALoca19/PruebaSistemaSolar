import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import TWEEN from '@tweenjs/tween.js';

// Datos de los planetas
const planetsData = [
    { name: 'Sol', path: './assets/Models/Sol.glb', audioPath: './assets/Audio/Sol.mp3', rotationSpeed: 0.001, info: 'El Sol es una estrella de secuencia principal con un diámetro de 1.39 millones de km.' },
    { name: 'Mercurio', path: './assets/Models/Mercurio.glb', audioPath: './assets/Audio/Mercurio.mp3', rotationSpeed: 0.004, orbitSpeed: 0.004, radius: 3.9, isOrbiting: true, info: 'Mercurio es el planeta más pequeño.' },
    { name: 'Venus', path: './assets/Models/Venus.glb', audioPath: './assets/Audio/Venus.mp3', rotationSpeed: 0.002, orbitSpeed: 0.003, radius: 7.2, isOrbiting: true, info: 'Venus es el planeta más caliente.' },
    { name: 'Tierra', path: './assets/Models/Tierra.glb', audioPath: './assets/Audio/Tierra.mp3', rotationSpeed: 0.01, orbitSpeed: 0.002, radius: 10.0, isOrbiting: true, info: 'La Tierra es el único planeta con vida conocida.' },
    { name: 'Marte', path: './assets/Models/Marte.glb', audioPath: './assets/Audio/Marte.mp3', rotationSpeed: 0.009, orbitSpeed: 0.0015, radius: 15.2, isOrbiting: true, info: 'Marte es conocido como el planeta rojo.' },
    { name: 'Jupiter', path: './assets/Models/Jupiter.glb', audioPath: './assets/Audio/Jupiter.mp3', rotationSpeed: 0.02, orbitSpeed: 0.0008, radius: 52.0, isOrbiting: true, info: 'Júpiter es el planeta más grande.' },
    { name: 'Saturno', path: './assets/Models/Saturno.glb', audioPath: './assets/Audio/Saturno.mp3', rotationSpeed: 0.018, orbitSpeed: 0.0006, radius: 95.8, isOrbiting: true, info: 'Saturno es famoso por sus anillos.' },
    { name: 'Urano', path: './assets/Models/Urano.glb', audioPath: './assets/Audio/Urano.mp3', rotationSpeed: 0.012, orbitSpeed: 0.0004, radius: 191.8, isOrbiting: true, info: 'Urano gira de lado.' },
    { name: 'Neptuno', path: './assets/Models/Neptuno.glb', audioPath: './assets/Audio/Neptuno.mp3', rotationSpeed: 0.011, orbitSpeed: 0.0003, radius: 300.7, isOrbiting: true, info: 'Neptuno tiene los vientos más rápidos.' }
];

// Audios especiales
const introAudioPath = './assets/Audio/Intro.mp3';
const outroAudioPath = './assets/Audio/Termino.mp3';

class App {
    constructor() {
        this.container = document.getElementById('app');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x010b22);

        // Crear un grupo para la escena que moveremos en VR
        this.sceneGroup = new THREE.Group();
        this.scene.add(this.sceneGroup);

        // Configurar cámara
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(28.20, 16.80, 9.61);
        this.camera.rotation.set(-1.08, 0.75, 0.90);

        // Audio Listener
        this.listener = new THREE.AudioListener();
        this.camera.add(this.listener);

        // Configurar renderizador
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.xr.enabled = true;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.container.appendChild(this.renderer.domElement);

        // Botón VR
        document.body.appendChild(VRButton.createButton(this.renderer));

        // Controles
        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
        this.isManualControlEnabled = true;

        // Variables de movimiento
        this.moveSpeed = 0.1;
        this.velocity = new THREE.Vector3();
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.moveUp = false;
        this.moveDown = false;

        // Audio
        this.audioBuffers = {};
        this.sounds = {};
        this.currentAudio = null;

        // Variables para la secuencia
        this.isSequenceActive = false;
        this.currentPlanet = null;

        // Flecha indicadora para VR
        this.arrow = new THREE.Mesh(
            new THREE.ConeGeometry(0.05, 0.2, 8),
            new THREE.MeshBasicMaterial({ color: 0xff0000 })
        );
        this.arrow.position.set(0, -0.1, -0.5); // Frente a la cámara
        this.camera.add(this.arrow);
        this.arrow.visible = false;

        // Controladores VR
        this.controllers = [];
        this.setupVRControllers();

        // Configurar eventos y escena
        this.setupEvents();
        this.initScene();
        this.loadAudios();

        // Bucle de animación
        this.renderer.setAnimationLoop(this.animate.bind(this));
    }

    setupVRControllers() {
        for (let i = 0; i < 2; i++) {
            const controller = this.renderer.xr.getController(i);
            controller.addEventListener('selectstart', () => {
                if (this.isManualControlEnabled && this.renderer.xr.isPresenting) {
                    this.startCameraSequence();
                }
            });
            this.scene.add(controller);
            this.controllers.push(controller);
        }

        const controllerGeometry = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, -1)
        ]);
        const controllerMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
        const controllerLine = new THREE.Line(controllerGeometry, controllerMaterial);
        controllerLine.scale.z = 5;

        this.controllers.forEach((controller) => {
            controller.add(controllerLine.clone());
        });
    }

    setupEvents() {
        document.addEventListener('click', () => {
            if (this.isManualControlEnabled && !this.renderer.xr.isPresenting) {
                this.controls.lock();
            }
        });

        this.controls.addEventListener('lock', () => console.log('Controles bloqueados'));
        this.controls.addEventListener('unlock', () => console.log('Controles desbloqueados'));

        document.addEventListener('touchstart', () => {
            if (this.isManualControlEnabled && this.renderer.xr.isPresenting) {
                this.startCameraSequence();
            }
        });

        document.addEventListener('keydown', (event) => {
            switch (event.code) {
                case 'KeyS': this.moveForward = true; break;
                case 'KeyW': this.moveBackward = true; break;
                case 'KeyA': this.moveLeft = true; break;
                case 'KeyD': this.moveRight = true; break;
                case 'Space': this.moveUp = true; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.moveDown = true; break;
                case 'Enter':
                    console.log(`Posición: ${this.camera.position.x.toFixed(2)}, ${this.camera.position.y.toFixed(2)}, ${this.camera.position.z.toFixed(2)}`);
                    console.log(`Rotación: ${this.camera.rotation.x.toFixed(2)}, ${this.camera.rotation.y.toFixed(2)}, ${this.camera.rotation.z.toFixed(2)}`);
                    break;
            }
        });

        document.addEventListener('keyup', (event) => {
            switch (event.code) {
                case 'KeyS': this.moveForward = false; break;
                case 'KeyW': this.moveBackward = false; break;
                case 'KeyA': this.moveLeft = false; break;
                case 'KeyD': this.moveRight = false; break;
                case 'Space': this.moveUp = false; break;
                case 'ShiftLeft':
                case 'ShiftRight': this.moveDown = false; break;
            }
        });

        window.addEventListener('resize', this.resize.bind(this));

        // En setupEvents (o donde configures los eventos XR), añadimos los ajustes
		this.renderer.xr.addEventListener('sessionstart', () => {
			console.log('Sesión VR iniciada');
			this.isManualControlEnabled = true;
			if (this.controls.isLocked) this.controls.unlock();
			this.sceneGroup.position.y = 5; // Subir la escena en VR (ajusta este valor si es necesario)
			this.sceneGroup.position.x = 0; 
			this.sceneGroup.position.z = 0; 
		});

        this.renderer.xr.addEventListener('sessionend', () => {
		console.log('Sesión VR finalizada');
		this.isManualControlEnabled = true;
		this.sceneGroup.position.y = 0; // Restaurar la posición original
		this.sceneGroup.position.x = 0;
		this.sceneGroup.position.z = 0;
		});
    }

    startCameraSequence() {
        this.isManualControlEnabled = false;
        if (this.controls.isLocked) this.controls.unlock();

        console.log('Iniciando secuencia de cámara');
        this.isSequenceActive = true;
        this.currentPlanet = null;

        if (this.currentAudio && this.currentAudio.isPlaying) {
            this.currentAudio.stop();
            this.currentAudio = null;
        }

        const introTween = new TWEEN.Tween({})
            .to({}, this.sounds['inicioSound']?.duration || 2000)
            .onStart(() => {
                if (this.sounds['inicioSound']) {
                    this.currentAudio = this.sounds['inicioSound'];
                    this.currentAudio.play();
                }
            });

        const planetPositions = [];
        planetsData.forEach((planetData) => {
            const planet = this.sceneGroup.getObjectByName(planetData.name);
            if (planet && planetData.name !== 'Sol') {
                planetData.rotationSpeedBak = planetData.rotationSpeed;
                planetData.isOrbiting = false;
                planetPositions.push({ name: planetData.name, position: planet.position.clone() });
            } else if (planet && planetData.name === 'Sol') {
                planetPositions.push({ name: 'Sol', position: planet.position.clone() });
            }
        });

        if (planetPositions.length === 0) {
            console.warn('No se encontraron planetas para la secuencia');
            this.isManualControlEnabled = true;
            this.isSequenceActive = false;
            return;
        }

        let previousTween = introTween;
        planetPositions.forEach((planetInfo, index) => {
            let posicionXPlus = 0;
            if (planetInfo.name === 'Jupiter' || planetInfo.name === 'Saturno') {
                posicionXPlus = 10;
            } else if (planetInfo.name === 'Urano' || planetInfo.name === 'Neptuno') {
                posicionXPlus = 6;
            } else {
                posicionXPlus = 1;
            }

            const targetPosition = new THREE.Vector3(
                //planetInfo.position.x + (planetInfo.name === 'Sol' ? 2 : posicionXPlus),
				planetInfo.position.x,
                planetInfo.position.y,
                planetInfo.position.z 
            );

            const sceneGroupTarget = this.renderer.xr.isPresenting
                ? targetPosition.clone().negate()
                : new THREE.Vector3(0, 0, 0);

            const positionTween = new TWEEN.Tween(
                this.renderer.xr.isPresenting ? this.sceneGroup.position : this.camera.position
            )
                .to(
                    this.renderer.xr.isPresenting
                        ? { x: sceneGroupTarget.x, y: sceneGroupTarget.y, z: sceneGroupTarget.z }
                        : { x: targetPosition.x, y: targetPosition.y, z: targetPosition.z },
                    3000
                )
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onStart(() => {
                    this.currentPlanet = planetInfo.name;
                    if (this.currentAudio && this.currentAudio.isPlaying) {
                        this.currentAudio.stop();
                    }
                    if (this.sounds[planetInfo.name]) {
                        this.currentAudio = this.sounds[planetInfo.name];
                        this.currentAudio.play();
                    }
                })
                .onComplete(() => {
                    if (!this.renderer.xr.isPresenting) {
                        this.camera.lookAt(planetInfo.position);
                    }
                });

            const waitTween = new TWEEN.Tween({})
                .to({}, this.sounds[planetInfo.name]?.duration || 2000);

            previousTween.chain(positionTween);
            positionTween.chain(waitTween);
            previousTween = waitTween;

            if (index === planetPositions.length - 1) {
                waitTween.onComplete(() => {
                    if (this.currentAudio && this.currentAudio.isPlaying) {
                        this.currentAudio.stop();
                    }
                    if (this.sounds['terminoSound']) {
                        this.currentAudio = this.sounds['terminoSound'];
                        this.currentAudio.play();
                    }
                    planetsData.forEach((planetData) => {
                        if (planetData.name !== 'Sol') {
                            planetData.rotationSpeed = planetData.rotationSpeedBak || 0;
                            planetData.isOrbiting = true;
                        }
                    });
                    this.isManualControlEnabled = true;
                    this.isSequenceActive = false;
                    this.currentPlanet = null;
                    this.arrow.visible = false;
                    console.log('Secuencia finalizada');
                });
            }
        });

        introTween.start();
    }

    initScene() {
        const skyboxTextures = [
            './assets/Texturas/ulukai/corona_ft.png',
            './assets/Texturas/ulukai/corona_bk.png',
            './assets/Texturas/ulukai/corona_up.png',
            './assets/Texturas/ulukai/corona_dn.png',
            './assets/Texturas/ulukai/corona_rt.png',
            './assets/Texturas/ulukai/corona_lf.png'
        ];
        const cubeTextureLoader = new THREE.CubeTextureLoader();
        this.scene.background = cubeTextureLoader.load(skyboxTextures);

        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        this.scene.add(ambientLight);

        const sunLight = new THREE.PointLight(0xfff8e1, 80, 5000, 2);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 1024;
        sunLight.shadow.mapSize.height = 1024;
        sunLight.shadow.camera.near = 0.1;
        sunLight.shadow.camera.far = 5000;
        this.sceneGroup.add(sunLight);

        const loader = new GLTFLoader();
        planetsData.forEach((planetData, index) => {
            loader.load(
                planetData.path,
                (gltf) => {
                    const planet = gltf.scene;
                    planet.name = planetData.name;
                    planet.rotationSpeed = planetData.rotationSpeed || 0.01;

                    planet.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    if (planetData.name !== 'Sol' && planetData.radius) {
                        const angle = (index - 1) * Math.PI / 4;
                        planet.position.set(
                            planetData.radius * Math.cos(angle),
                            0,
                            planetData.radius * Math.sin(angle)
                        );
                    } else {
                        planet.position.set(0, 0, 0);
                    }
                    this.sceneGroup.add(planet);
                    console.log(`Modelo ${planetData.name} cargado en posición:`, planet.position);
                },
                (progress) => console.log(`Cargando ${planetData.name}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`),
                (error) => console.error(`Error al cargar ${planetData.name}:`, error)
            );
        });
    }

    loadAudios() {
        const audioLoader = new THREE.AudioLoader();
        const audioLoadPromises = [];

        const loadAudio = (path, key) => {
            return new Promise((resolve, reject) => {
                audioLoader.load(
                    path,
                    (buffer) => {
                        this.audioBuffers[key] = buffer;
                        console.log(`Audio ${key} cargado`);
                        resolve();
                    },
                    (progress) => console.log(`Cargando audio ${key}: ${(progress.loaded / progress.total * 100).toFixed(2)}%`),
                    (error) => {
                        console.error(`Error al cargar audio ${key}:`, error);
                        reject(error);
                    }
                );
            });
        };

        planetsData.forEach((planetData) => audioLoadPromises.push(loadAudio(planetData.audioPath, planetData.name)));
        audioLoadPromises.push(loadAudio(introAudioPath, 'inicioSound'));
        audioLoadPromises.push(loadAudio(outroAudioPath, 'terminoSound'));

        Promise.all(audioLoadPromises).then(() => {
            console.log('Todos los audios cargados');
            Object.keys(this.audioBuffers).forEach((key) => {
                const sound = new THREE.Audio(this.listener);
                sound.setBuffer(this.audioBuffers[key]);
                sound.setVolume(0.5);
                sound.duration = this.audioBuffers[key].duration * 1000;
                this.sounds[key] = sound;
            });
        }).catch((error) => console.error('Error al cargar audios:', error));
    }

    animate() {
        TWEEN.update();

        if (this.isManualControlEnabled && !this.renderer.xr.isPresenting) {
            this.velocity.x = 0;
            this.velocity.y = 0;
            this.velocity.z = 0;

            if (this.moveForward) this.velocity.z -= this.moveSpeed;
            if (this.moveBackward) this.velocity.z += this.moveSpeed;
            if (this.moveLeft) this.velocity.x -= this.moveSpeed;
            if (this.moveRight) this.velocity.x += this.moveSpeed;
            if (this.moveUp) this.velocity.y += this.moveSpeed;
            if (this.moveDown) this.velocity.y -= this.moveSpeed;

            this.controls.moveRight(this.velocity.x);
            this.controls.moveForward(this.velocity.z);
            this.camera.position.y += this.velocity.y;
        }

        if (this.isSequenceActive && this.currentPlanet && this.renderer.xr.isPresenting) {
            const planet = this.sceneGroup.getObjectByName(this.currentPlanet);
            if (planet) {
                this.arrow.lookAt(planet.getWorldPosition(new THREE.Vector3()));
                this.arrow.visible = true;
            } else {
                this.arrow.visible = false;
            }
        } else {
            this.arrow.visible = false;
        }

        const time = Date.now();
        planetsData.forEach((planetData) => {
            const planet = this.sceneGroup.getObjectByName(planetData.name);
            if (planet) {
                planet.rotation.y += planetData.rotationSpeed;
                if (planetData.name !== 'Sol' && planetData.orbitSpeed && planetData.radius && planetData.isOrbiting) {
                    const angle = time * planetData.orbitSpeed;
                    planet.position.set(
                        planetData.radius * Math.cos(angle),
                        0,
                        planetData.radius * Math.sin(angle)
                    );
                }
            }
        });

        this.renderer.render(this.scene, this.camera);
    }

    resize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

export { App };