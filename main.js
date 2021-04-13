// "use strict";
const canvas = document.getElementById("wtf");
const ctx = canvas.getContext("2d");
const videoElement = document.getElementById("videoElement");
let net = null;
let rendered = false;

let THREECAMERA = null;

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
    followZRot: true,
    videoSettings: { videoElement },
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
  videoElement.height = videoElement.width / aspectRatio;

  net = await bodyPix.load();
  main();
}

async function perform() {
  const segmentation = await net.segmentPerson(videoElement);
  const maskBackground = true;
  // Convert the segmentation into a mask to darken the background.
  const foregroundColor = { r: 255, g: 255, b: 255, a: 255 };
  const backgroundColor = { r: 0, g: 255, b: 0, a: 255 };
  const backgroundDarkeningMask = bodyPix.toMask(segmentation, foregroundColor, backgroundColor);

  const opacity = 1;
  const edgeBlurAmount = 1;
  const flipHorizontal = true;

  bodyPix.drawMask(canvas, videoElement, backgroundDarkeningMask, opacity, edgeBlurAmount, flipHorizontal);
  if (!rendered) {
    document.getElementById("loading").style.display = "none";
  }
  rendered = true;
}

startVideoStream();
