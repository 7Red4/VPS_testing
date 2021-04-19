// canvas - bgFilter;
// jeeFaceFilterCanvas - jeeFaceFilterCanvas;
console.log(jeeFaceFilterCanvas);
const SHUTTER = document.getElementById("btn_shutter");
const CLOSE = document.getElementById("btn_close");
const SAVE = document.getElementById("btn_save");
const RENDER_PICTURE = document.getElementById("render_picture");
const LOADING_CIRCLE = document.getElementById("loading_circle");

const GIF_TEMP = [];
const gif = new GIF({
  workers: 2,
  quality: 10,
});

const $round = document.querySelector("#percentage .round");
const roundRadius = Number(document.querySelector("#percentage .round circle").getAttribute("r"));

let GIF_timer = null;

const BG_IMAGE = new Image();
BG_IMAGE.src = "background.png";

let IMAGE_URL = "";

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
  offsetX = typeof offsetX === "number" ? offsetX : 0.5;
  offsetY = typeof offsetY === "number" ? offsetY : 0.5;

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
  show(SHUTTER);
  show(document.getElementById("switch_gif_wrapper"));
}

function hideShutterControlls() {
  hide(SHUTTER);
  hide(document.getElementById("switch_gif_wrapper"));
}

function setPercent(per) {
  function reduceValue(v) {
    return v > 100 ? reduceValue(v - 100) : v;
  }
  const p = reduceValue(per);
  const roundCircum = 2 * roundRadius * Math.PI;
  const roundDraw = (p * roundCircum) / 100;
  $round.style["stroke-dasharray"] = roundDraw + " 999";
  console.log(p);
}

const getPictureURL = ({ toGIF, index } = {}) => {
  return new Promise((resolve, reject) => {
    // prepare result canvas to draw
    const result = document.createElement("canvas");
    result.width = window.innerWidth;
    result.height = window.innerHeight;
    const context = result.getContext("2d");

    // face filter area to reverse x axis
    const filterCanvas = document.createElement("canvas");
    const filterCanvasCtx = filterCanvas.getContext("2d");
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

        // flipX
        context.translate(result.width, 0);
        context.scale(-1, 1);

        // face filter
        drawImageProp(context, jeeFaceFilterCanvas);

        // flipX
        context.translate(result.width, 0);
        context.scale(-1, 1);

        console.log({ toGIF });
        if (toGIF) {
          GIF_TEMP.push(result);
          if (index === 3) {
            render_GIF();
          }
        } else {
          resolve(result.toDataURL("image/png"));
        }
      });
    };

    filterImage.src = jeeFaceFilterCanvas.toDataURL("image/png");
  });
};

async function generatePicture() {
  IMAGE_URL = "";
  GO_LOADING();

  // open render area
  show(RENDER_PICTURE);
  hideShutterControlls(SHUTTER);

  IMAGE_URL = await getPictureURL();

  RENDER_PICTURE.style.backgroundImage = `url(${IMAGE_URL})`;
  SAVE.href = IMAGE_URL;

  NO_LOADING();
  showTools();
}

async function generateGIF() {
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
    hide(document.getElementById("percentage"));
  }

  function add(count) {
    const index = count / 1000 + 1;
    getPictureURL({ toGIF: true, index });
  }

  show(document.getElementById("percentage"));

  GIF_timer = setInterval(() => {
    setPercent(counter / 10);
    if (counter === 0 || counter === 1000 || counter === 2000) {
      console.log("GO");
      add(counter);
    }
    if (counter >= 2000) {
      end();
    }
    counter += 10;
  }, 2);
}

function render_GIF() {
  GIF_TEMP.forEach((el) => {
    gif.addFrame(el);
  });
  gif.on("finished", function (blob) {
    console.log("end");
    IMAGE_URL = URL.createObjectURL(blob);

    RENDER_PICTURE.style.backgroundImage = `url(${IMAGE_URL})`;
    SAVE.href = IMAGE_URL;
    NO_LOADING();
    showTools();
  });

  gif.render();
}

SHUTTER.addEventListener("click", () => {
  if (document.getElementById("switch_gif").checked) {
    generateGIF();
  } else {
    generatePicture();
  }
});
CLOSE.addEventListener("click", () => {
  RENDER_PICTURE.style.backgroundImage = "none";
  hideTools();
  showShutterControlls();
  hide(RENDER_PICTURE);
});
SAVE.addEventListener("click", () => {
  SAVE.download = `${Date.now()}`;
});
document.getElementById("switch_gif").addEventListener("change", () => {
  SHUTTER.classList.toggle("gif");
});
