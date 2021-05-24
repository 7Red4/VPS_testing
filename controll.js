// canvas - bgFilter;
// jeeFaceFilterCanvas - jeeFaceFilterCanvas;
window.isMobile = {
  get() {}
};

const SHUTTER = document.getElementById('btn_shutter');
const CLOSE = document.getElementById('btn_close');
const SAVE = document.getElementById('btn_save');
const RENDER_PICTURE = document.getElementById('render_picture');
const LOADING_CIRCLE = document.getElementById('loading_circle');

const FRONT_FRAME = document.getElementById('front_frame');

const GIF_TEMP = [];
const GIF_TEMP_REAL = [];
let gif = null;
let currentMovingSticker = null;

const $round = document.querySelector('#percentage .round');
const roundRadius = Number(
  document.querySelector('#percentage .round circle').getAttribute('r')
);
const COUNTER_DIGIT = document.getElementById('counter_digit');

let IS_PINCHING = false;

let GIF_timer = null;
let currentResult = {};
let uploaded = {};
let currentMovinOriginX = 0;
let currentMovinOriginY = 0;
let currentRotateDeg = 0;

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
    v = Number(v);
    if (v != this._v) {
      Object.keys(_3dObjs).forEach((model) => {
        window._3dObjs[model].visible = false;
      });

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
    this._v = Number(v);
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
      GIF_TEMP_REAL.push(forRealResult);
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
  let index = 0;

  function end() {
    GO_LOADING();
    show(RENDER_PICTURE);
    hideShutterControlls(SHUTTER);

    clearInterval(GIF_timer);
    GIF_timer = null;
    counter = 0;
    hide(document.getElementById('percentage'));
  }

  function add() {
    getPictureURL({ toGIF: true, index });
  }

  show(document.getElementById('percentage'));

  const tickerTime = 10;
  GIF_timer = setInterval(() => {
    setPercent(counter / 10);
    if (!Boolean(counter % 1000) && counter) {
      const sec = counter / 1000;
      console.log(sec);

      if (sec > 3) {
        let dispaySec = 2;
        sec === 4 && (dispaySec = 2);
        sec === 5 && (dispaySec = 1);
        sec === 6 && (dispaySec = 2);
        sec === 7 && (dispaySec = 1);
        sec === 8 && (dispaySec = '');
        COUNTER_DIGIT.innerText = dispaySec;
      } else {
        COUNTER_DIGIT.innerText = 4 - sec;
      }
    }
    if (counter === 4000 || counter === 6000 || counter === 8000) {
      console.log('GO');
      index++;
      add(counter);
    }
    if (counter >= 8000) {
      end();
    }
    counter += tickerTime;
  }, tickerTime);
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
  $('.switch-frame').removeClass('hide');
  cleanUpStickerArea();
  hide(STICKER_AREA);
  $('.sticker_control').hide();
}

function showResult() {
  $('.ar-photo').hide();
  $('.ar-gif').hide();
  $('.ar-next').show();
  $('.ar-result').show();
  $('.switch-frame').addClass('hide');
  show(STICKER_AREA);
  $('.sticker_control').show();
}

$('.frame-select').on('click', function (e) {
  let _target = $(this).attr('target');
  currentFrame.value = _target;
  if (_target === 'removeBGswitch') {
    NO_BG_REMOVE.value = !NO_BG_REMOVE.value;
    e.target.innerText = NO_BG_REMOVE.value ? '開啟去背' : '關閉去背';
  }
});

function cleanUpStickerArea() {
  $('.sticker_on').remove();
}

$('.sticker').on('click', (e) => {
  const origin_el = e.target;
  const newSticker = document.createElement('img');
  newSticker.src = origin_el.src;
  newSticker.width = origin_el.clientWidth;
  newSticker.height = origin_el.clientHeight;
  newSticker.originWidth = origin_el.clientWidth;
  newSticker.originHeight = origin_el.clientHeight;
  newSticker.aspecratio = origin_el.clientWidth / origin_el.clientHeight;
  $('.sticker_on').removeClass('front_sticker');
  newSticker.classList.add('sticker_on');
  newSticker.classList.add('front_sticker');
  const style = {
    position: 'absolute',
    top: `${STICKER_AREA.height / 2 - origin_el.clientHeight / 2}px`,
    left: `${STICKER_AREA.width / 2 - origin_el.clientWidth / 2}px`
  };
  Object.keys(style).forEach((prop) => {
    newSticker.style[prop] = style[prop];
  });
  newSticker.style.transform = `rotate(0deg)`;
  $('#StickerRotateValue')[0].value = 0;
  $('.sticker-controller-panel').show();
  $('.delete_sticker_btn').show();

  STICKER_AREA.appendChild(newSticker);
  newSticker.addEventListener('dragstart', (e) => {
    e.preventDefault();
  });
  newSticker.addEventListener('mousedown', () => {
    $('.sticker_on').removeClass('front_sticker');
    newSticker.classList.add('front_sticker');
    $('#StickerRotateValue')[0].value = getRotateDeg(newSticker);
    $('.sticker-controller-panel').show();
    $('.delete_sticker_btn').show();
    currentMovingSticker = newSticker;
  });
  newSticker.addEventListener('wheel', handleStickerWheel);
});

$('#StickerRotateValue').on('input', (e) => {
  currentRotateDeg = e.target.value;
  const el = currentMovingSticker || $('.front_sticker')[0];
  if (!el) return;
  el.style.transform = `rotate(${currentRotateDeg}deg)`;
});

function getRotateDeg(el) {
  const st = window.getComputedStyle(el, null);
  const tr =
    st.getPropertyValue('-webkit-transform') ||
    st.getPropertyValue('-moz-transform') ||
    st.getPropertyValue('-ms-transform') ||
    st.getPropertyValue('-o-transform') ||
    st.getPropertyValue('transform') ||
    'FAIL';

  if (tr === 'FAIL') return 0;

  const values = tr.split('(')[1].split(')')[0].split(',');
  const a = values[0];
  const b = values[1];
  const c = values[2];
  const d = values[3];

  const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));

  return angle;
}

$('.delete_sticker_btn').on('click', (e) => {
  $('.front_sticker').remove();
  $('.sticker-controller-panel').hide();
  $('.delete_sticker_btn').hide();
  currentMovingSticker = null;
  currentMovinOriginX = 0;
  currentMovinOriginY = 0;
  currentRotateDeg = 0;
});

function resgisterHammer(el) {
  const hammertime = new Hammer(el);
  hammertime.get('pinch').set({ enable: true });
  hammertime.on('panstart', (e) => {
    const el = currentMovingSticker || $('.front_sticker')[0];
    if (!el) return;
    currentMovinOriginX = Number(el.style.left.replace('px', ''));
    currentMovinOriginY = Number(el.style.top.replace('px', ''));
  });
  hammertime.on('pinchstart', () => {
    IS_PINCHING = true;
  });
  hammertime.on('pinchend', () => {
    setTimeout(() => {
      IS_PINCHING = false;
    }, 120);
  });
  hammertime.on('pan pinch rotate', (e) => {
    if (e.pointerType === 'mouse') return;
    if (e.type === 'pan') {
      if (IS_PINCHING) return;
      panSticker(currentMovingSticker || $('.front_sticker')[0], e);
    } else if (e.type === 'pinch') {
      doZoom(currentMovingSticker || $('.front_sticker')[0], e.scale > 1, true);
    }
  });
}

resgisterHammer(STICKER_AREA);

function handleStickerWheel(e) {
  const { deltaY, target } = e;
  if (deltaY === 0) return;
  const isZoom = Math.sign(deltaY) < 0;

  doZoom(target, isZoom);
}

function panSticker(el, e) {
  if (!el) return;
  const { deltaX, deltaY } = e;
  const moveX = currentMovinOriginX + deltaX;
  const moveY = currentMovinOriginY + deltaY;
  const limitedBoundary = 12;
  const half_w = el.clientWidth / 2;
  const half_h = el.clientHeight / 2;

  if (moveX + half_w < limitedBoundary || moveY + half_h < limitedBoundary)
    return;
  if (
    moveX - half_w >
      STICKER_AREA.clientWidth - el.clientWidth - limitedBoundary ||
    moveY - half_h >
      STICKER_AREA.clientHeight - el.clientHeight - limitedBoundary
  ) {
    return;
  }
  const style = {
    left: `${moveX}px`,
    top: `${moveY}px`
  };
  Object.keys(style).forEach((prop) => {
    el.style[prop] = style[prop];
  });
}

function doZoom(el, isZoom, isPinch) {
  if (!el) return;
  const originWidth = el.originWidth;
  const originHeight = el.originHeight;
  const currentW = el.width;
  const currentH = el.height;
  const zoomRatio = isPinch ? 1.05 : 1.12;
  let scaledW = 0,
    scaledH = 0;
  if (isZoom) {
    scaledW = el.width * zoomRatio;
    scaledH = el.height * zoomRatio;
  } else {
    scaledW = el.width / zoomRatio;
    scaledH = el.height / zoomRatio;
  }

  const maxScale = 4.5;
  const minScale = 0.7;

  if (!originWidth || !originHeight) return;
  if (isZoom) {
    if (scaledW > originWidth * maxScale || scaledH > originHeight * maxScale)
      scaledW = originWidth * maxScale;
  } else {
    if (scaledW < originWidth * minScale || scaledH < originHeight * minScale)
      scaledW = originWidth * minScale;
  }

  const modifiedScale = (scaledW / originWidth).toFixed(1) * 10;
  $('#StickerScaleValue')[0].value = modifiedScale;

  el.width = scaledW;
  el.height = scaledW / el.aspecratio;

  const style = {
    left: `${
      Number(el.style.left.replace('px', '')) + (currentW - el.width) / 2
    }px`,
    top: `${
      Number(el.style.top.replace('px', '')) + (currentH - el.height) / 2
    }px`
  };
  Object.keys(style).forEach((prop) => {
    el.style[prop] = style[prop];
  });
}

$('#StickerScaleValue').on('input', (e) => {
  const scale = Number(e.target.value) * 0.1;
  const el = currentMovingSticker || $('.front_sticker')[0];
  const originWidth = el.originWidth;
  const originHeight = el.originHeight;
  const currentW = el.width;
  const currentH = el.height;

  el.width = originWidth * scale;
  el.height = el.width / el.aspecratio;

  const style = {
    left: `${
      Number(el.style.left.replace('px', '')) + (currentW - el.width) / 2
    }px`,
    top: `${
      Number(el.style.top.replace('px', '')) + (currentH - el.height) / 2
    }px`
  };
  Object.keys(style).forEach((prop) => {
    el.style[prop] = style[prop];
  });
});

STICKER_AREA.addEventListener('mousemove', moveSticker);
STICKER_AREA.addEventListener('mouseup', () => {
  currentMovingSticker = null;
});

function moveSticker(e) {
  e.stopPropagation();
  if (currentMovingSticker === null) return;
  const { x, y } = STICKER_AREA.getBoundingClientRect();
  const { clientX, clientY } = e;
  const moveX = clientX - x;
  const moveY = clientY - y;
  const style = {
    left: `${moveX - currentMovingSticker.clientWidth / 2}px`,
    top: `${moveY - currentMovingSticker.clientHeight / 2}px`
  };
  Object.keys(style).forEach((prop) => {
    currentMovingSticker.style[prop] = style[prop];
  });
}

function degrees_to_radians(degrees) {
  const pi = Math.PI;
  return degrees * (pi / 180);
}

function radians_to_degrees(radians) {
  const pi = Math.PI;
  return Math.round(radians / (pi / 180));
}

function drawSticker(test_angle) {
  return new Promise((resolve) => {
    const src = RENDER_PICTURE.style.backgroundImage
      .replace('url(', '')
      .replace(')', '')
      .replace(/\"/gi, '');

    let url = '';

    const stickers = $('.sticker_on');

    if (stickers.length) {
      const img = new Image();
      img.onload = () => {
        const result = document.createElement('canvas');
        const context = result.getContext('2d');
        result.width = MAIN_WRAP.clientWidth;
        result.height = MAIN_WRAP.clientHeight;

        // drawing layer by layer
        drawImageProp(context, img);

        stickers.each((i, el) => {
          const angle_deg = test_angle || getRotateDeg(el);
          const angle = degrees_to_radians(angle_deg);

          const x = Number(el.style.left.replace('px', '')) + el.width / 2;
          const y = Number(el.style.top.replace('px', '')) + el.height / 2;
          context.translate(x, y);
          context.rotate(angle);

          context.drawImage(
            el,
            -el.width / 2,
            -el.height / 2,
            el.width,
            el.height
          );

          context.translate(-x, -y);
          context.rotate(-angle);
        });

        url = result.toDataURL('image/png');
        console.log(url);

        resolve(url);
      };

      img.src = src;
    }
  });
}

// async function stickerTestCall() {
//   const temp = document.createElement('div');
//   const style = {
//     position: 'fixed',
//     top: 0,
//     left: 0,
//     width: '100%',
//     height: '100%',
//     backgroundColor: '#fafafafa',
//     dispay: 'flex',
//     alignItems: 'center',
//     justifyContent: 'center',
//     zIndex: 99
//   };
//   Object.keys(style).forEach((prop) => {
//     temp.style[prop] = style[prop];
//   });
//   const close = document.createElement('button');
//   close.innerText = 'CLOSE';
//   const closeStyle = {
//     position: 'absolute',
//     top: '20px',
//     right: '20px'
//   };
//   Object.keys(closeStyle).forEach((prop) => {
//     close.style[prop] = closeStyle[prop];
//   });
//   close.onclick = () => {
//     $(temp).remove();
//   };

//   temp.appendChild(close);

//   $('body').append(temp);

//   temp.appendChild($(`<img src="${await drawSticker(0)}" />`)[0]);
//   temp.appendChild($(`<img src="${await drawSticker(30)}" />`)[0]);
//   temp.appendChild($(`<img src="${await drawSticker(60)}" />`)[0]);
//   temp.appendChild($(`<img src="${await drawSticker(90)}" />`)[0]);
// }
