// "use strict";
const canvas = document.getElementById("wtf");
const ctx = canvas.getContext("2d");
const BG_IMAGE_CANVAS = document.createElement("canvas");
BG_IMAGE_CANVAS.width = 640;
BG_IMAGE_CANVAS.height = 480;
const BG_IMAGE_CANVAS_CTX = BG_IMAGE_CANVAS.getContext("2d");
let BG_IMAGE_DATA = null;
const videoElement = document.getElementById("videoElement");
const BG_IMAGE = new Image();
BG_IMAGE.onload = () => {
  BG_IMAGE_CANVAS_CTX.drawImage(BG_IMAGE, 0, 0);
  BG_IMAGE_DATA = BG_IMAGE_CANVAS_CTX.getImageData(0, 0, 640, 480);
};
BG_IMAGE.src = "background.png";
let net = null;
let rendered = false;

let THREECAMERA = null;

const jeeFaceFilterCanvas = document.getElementById("jeeFaceFilterCanvas");
jeeFaceFilterCanvas.width = window.innerWidth;
jeeFaceFilterCanvas.height = window.innerHeight;

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
  const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
  const cubeMaterial = new THREE.MeshNormalMaterial();
  const threeCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
  threeCube.frustumCulled = false;
  threeStuffs.faceObject.add(threeCube);

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
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false,
    })
    .then((stream) => {
      videoElement.srcObject = stream;

      videoElement.play();
      videoElement.addEventListener("playing", (e) => loadBodyPix(e, stream));
    })
    .catch((err) => {
      alert(`Following error occured: ${err}`);
    });
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
  const { width, height } = backgroundDarkeningMask;
  BG_IMAGE.width = width;
  BG_IMAGE.height = height;

  const opacity = 1;
  const edgeBlurAmount = 0;
  const flipHorizontal = true;

  bodyPix.drawMask(canvas, videoElement, backgroundDarkeningMask, opacity, edgeBlurAmount, flipHorizontal);
  const _IMAGE_DATA = ctx.getImageData(0, 0, canvas.width, canvas.height);
  colorReplace(_IMAGE_DATA.data);
  ctx.putImageData(_IMAGE_DATA, 0, 0);
  if (!rendered) {
    document.getElementById("loading").style.display = "none";
  }
  rendered = true;
}

function colorReplace(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 1] === 255) {
      data[i + 3] = 0;
    }
  }
}

startVideoStream();
