// canvas - bgFilter;
// jeeFaceFilterCanvas - jeeFaceFilterCanvas;
console.log(jeeFaceFilterCanvas);
const SHUTTER = document.getElementById('btn_shutter');
const CLOSE = document.getElementById('btn_close');
const RENDER_PICTURE = document.getElementById('render_picture');
const LOADING_CIRCLE = document.getElementById('loading_circle');

const WINDOW_ASPECT_RATIO = window.innerWidth / window.innerHeight;

let BG_IMAGE_ASPECT_RATIO = 0;

const BG_IMAGE = new Image();
BG_IMAGE.onload = () => {
  BG_IMAGE_ASPECT_RATIO = BG_IMAGE.width / BG_IMAGE.height;
};
BG_IMAGE.src = 'background.png';

let IMAGE_URL = '';

function GO_LOADING() {
  LOADING_CIRCLE.classList.remove('hide');
}

function NO_LOADING() {
  LOADING_CIRCLE.classList.add('hide');
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

function generatePicture() {
  IMAGE_URL = '';
  GO_LOADING();

  // open render area
  RENDER_PICTURE.classList.remove('hide');

  // prepare result canvas to draw
  const result = document.createElement('canvas');
  result.width = window.innerWidth;
  result.height = window.innerHeight;
  const context = result.getContext('2d');

  // face filter area to reverse x axis
  const filterCanvas = document.createElement('canvas');
  const filterCanvasCtx = filterCanvas.getContext('2d');
  filterCanvas.width = window.innerWidth;
  filterCanvas.height = window.innerHeight;
  filterCanvasCtx.translate(filterCanvas.width, 0);
  filterCanvasCtx.scale(-1, 1);

  // set face filter image
  const filterImage = new Image();
  filterImage.onload = (e) => {
    setTimeout(() => {
      // draw reverse image on face filter canvas
      filterCanvasCtx.drawImage(filterImage, 0, 0);

      // drawing layer by layer & calculating

      // background image
      drawImageProp(context, BG_IMAGE);
      // cliped body by body-pix
      drawImageProp(context, canvas);
      context.translate(result.width, 0);
      context.scale(-1, 1);
      // face filter
      drawImageProp(context, jeeFaceFilterCanvas);
      context.translate(result.width, 0);
      context.scale(-1, 1);

      IMAGE_URL = result.toDataURL('image/png');

      RENDER_PICTURE.style.backgroundImage = `url(${IMAGE_URL})`;

      NO_LOADING();
      CLOSE.classList.remove('hide');
    });
  };

  filterImage.src = jeeFaceFilterCanvas.toDataURL('image/png');
}

SHUTTER.addEventListener('click', generatePicture);
CLOSE.addEventListener('click', () => {
  RENDER_PICTURE.style.backgroundImage = 'none';
  RENDER_PICTURE.classList.add('hide');
  CLOSE.classList.add('hide');
});
