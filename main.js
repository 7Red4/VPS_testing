// "use strict";
const MAIN_WRAP = document.getElementById('MAIN_WRAP');
const URL_FOR_REAL =
  'https://www.fun4lab.com/api/v1/virtual-photo-booth/upload/customer/product';

const URL_FOR_SHOW =
  'https://www.fun4lab.com/api/v1/virtual-photo-booth/upload/customer/only';

const BG_REMOVE_CANVAS = document.getElementById('bgRemove');
const bgRemoveCanvasctx = BG_REMOVE_CANVAS.getContext('2d');
const jeeFaceFilterCanvas = document.getElementById('jeeFaceFilterCanvas');

const STICKER_AREA = document.getElementById('sticker_area');

const videoElement = document.getElementById('videoElement');

const permission = {
  _value: true,
  get value() {
    return !!this._value;
  },
  set value(v) {
    this._value = !!v;
  }
};
const NO_BG_REMOVE = {
  _value: true,
  get value() {
    return !!this._value;
  },
  set value(v) {
    if (!!v !== this._value) {
      show(document.getElementById('starting_frame'));
      show(document.getElementById('loading'));
      hide(document.querySelector('.switch-frame'));
      JEELIZFACEFILTER.destroy().then(() => {
        startVideoStream();
      });
    }
    this._value = !!v;
  }
};
let net = null;
let rendered = false;
let STREAM = null;

let THREECAMERA = null;

let lastCheckId = 0;

let sharedUrl = {
  fb: '',
  tw: ''
};

let hideToggle = [false, false, false, false];

function hide(el) {
  el.classList.add('hide');
}

function show(el) {
  el.classList.remove('hide');
}

function resize() {
  const elements = [jeeFaceFilterCanvas, BG_REMOVE_CANVAS, STICKER_AREA];
  elements.forEach((el) => {
    el.width = MAIN_WRAP.clientWidth;
    el.height = MAIN_WRAP.clientHeight;
  });
}
resize();

window.addEventListener('resize', resize);

function changePermission(e) {
  permission.value = e.target.checked;
}

window._3dObjs = {};
function modelLoder(threeStuffs) {
  const loader = new THREE.GLTFLoader();
  const models = {
    Bottle: {
      scale: [1, 1, 1],
      position: [0, 0, 0]
    },
    'Chemical-1': {
      scale: [1, 1, 1],
      position: [0, 0, 0]
    },
    'Chemical-2': {
      scale: [1, 1, 1],
      position: [0, 0, 0]
    },
    Coat: {
      scale: [2.5, 2.5, 2.5],
      position: [0, -3, 0.5]
    },
    Dna: {
      scale: [1, 1, 1],
      position: [0, 0, 0]
    },
    Goggle: {
      scale: [9, 9, 9],
      position: [0, 0.3, 0.5]
    },
    Mask: {
      scale: [9, 9, 9],
      position: [0, -0.2, 0.2]
    },
    Nerdy: {
      scale: [6, 6, 6],
      position: [0, 1.5, 0]
    },
    Text3D: {
      scale: [5, 5, 5],
      position: [0, 0.8, 0]
    },
    Text3D_Orange: {
      scale: [5, 5, 5],
      position: [0, 0.8, 0]
    },
    Text3D_Blue: {
      scale: [5, 5, 5],
      position: [0, 0.8, 0]
    },
    Text3D_Purple: {
      scale: [5, 5, 5],
      position: [0, 0.8, 0]
    },
    Goggle: {
      scale: [9, 9, 9],
      position: [0, 0.3, 0.5]
    },
    Goggle_Blue: {
      scale: [9, 9, 9],
      position: [0, 0.3, 0.5]
    },
    Goggle_Orange: {
      scale: [9, 9, 9],
      position: [0, 0.3, 0.5]
    },
    Goggle_Purple: {
      scale: [9, 9, 9],
      position: [0, 0.3, 0.5]
    },
    Goggle_Red: {
      scale: [9, 9, 9],
      position: [0, 0.3, 0.5]
    },
  };

  Object.keys(models).forEach((modelName, idx, keys) => {
    if (
      !window._3dObjs[modelName] &&
      threeStuffs.faceObject.children.find(({ name }) => name !== modelName)
    ) {
      loader.load(
        // resource URL
        `assets/models/${modelName}.glb`,
        // called when the resource is loaded
        function (model) {
          model.scene.scale.set(...models[modelName].scale);
          model.scene.position.set(...models[modelName].position);

          window._3dObjs[modelName] = model.scene;
          window._3dObjs[modelName].visible = false;
          window._3dObjs[modelName].name = modelName;
          threeStuffs.faceObject.add(model.scene);

          if (
            threeStuffs.faceObject.children.length ===
            keys.length + 1 /* one is  light object */
          ) {
            // load complete
            console.log('load complete');
            currentFrame.value = 1;
          }
        },
        function (xhr) {
          console.log((xhr.loaded / xhr.total) * 100 + `% ${modelName} loaded`);
        },
        function (error) {
          console.error(error);
          console.log('An error happened');
        }
      );
    } else {
      threeStuffs.faceObject.add(window._3dObjs[modelName]);
      currentFrame.value = 1;
    }
  });
}

// callback: launched if a face is detected or lost.
function detect_callback(faceIndex, isDetected) {
  if (isDetected) {
    console.log('INFO in detect_callback(): DETECTED');
  } else {
    console.log('INFO in detect_callback(): LOST');
  }
}

// build the 3D. called once when Jeeliz Face Filter is OK
function init_threeScene(spec) {
  const threeStuffs = JeelizThreeHelper.init(spec, detect_callback);

  const light = new THREE.AmbientLight(0xffffff); // soft white light
  threeStuffs.faceObject.add(light);

  modelLoder(threeStuffs);

  //CREATE THE CAMERA
  THREECAMERA = JeelizThreeHelper.create_camera();
} // end init_threeScene()

// launched by body.onload():
function main() {
  JeelizResizer.size_canvas({
    canvasId: 'jeeFaceFilterCanvas',
    callback: function (isError, bestVideoSettings) {
      init_faceFilter(bestVideoSettings);
    }
  });
}

function init_faceFilter(videoSettings) {
  JEELIZFACEFILTER.init({
    videoSettings: {
      videoElement
    },
    canvasId: 'jeeFaceFilterCanvas',
    NNCPath: 'neuralNets/', // root of NN_DEFAULT.json file
    maxFacesDetected: 1,
    callbackReady: function (errCode, spec) {
      if (errCode) {
        console.log('AN ERROR HAPPENS. ERR =', errCode);
        return;
      }

      console.log('INFO: JEELIZFACEFILTER IS READY');
      hide(document.getElementById('loading'));
      hide(document.getElementById('starting_frame'));
      show(document.querySelector('.switch-frame'));
      show(document.getElementById('ui_controlls'));
      $('.ar-control-ui').show();

      init_threeScene(spec);
    },

    // called at each render iteration (drawing loop):
    callbackTrack: function (detectState) {
      if (!NO_BG_REMOVE.value) perform();
      JeelizThreeHelper.render(detectState, THREECAMERA);
    }
  }); //end JEELIZFACEFILTER.init call
}

function startVideoStream() {
  show(document.getElementById('loading'));
  hide(document.getElementsByClassName('filter-intro')[0]);
  navigator.mediaDevices
    .getUserMedia({
      video: true,
      audio: false
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
  videoElement.addEventListener('playing', (e) => loadBodyPix(e, STREAM));
}

function loadBodyPix(e, stream = STREAM) {
  const streamSetting = stream.getVideoTracks()[0].getSettings();
  const aspectRatio = streamSetting.aspectRatio;
  videoElement.width = videoElement.width || streamSetting.width;
  videoElement.height = videoElement.height || streamSetting.height;

  if (!NO_BG_REMOVE.value) {
    // bodyPix.load().then((res) => {
    //   net = res;
    //   main();
    // });
  } else {
    main();
  }
}

function takePhotoOrGif() {
  document.getElementById('switch-frame').classList.add('hide');
  document.getElementById('switch-photo').classList.remove("hide");
  document.querySelector('.sticker_control').classList.remove('hide');
}
function afterTakingPhoto() {
  document.getElementById('switch-stick').classList.add('hide');
  document.getElementById('switch-social').classList.remove("hide");
  document.getElementById('switch-social').style.display = 'flex';
  document.querySelector('.sticker_control').style.display = 'flex';
  document.querySelector('.sticker-controller-panel').style.display = 'flex';
  getResult();
  console.log('after 貼紙');
}

async function perform() {
  if (!net) return;
  if (!net.segmentPerson) return;
  const segmentation = await net.segmentPerson(videoElement);
  const maskBackground = true;
  // Convert the segmentation into a mask to darken the background.
  const foregroundColor = { r: 255, g: 255, b: 255, a: 0 };
  const backgroundColor = { r: 0, g: 255, b: 0, a: 255 };
  const backgroundDarkeningMask = bodyPix.toMask(
    segmentation,
    foregroundColor,
    backgroundColor
  );

  const opacity = 1;
  const edgeBlurAmount = 0;
  const flipHorizontal = true;

  bodyPix.drawMask(
    BG_REMOVE_CANVAS,
    videoElement,
    backgroundDarkeningMask,
    opacity,
    edgeBlurAmount,
    flipHorizontal
  );
  const _IMAGE_DATA = bgRemoveCanvasctx.getImageData(
    0,
    0,
    BG_REMOVE_CANVAS.width,
    BG_REMOVE_CANVAS.height
  );
  colorReplace(_IMAGE_DATA.data);
  bgRemoveCanvasctx.putImageData(_IMAGE_DATA, 0, 0);
  if (!rendered) {
    //
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
  $('.ar-control-ui').hide();
  $('.ar-photo').show();
  $('.ar-gif').show();
  $('.ar-next').hide();
  $('.ar-result').hide();
  hide(SHUTTER);
  hide(document.getElementById('switch_gif_wrapper'));

  if (!payload.token) {
    window.location.href = 'https://www.fun4lab.com';
  }
  setBreadImage(2);
});

function nextStep() {
  getResult();
}

function setBreadImage(id) {
  const ids = ['bread-1', 'bread-2', 'bread-3', 'bread-4'];
  for (let i = 1; i <= ids.length; i++){
    document.getElementById(ids[i-1]).src = (i===id) ? 'assets/active-b'+i+'.png':'assets/b'+i+'.png';
  }
}

function getUrlVars() {
  var vars = [],
    hash;
  var hashes = window.location.href
    .slice(window.location.href.indexOf('?') + 1)
    .split('&');
  for (var i = 0; i < hashes.length; i++) {
    hash = hashes[i].split('=');
    vars.push(hash[0]);
    vars[hash[0]] = hash[1];
  }
  return vars;
}

function redirect() {
  // window.location.href = `/vpb/congrat/${payload.token}/${payload.gameId}/${
  //   payload.recordId
  // }/${Number(permission.value)}`;
  window.location.href = `/vpb/congrat/${payload.token}/${payload.gameId}/${
    payload.recordId
  }/${((document.getElementsByClassName('checkGallery')[0].checked)?1:0)}`;
}
function activeCheckedIcon(id) {
  lastCheckId = id;
  // document.getElementById('checked-social').style.visibility = (id===1)?'visible':'hidden';
  // document.getElementById('checked-gallery').style.visibility = (id === 2) ? 'visible' : 'hidden';
  document.getElementById('checked-fb').style.visibility = (id === 3) ? 'visible' : 'hidden';
  document.getElementById('checked-tw').style.visibility = (id === 4) ? 'visible' : 'hidden';
  document.getElementById('fb-icon').style.opacity = (id === 3) ? 1 : 0.5;
  document.getElementById('tw-icon').style.opacity = (id === 4) ? 1 : 0.5;
  if (id === 1) {
    document.getElementById('diaglog-s').classList.remove('hide');
    document.getElementById('mask').classList.remove('hide');
  }
  if (id === 2) {
    document.getElementById('diaglog-g').classList.remove('hide');
    document.getElementById('mask').classList.remove('hide');
  }
}
function closeDialog() {
  lastCheckId = 0;
  document.getElementById('diaglog-s').classList.add('hide');
  document.getElementById('diaglog-g').classList.add('hide');
  document.getElementById('mask').classList.add('hide');

  // document.getElementById('checked-social').style.visibility = (document.getElementsByClassName('checkSocial')[0].checked) ? 'visible' : 'hidden';
  document.getElementById('checked-gallery').style.visibility = (document.getElementsByClassName('checkGallery')[0].checked) ? 'visible' : 'hidden';
}
function ShareToFbOrTwitter(id) {
  if (!document.getElementsByClassName('checkSocial')[0].checked) return;
  if (lastCheckId === 3 || id === 3) {
    window.open('https://www.facebook.com/sharer/sharer.php?u='+sharedUrl.fb);
    closeDialog();
  }
  if (lastCheckId === 4 || id === 4){
    window.open('https://twitter.com/intent/tweet?text='+sharedUrl.tw);
    closeDialog();
  }
}
function ShareToGallery() {
  if (!document.getElementsByClassName('checkGallery')[0].checked) return;
  //need an api
  closeDialog();
}
function closeSwitchPhoto() {
  document.getElementById('switch-photo').classList.add('hide');
}
function viewTerms() {
  window.open('https://www.fun4lab.com/terms/conditions/11');
}
function checkShareToGallery() {
  document.getElementById('dialog-gallery-ok').style.opacity = (document.getElementsByClassName('checkGallery')[0].checked) ? 1 : 0.5;
  document.getElementById('dialog-social-ok').style.opacity = (document.getElementsByClassName('checkSocial')[0].checked) ? 1 : 0.5;
}
function togglePanel(id) {
  switch (id) {
    case 1:
      if (hideToggle[0]) {
        document.getElementById('switch-frame').classList.add('hid-frame');
        document.getElementsByClassName('hide-panel')[0].src = 'assets/show-panel.svg';
      }
      else {
        document.getElementById('switch-frame').classList.remove('hid-frame');
        document.getElementsByClassName('hide-panel')[0].src = 'assets/hide-panel.svg';
      }
      hideToggle[0] = !hideToggle[0];
      break;
    case 2:
      if (hideToggle[1]) {
        document.getElementById('switch-photo').classList.add('hid-photo');
        document.getElementsByClassName('hide-panel')[1].src = 'assets/show-panel.svg';
      }
      else {
        document.getElementById('switch-photo').classList.remove('hid-photo');
        document.getElementsByClassName('hide-panel')[1].src = 'assets/hide-panel.svg';
      }
      hideToggle[1] = !hideToggle[1];
      break;
    case 3:
      if (hideToggle[2]) {
        document.getElementById('switch-stick').classList.add('hid-stick');
        document.getElementsByClassName('hide-panel')[2].src = 'assets/show-panel.svg';
      }
      else {
        document.getElementById('switch-stick').classList.remove('hid-stick');
        document.getElementsByClassName('hide-panel')[2].src = 'assets/hide-panel.svg';
      }
      hideToggle[2] = !hideToggle[2];
      break;
    case 4:
      if (hideToggle[3]) {
        document.getElementById('switch-social').classList.add('hid-social');
        document.getElementsByClassName('hide-panel')[3].src = 'assets/show-panel.svg';
      }
      else {
        document.getElementById('switch-social').classList.remove('hid-social');
        document.getElementsByClassName('hide-panel')[3].src = 'assets/hide-panel.svg';
      }
      hideToggle[3] = !hideToggle[3];
      break;
  }
}