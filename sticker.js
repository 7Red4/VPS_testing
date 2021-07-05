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
  $('#StickerScaleValue')[0].value = 10;
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
    $('#StickerScaleValue')[0].value =
      (newSticker.width / newSticker.originWidth).toFixed(1) * 10;
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

function drawSticker(src) {
  return new Promise((resolve) => {
    const stickers = $('.sticker_on');

    const img = new Image();
    img.onload = () => {
      const result = document.createElement('canvas');
      const context = result.getContext('2d');
      result.width = MAIN_WRAP.clientWidth;
      result.height = MAIN_WRAP.clientHeight;

      // drawing layer by layer
      drawImageProp(context, img);
      if (stickers.length) {
        stickers.each((i, el) => {
          const angle_deg = getRotateDeg(el);
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
      }

      resolve(result);
    };

    img.src = src;
  });
}

async function getResult() {
  show(document.getElementById('modal'));

  const finishMask = document.createElement('div');
  finishMask.id = 'FINISH_MASK';
  const finishMaskStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 999
  };
  Object.keys(finishMaskStyle).forEach((prop) => {
    finishMask.style[prop] = finishMaskStyle[prop];
  });
  document.getElementById('MAIN_WRAP').append(finishMask);

  const isGIF = GIF_TEMP.length;

  if (isGIF) {
    for (let i = 0; i < GIF_TEMP.length; i++) {
      const src = GIF_TEMP[i].toDataURL('image/png');
      GIF_TEMP[i] = await drawSticker(src);
    }
    for (let i = 0; i < GIF_TEMP_REAL.length; i++) {
      const src = GIF_TEMP[i].toDataURL('image/png');
      GIF_TEMP_REAL[i] = await drawSticker(src);
    }
    render_GIF();
  } else {
    for (const key in currentResult) {
      const src = currentResult[key];
      currentResult[key] = (await drawSticker(src)).toDataURL('image/png');
    }
  }

  sendResult();
}

async function sendResult() {
  const isGIF = GIF_TEMP.length;
  const responses = [];
  const isNoUrls = !URL_FOR_SHOW || !URL_FOR_REAL;
  if (isNoUrls) return;

  for (const key in currentResult) {
    const src = currentResult[key];
    const FD = new FormData();
    FD.append('token', payload.token);
    const img = await (await fetch(src)).blob();

    FD.append('image', img);

    const res = await fetch(key === 'forShow' ? URL_FOR_SHOW : URL_FOR_REAL, {
      method: 'POST',
      body: FD
    });

    responses.push(res);
    if (key === 'forShow') {
      let result = await res.json();
      $('#ar-fb a').attr(
        'href',
        'https://www.facebook.com/sharer/sharer.php?u=' + result.url
      );
      $('#ar-tweet a').attr(
        'href',
        'https://twitter.com/intent/tweet?text=' + result.url
      );
    }
  }
  handleImageResponse(responses);
}

function handleImageResponse(responses) {
  // console.log(responses);
  hide(document.querySelector('#modal'));
  hide(document.querySelector('#modal-loading'));
  hide(document.querySelector('.sticker-controller-panel'));
  hide(document.querySelector('.sticker_control'));
  hide(document.querySelector('.switch-frame'));
  hide(document.querySelector('.ar-result'));
  hide(document.querySelector('.ar-next'));
  show(document.querySelector('.ar-fb'));
  show(document.querySelector('.ar-tweet'));
  show(document.querySelector('.ar-redirect'));

  // redirect();
  // show(document.querySelector('.modal-container'));
}
