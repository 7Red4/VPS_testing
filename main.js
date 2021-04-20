// "use strict";
const MAIN_WRAP = document.getElementById("MAIN_WRAP");

const canvas = document.getElementById("bgRemove");
const ctx = canvas.getContext("2d");
const jeeFaceFilterCanvas = document.getElementById("jeeFaceFilterCanvas");

const videoElement = document.getElementById("videoElement");

let net = null;
let rendered = false;
let STREAM = null;

let THREECAMERA = null;

function hide(el) {
  el.classList.add("hide");
}

function show(el) {
  el.classList.remove("hide");
}

function resize() {
  jeeFaceFilterCanvas.width = MAIN_WRAP.clientWidth;
  jeeFaceFilterCanvas.height = MAIN_WRAP.clientHeight;
  canvas.width = MAIN_WRAP.clientWidth;
  canvas.height = MAIN_WRAP.clientHeight;
}
resize();

window.addEventListener("resize", resize);

// callback: launched if a face is detected or lost.
function detect_callback(faceIndex, isDetected) {
  if (isDetected) {
    console.log("INFO in detect_callback(): DETECTED");
  } else {
    console.log("INFO in detect_callback(): LOST");
  }
}

// build the 3D. called once when Jeeliz Face Filter is OK
function init_threeScene(spec) {
  const threeStuffs = JeelizThreeHelper.init(spec, detect_callback);

  // CREATE A CUBE
  // const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  // const cubeMaterial = new THREE.MeshNormalMaterial();
  // const threeCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  // threeCube.frustumCulled = false;
  // threeStuffs.faceObject.add(threeCube);
  // threeCube.position.set(0, 1, 0);

  const light = new THREE.AmbientLight(0xffffff); // soft white light
  threeStuffs.faceObject.add(light);

  const loader = new THREE.GLTFLoader();
  loader.load(
    // resource URL
    "./dna.glb",
    // called when the resource is loaded
    function (gltf) {
      threeStuffs.faceObject.add(gltf.scene);
      gltf.scene.scale.set(10, 10, 10);
      gltf.scene.position.set(0, 0.35, 0);
      window.dna = gltf.scene;
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
    },
    function (error) {
      console.log("An error happened");
    }
  );

  //CREATE THE CAMERA
  THREECAMERA = JeelizThreeHelper.create_camera();
} // end init_threeScene()

// launched by body.onload():
function main() {
  JeelizResizer.size_canvas({
    canvasId: "jeeFaceFilterCanvas",
    callback: function (isError, bestVideoSettings) {
      init_faceFilter(bestVideoSettings);
    },
  });
}

function init_faceFilter(videoSettings) {
  JEELIZFACEFILTER.init({
    videoSettings: {
      videoElement,
    },
    canvasId: "jeeFaceFilterCanvas",
    NNCPath: "/neuralNets/", // root of NN_DEFAULT.json file
    maxFacesDetected: 1,
    callbackReady: function (errCode, spec) {
      if (errCode) {
        console.log("AN ERROR HAPPENS. ERR =", errCode);
        return;
      }

      console.log("INFO: JEELIZFACEFILTER IS READY");
      init_threeScene(spec);
    },

    // called at each render iteration (drawing loop):
    callbackTrack: function (detectState) {
      perform();
      JeelizThreeHelper.render(detectState, THREECAMERA);
    },
  }); //end JEELIZFACEFILTER.init call
}

function startVideoStream() {
  show(document.getElementById("loading"));
  hide(document.getElementById("load_btn"));
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      STREAM = stream;
      videoElement.srcObject = stream;
      plaVideo();
    })
    .catch((err) => {
      alert(`Following error occured: ${err}`);
    });
}

function plaVideo() {
  videoElement.play();
  videoElement.addEventListener("playing", (e) => loadBodyPix(e, STREAM));
}

async function loadBodyPix(e, stream) {
  const streamSetting = stream.getVideoTracks()[0].getSettings();
  const aspectRatio = streamSetting.aspectRatio;
  videoElement.width = streamSetting.width;
  videoElement.height = streamSetting.height;

  net = await bodyPix.load();
  main();
}

async function perform() {
  const segmentation = await net.segmentPerson(videoElement);
  const maskBackground = true;
  // Convert the segmentation into a mask to darken the background.
  const foregroundColor = { r: 255, g: 255, b: 255, a: 0 };
  const backgroundColor = { r: 0, g: 255, b: 0, a: 255 };
  const backgroundDarkeningMask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor);

  const opacity = 1;
  const edgeBlurAmount = 0;
  const flipHorizontal = true;

  bodyPix.drawMask(canvas, videoElement, backgroundDarkeningMask, opacity, edgeBlurAmount, flipHorizontal);
  const _IMAGE_DATA = ctx.getImageData(0, 0, canvas.width, canvas.height);
  colorReplace(_IMAGE_DATA.data);
  ctx.putImageData(_IMAGE_DATA, 0, 0);
  if (!rendered) {
    hide(document.getElementById("loading"));
    hide(document.getElementById("starting_frame"));
    show(document.getElementById("ui_controlls"));
  }
  rendered = true;
  // if(window.dna){
  //   window.dna.rotation.y += 0.05;
  // }
}

function colorReplace(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 1] === 255) {
      data[i + 3] = 0;
    }
  }
}

// startVideoStream();
