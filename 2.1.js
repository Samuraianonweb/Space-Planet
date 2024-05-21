let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);
let renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true; // Enable shadows in renderer
document.body.appendChild(renderer.domElement);

camera.position.z = 1000;

// Initialize OrbitControls
let controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // Smooth rotation
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

let scale = 1;
let minScale = 0.1;
let maxScale = 5;
let zoomSlider = document.getElementById('zoom');

zoomSlider.addEventListener('input', function () {
    setScale(parseFloat(this.value));
});

//let baseG = 1;
//let G = baseG;
//let waveAmplitude = 1;
//let waveFrequency = 1;

let objects = [];
let skybox;

// Create and add the skybox
let loader = new THREE.TextureLoader();
loader.load('/planet/milkyway.jpg', function (texture) {
    const skyboxGeometry = new THREE.SphereGeometry(5000, 32, 32);
    const skyboxMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        side: THREE.BackSide
    });
    skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);
});

let targetObject = null;
let followDistance = 100; // Distance for the camera to follow the object
let directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(0, 100, 1000);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048; // Shadow map size (larger is higher quality)
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.near = 0.5; // Near clipping plane
directionalLight.shadow.camera.far = 10000; // Far clipping plane
scene.add(directionalLight);

function setCameraTarget(object) {
    targetObject = object;
}

function updateObjectSelector() {
    let selector = document.getElementById('objectSelector');
    selector.innerHTML = ''; // Clear current options
    objects.forEach((obj, index) => {
        let option = document.createElement('option');
        option.value = index;
        option.text = obj.name;
        selector.appendChild(option);
    });
}

function createObject(name, mass, radius, x,y, z, vx, vy, vz, color, textureUrl, isLightSource, lightIntensity, rotationSpeed) {
    let geometry = new THREE.SphereGeometry(radius, 32, 32);
    let materialOptions = {};
    if (textureUrl) {
        let texture = new THREE.TextureLoader().load(textureUrl);
        materialOptions.map = texture;
    } else {
        materialOptions.color = color;
    }
    let material = new THREE.MeshStandardMaterial(materialOptions); // Use the texture or color
    let mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true; // Object casts shadow
    mesh.receiveShadow = true; // Object receives shadow
    scene.add(mesh);

    let light = null;
    if (isLightSource) {
        light = new THREE.PointLight(0xffffff, lightIntensity, 5000);
        light.position.set(x, y, z);
        light.castShadow = true;
        scene.add(light);
    }

    let pathMaterial = new THREE.LineBasicMaterial({ color: 0xff0000 });
    let pathGeometry = new THREE.BufferGeometry();
    let pathLine = new THREE.Line(pathGeometry, pathMaterial);
    scene.add(pathLine);

    return {
        name: name,
        mass: mass,
        radius: radius,
        x: x,
        y: y,
        z: z,
        vx: vx,
        vy: vy,
        vz: vz,
        mesh: mesh,
        light: light,
        rotationSpeed: rotationSpeed,
        path: [],
        pathLine: pathLine,
        pathGeometry: pathGeometry
    };
}

document.getElementById('createObject').addEventListener('click', () => {
    let name = document.getElementById('objectName').value;
    let mass = parseFloat(document.getElementById('objectMass').value);
    let radius = parseFloat(document.getElementById('objectRadius').value);
    let color = document.getElementById('objectColor').value;
    let xp = parseFloat(document.getElementById('xp').value);
    let yp = parseFloat(document.getElementById('yp').value);
    let zp = parseFloat(document.getElementById('zp').value);
    let texture = document.getElementById('objectTexture').value;
    let newObject = createObject(name, mass, radius, checkValue(xp),checkValue(yp),checkValue(zp), 0, 0, 0, color, texture, false, 0, Math.random() * 0.02 - 0.01);
    console.log(xp,yp,zp);
    objects.push(newObject);
    updateObjectSelector();
    setCameraTarget(newObject);
});

document.getElementById('focusObject').addEventListener('click', () => {
    let selector = document.getElementById('objectSelector');
    let selectedIndex = parseInt(selector.value);
    if (!isNaN(selectedIndex) && objects[selectedIndex]) {
        setCameraTarget(objects[selectedIndex]);
    }
});

// Example of initial objects
objects.push(createObject('N1', 10000, 100, 0, 0, 0, 0, 0, 0, '#ff0000', 'planet/7.png', true, 10, 0.001));
objects.push(createObject('N3', 100, 50, 1000, 0, 0, 0, 0, -2, '#0000ff', 'planet/2.jpg', true, 1, 0));

updateObjectSelector(); // Update object selector on initialization
function checkValue(value) {
  if (isNaN(value) || value === 0) {
    return 10;
  } else {
    return value;
  }
}
function calculateGravity(obj1, obj2) {
    let dx = obj2.x - obj1.x;
    let dy = obj2.y - obj1.y;
    let dz = obj2.z - obj1.z;
    let distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    let force = (obj1.mass * obj2.mass) / (distance * distance);
    let angleXY = Math.atan2(dy, dx);
    let angleZ = Math.atan2(dz, distance);
    let fx = force * Math.cos(angleXY) * Math.cos(angleZ);
    let fy = force * Math.sin(angleXY) * Math.cos(angleZ);
    let fz = force * Math.sin(angleZ);
    obj1.vx += fx / obj1.mass;
    obj1.vy += fy / obj1.mass;
    obj1.vz += fz / obj1.mass;
    obj2.vx -= fx / obj2.mass;
    obj2.vy -= fy / obj2.mass;
    obj2.vz -= fz / obj2.mass;
}

function setScale(newScale) {
    scale = Math.min(Math.max(newScale, minScale), maxScale);
    camera.position.z = 1000 / scale;
}

function updatePosition(obj) {
    obj.x += obj.vx;
    obj.y += obj.vy;
    obj.z += obj.vz;
    obj.mesh.position.set(obj.x, obj.y, obj.z);
    if (obj.light) {
        obj.light.position.set(obj.x, obj.y, obj.z);
    }
    obj.path.push(new THREE.Vector3(obj.x, obj.y, obj.z));
    obj.pathGeometry.setFromPoints(obj.path);
}

function updateRotation(obj) {
    obj.mesh.rotation.y += obj.rotationSpeed;
}

function animate() {
    requestAnimationFrame(animate);

    //G = baseG + waveAmplitude * Math.sin(Date.now() * 0.001 * waveFrequency);

    for (let i = 0; i < objects.length; i++) {
        for (let j = i + 1; j < objects.length; j++) {
            calculateGravity(objects[i], objects[j]);
        }
    }

    for (let obj of objects) {
        updatePosition(obj);
        updateRotation(obj);
    }

    if (targetObject) {
        // Set target for focusing on the object
        controls.target.set(targetObject.x, targetObject.y, targetObject.z);
    }

    if (skybox) {
        skybox.position.set(camera.position.x, camera.position.y, camera.position.z);
    }

    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
});

setScale(1);
animate();
