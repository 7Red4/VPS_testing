// "use strict";
const MAIN_WRAP = document.getElementById("MAIN_WRAP");

const canvas = document.getElementById("bgRemove");
const ctx = canvas.getContext("2d");
const jeeFaceFilterCanvas = document.getElementById("jeeFaceFilterCanvas");

const videoElement = document.getElementById("videoElement");

window.threeDobjs = {};
let NO_BG_REMOVE = false;
let net = null;
let rendered = false;
let STREAM = null;

let MAIN_SCENE = null;

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

  const light = new THREE.AmbientLight(0xffffff); // soft white light
  threeStuffs.faceObject.add(light);

  const Goggleloader = new THREE.GLTFLoader();

  Goggleloader.load(
    // resource URL
    "./assets/models/Goggle.glb",
    // called when the resource is loaded
    function (Goggle) {
      Goggle.scene.scale.set(9, 9, 9);
      Goggle.scene.position.set(0, 0.3, 0.5);
      
      window.threeDobjs.Goggle = Goggle.scene;
      // window.threeDobjs.Goggle.visible = false;
      threeStuffs.faceObject.add(Goggle.scene);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% Goggle loaded");
    },
    function (error) {
      console.error(error);
      console.log("An error happened");
    }
  );

  const Coatloader = new THREE.GLTFLoader();

  Coatloader.load(
    // resource URL
    "./assets/models/Coat.glb",
    // called when the resource is loaded
    function (Coat) {
      Coat.scene.scale.set(2.5, 2.5, 2.5);
      Coat.scene.position.set(0, -3, 0.5);

      window.threeDobjs.Coat = Coat.scene;
      window.threeDobjs.Coat.visible = false;
      threeStuffs.faceObject.add(Coat.scene);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% Coat loaded");
    },
    function (error) {
      console.error(error);
      console.log("An error happened");
    }
  );

  const Maskloader = new THREE.GLTFLoader();

  Maskloader.load(
    // resource URL
    "./assets/models/Mask.glb",
    // called when the resource is loaded
    function (Mask) {
      Mask.scene.scale.set(9, 9, 9);
      Mask.scene.position.set(0, -0.2, 0.2);
      window.threeDobjs.Mask = Mask.scene;
      window.threeDobjs.Mask.visible = false;
      threeStuffs.faceObject.add(Mask.scene);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% Mask loaded");
    },
    function (error) {
      console.error(error);
      console.log("An error happened");
    }
  );

  const Nerdyloader = new THREE.GLTFLoader();

  Nerdyloader.load(
    // resource URL
    "./assets/models/Nerdy.glb",
    // called when the resource is loaded
    function (Nerdy) {
      Nerdy.scene.scale.set(1, 1, 1);
      Nerdy.scene.position.set(0, 0, 0);
      window.threeDobjs.Nerdy = Nerdy.scene;
      // window.threeDobjs.Nerdy.visible = false;
      threeStuffs.faceObject.add(Nerdy.scene);
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% Nerdy loaded");
    },
    function (error) {
      console.error(error);
      console.log("An error happened");
    }
  );

  //CREATE THE CAMERA
  THREECAMERA = JeelizThreeHelper.create_camera();
} // end init_threeScene()

// launched by body.onload():
function main() {
  MAIN_SCENE = new THREE.Object3D();

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
      if (!NO_BG_REMOVE) perform();
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
    $(".ar-control-ui").show();
  }
  rendered = true;
  // if(window.dna){
  //   window.dna.rotation.y += 0.05;
  // }
}

function colorReplace(data) {
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 1] === 255 && data[i] === 0 && data[i + 2] === 0) {
      data[i + 3] = 0;
    }
  }
}

// Main

let payload = getUrlVars();
console.log(payload);

$(document).ready(function () {
  $(".ar-control-ui").hide();
  $(".ar-photo").show();
  $(".ar-gif").show();
  $(".ar-next").hide();
  $(".ar-result").hide();
  hide(SHUTTER);
  hide(document.getElementById("switch_gif_wrapper"));

  if (!payload.token) {
    window.location.href = "https://www.fun4lab.com";
  }
});

function nextStep() {
  window.location.href = "/congrat/" + payload.token + "/" + payload.gameId + "/" + payload.recordId;
}

function getUrlVars() {
  var vars = [],
    hash;
  var hashes = window.location.href.slice(window.location.href.indexOf("?") + 1).split("&");
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split("=");
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}
