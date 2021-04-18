// canvas - bgFilter;
// jeeFaceFilterCanvas - jeeFaceFilterCanvas;
console.log(jeeFaceFilterCanvas);
const SHUTTER = document.getElementById("btn_shutter");
const RENDER_PICTURE = document.getElementById("render_picture");
const LOADING_CIRCLE = document.getElementById("loading_circle");

const BG_IMAGE = new Image();
BG_IMAGE.src = "background.png";

let IMAGE_URL = "";

function GO_LOADING() {
  LOADING_CIRCLE.classList.remove("hide");
}

function NO_LOADING() {
  LOADING_CIRCLE.classList.add("hide");
}

function combine() {
  // const filter = jeeFaceFilterCanvas.getContext('2d');
  // const filter_data = filter.getImageData(0, 0, jeeFaceFilterCanvas.width, jeeFaceFilterCanvas.height);
  // for (let i = 0; i < filter_data.length; i += 4) {
  //   if (data[i + 3] === 0) {
  //     data[i + 3] = 0;
  //   }
  // }
}

function generatePicture() {
  IMAGE_URL = "";
  GO_LOADING();
  RENDER_PICTURE.classList.remove("hide");
  const result = document.createElement("canvas");
  result.width = canvas.width;
  result.height = canvas.height;
  const context = result.getContext("2d");
  const filterCanvas = document.createElement("canvas");
  const filterCanvasCtx = filterCanvas.getContext("2d");
  filterCanvas.width = window.innerWidth;
  filterCanvas.height = window.innerHeight;
  filterCanvasCtx.translate(filterCanvas.width, 0);
  filterCanvasCtx.scale(-1, 1);

  const filterImage = new Image();
  filterImage.onload = (e) => {
    console.log(e.target);
    setTimeout(() => {
      filterCanvasCtx.drawImage(filterImage, 0, 0);
      console.log(filterCanvas);
      // drawing
      // context.drawImage(BG_IMAGE, 0, 0);
      // context.drawImage(canvas, 0, 0);
      context.drawImage(filterCanvas, 0, 0);

      // IMAGE_URL = jeeFaceFilterCanvas.toDataURL("image/png");
      IMAGE_URL = filterCanvas.toDataURL("image/png");
      // IMAGE_URL = result.toDataURL("image/png");

      RENDER_PICTURE.style.backgroundImage = `url(${IMAGE_URL})`;
      NO_LOADING();
    });
  };

  filterImage.src = jeeFaceFilterCanvas.toDataURL("image/png");
}

SHUTTER.addEventListener("click", generatePicture);
