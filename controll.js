// canvas - bgFilter;
// jeeFaceFilterCanvas - jeeFaceFilterCanvas;
const SHUTTER = document.getElementById('btn_shutter');
const CLOSE = document.getElementById('btn_close');
const SAVE = document.getElementById('btn_save');
const RENDER_PICTURE = document.getElementById('render_picture');
const LOADING_CIRCLE = document.getElementById('loading_circle');

const FRONT_FRAME = document.getElementById('front_frame');

const GIF_TEMP = [];
const gif = null;

const $round = document.querySelector('#percentage .round');
const roundRadius = Number(
  document.querySelector('#percentage .round circle').getAttribute('r')
);

let GIF_timer = null;
let currentResult = {};
let uploaded = {};

const BG_IMAGE = new Image();
BG_IMAGE.src = 'background.png';

const F_IMAGE = new Image();
const F_IMAGE_REAL = new Image();

let IMAGE_URL = '';

const currentFrame = {
  _v: 0,
  get value() {
    return this._v;
  },
  set value(v) {
    if (v !== this._v) {
      if (FRAME_COMBINATION[v - 1]) {
        $('.frame-select').removeClass('active');
        $(`.frame-select[target=${v}]`).addClass('active');
        if ([1, 2, 3].includes(v)) {
          FRONT_FRAME.src = `assets/Ver${v}Q.png`;
          F_IMAGE.src = `assets/Ver${v}Q.png`;
          F_IMAGE_REAL.src = `assets/Ver${v}.png`;
        }
        FRAME_COMBINATION[v - 1].models.forEach((modelName) => {
          window._3dObjs[modelName] &&
            (window._3dObjs[modelName].visible = true);
        });
      }
    }
    this._v = v;
  }
};

const FRAME_COMBINATION = [
  { models: ['Goggle', 'Text3D', 'Coat'] },
  { models: ['Mask'] },
  { models: ['Goggle', 'Nerdy', 'Coat'] }
];

function GO_LOADING() {
  show(LOADING_CIRCLE);
}

function NO_LOADING() {
  hide(LOADING_CIRCLE);
}

function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {
  if (arguments.length === 2) {
    x = y = 0;
    w = ctx.canvas.width;
    h = ctx.canvas.height;
  }

  // default offset is center
  offsetX = typeof offsetX === 'number' ? offsetX : 0.5;
  offsetY = typeof offsetY === 'number' ? offsetY : 0.5;

  // keep bounds [0.0, 1.0]
  if (offsetX < 0) offsetX = 0;
  if (offsetY < 0) offsetY = 0;
  if (offsetX > 1) offsetX = 1;
  if (offsetY > 1) offsetY = 1;

  var iw = img.width,
    ih = img.height,
    r = Math.min(w / iw, h / ih),
    nw = iw * r, // new prop. width
    nh = ih * r, // new prop. height
    cx,
    cy,
    cw,
    ch,
    ar = 1;

  // decide which gap to fill
  if (nw < w) ar = w / nw;
  if (Math.abs(ar - 1) < 1e-14 && nh < h) ar = h / nh; // updated
  nw *= ar;
  nh *= ar;

  // calc source rectangle
  cw = iw / (nw / w);
  ch = ih / (nh / h);

  cx = (iw - cw) * offsetX;
  cy = (ih - ch) * offsetY;

  // make sure source rectangle is valid
  if (cx < 0) cx = 0;
  if (cy < 0) cy = 0;
  if (cw > iw) cw = iw;
  if (ch > ih) ch = ih;

  // fill image in dest. rectangle
  ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
}

function showTools() {
  show(CLOSE);
  show(SAVE);
}

function hideTools() {
  hide(CLOSE);
  hide(SAVE);
}

function showShutterControlls() {
  // show(SHUTTER);
  // show(document.getElementById("switch_gif_wrapper"));
}

function hideShutterControlls() {
  hide(SHUTTER);
  hide(document.getElementById('switch_gif_wrapper'));
}

function setPercent(per) {
  function reduceValue(v) {
    return v > 100 ? reduceValue(v - 100) : v;
  }
  const p = reduceValue(per);
  const roundCircum = 2 * roundRadius * Math.PI;
  const roundDraw = (p * roundCircum) / 100;
  $round.style['stroke-dasharray'] = roundDraw + ' 999';
  console.log(p);
}

const getPictureURL = ({ toGIF, index } = {}) => {
  return new Promise((resolve, reject) => {
    // prepare result canvas to draw

    function drawResult(frameImage) {
      const result = document.createElement('canvas');
      const context = result.getContext('2d');
      result.width = MAIN_WRAP.clientWidth;
      result.height = MAIN_WRAP.clientHeight;

      // drawing layer by layer & calculating

      // background image
      drawImageProp(context, BG_IMAGE);

      // cliped body by body-pix
      drawImageProp(context, BG_REMOVE_CANVAS);

      // flipX
      context.translate(result.width, 0);
      context.scale(-1, 1);

      // face filter
      drawImageProp(context, jeeFaceFilterCanvas);

      // flipX
      context.translate(result.width, 0);
      context.scale(-1, 1);

      // draw front frame\
      context.drawImage(
        frameImage,
        0,
        0,
        frameImage.width,
        frameImage.height, // source rectangle
        0,
        0,
        result.width,
        result.height // destination rectangle
      );

      return result;
    }

    const forShowResult = drawResult(F_IMAGE);
    const forRealResult = drawResult(F_IMAGE_REAL);

    if (toGIF) {
      GIF_TEMP.push(forShowResult);
      if (index === 3) {
        render_GIF();
        resolve();
      }
    } else {
      resolve({
        forShow: forShowResult.toDataURL('image/png'),
        forReal: forRealResult.toDataURL('image/png')
      });
    }
  });
};

async function generatePicture() {
  IMAGE_URL = '';
  currentResult = {};
  GO_LOADING();

  // open render area
  show(RENDER_PICTURE);
  hideShutterControlls(SHUTTER);

  currentResult = await getPictureURL();

  IMAGE_URL = currentResult.forShow;

  RENDER_PICTURE.style.backgroundImage = `url(${IMAGE_URL})`;
  SAVE.href = IMAGE_URL;

  NO_LOADING();
  // showTools();
  showResult();
}

async function generateGIF() {
  IMAGE_URL = '';
  currentResult = {};
  hideShutterControlls(SHUTTER);

  clearInterval(GIF_timer);
  GIF_timer = null;
  let counter = 0;

  function end() {
    GO_LOADING();
    show(RENDER_PICTURE);
    hideShutterControlls(SHUTTER);

    clearInterval(GIF_timer);
    GIF_timer = null;
    counter = 0;
    hide(document.getElementById('percentage'));
  }

  function add(count) {
    const index = count / 1000 + 1;
    getPictureURL({ toGIF: true, index });
  }

  show(document.getElementById('percentage'));

  GIF_timer = setInterval(() => {
    setPercent(counter / 10);
    if (counter === 0 || counter === 1000 || counter === 2000) {
      console.log('GO');
      add(counter);
    }
    if (counter >= 2000) {
      end();
    }
    counter += 10;
  }, 2);
}

function render_GIF() {
  gif = new GIF({
    workers: 2,
    quality: 10
  });
  GIF_TEMP.forEach((el) => {
    gif.addFrame(el);
  });
  gif.on('finished', function (blob) {
    IMAGE_URL = URL.createObjectURL(blob);

    RENDER_PICTURE.style.backgroundImage = `url(${IMAGE_URL})`;
    SAVE.href = IMAGE_URL;
    NO_LOADING();
    // showTools();
    showResult();
  });

  gif.render();
}

function uploadImages() {
  const t = Date.now();

  const imageResults = new Image();
  imageResults.onload = () => {
    S3ClientResults.uploadFile(imageResults)
      .then((data) => {
        uploaded.forReal = data;
      })
      .catch((err) => {
        console.error(err);
      });
  };
  const imageUnkown = new Image();
  imageUnkown.onload = () => {
    S3ClientUnknown.uploadFile(imageUnkown)
      .then((data) => {
        uploaded.forShow = data;
      })
      .catch((err) => {
        console.error(err);
      });
  };

  imageResults.src = currentResult.forReal;
  imageUnkown.src = currentResult.forShow;
}

// SHUTTER.addEventListener("click", () => {
//   if (document.getElementById("switch_gif").checked) {
//     generateGIF();
//   } else {
//     generatePicture();
//   }
// });

CLOSE.addEventListener('click', () => {
  closeResult();
});

SAVE.addEventListener('click', () => {
  SAVE.download = `${Date.now()}`;
});

// document.getElementById("switch_gif").addEventListener("change", () => {
//   SHUTTER.classList.toggle("gif");
// });

function closeResult() {
  RENDER_PICTURE.style.backgroundImage = 'none';
  hideTools();
  showShutterControlls();
  hide(RENDER_PICTURE);
  $('.ar-photo').show();
  $('.ar-gif').show();
  $('.ar-next').hide();
  $('.ar-result').hide();
}

function showResult() {
  $('.ar-photo').hide();
  $('.ar-gif').hide();
  $('.ar-next').show();
  $('.ar-result').show();
}

$('.frame-select').on('click', function (e) {
  Object.keys(_3dObjs).forEach((model) => {
    window._3dObjs[model].visible = false;
  });

  let _target = $(this).attr('target');
  currentFrame.value = _target;
  if (_target === 'removeBGswitch') {
    NO_BG_REMOVE.value = !NO_BG_REMOVE.value;
    e.target.innerText = NO_BG_REMOVE.value ? '開啟去背' : '關閉去背';
  }
});
