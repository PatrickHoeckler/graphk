"use strict";

module.exports = {ColorPicker};

function ColorPicker(initialRGBColor = [0, 0, 0], width = 240, height = 140) {
  //Constants
  const node = document.createElement('div');
  const displayColorBox = document.createElement('div');
  const displayValueBox = document.createElement('span');

  //Public Attributes
  //Private Properties
  var hue, cursorX, cursorY;
  var gradH, gradS, gradL;
  var xOffsetColor;
  var rgb;
  var colorCtx, hueCtx;
  var colorChangeCallback = () => {return};
  var colorInputCallback = () => {return};

  //Public Methods
  this.node = () => node;
  this.onColorChange = function(callback = () => {return;}) {
    if (typeof(callback) !== 'function') {throw new TypeError(
    `Expected a function for the callback argument, got '${typeof(callback)}'`
    );}
    colorChangeCallback = callback;
  }
  this.onColorInput = function(callback = () => {return;}) {
    if (typeof(callback) !== 'function') {throw new TypeError(
    `Expected a function for the callback argument, got '${typeof(callback)}'`
    );}
    colorInputCallback = callback;
  }
  this.getSelectedColor = function(format = 'hex') {
    return format === 'hex' ? ColorPicker.prototype.rgb2hex(rgb) :
      format === 'hsl' ? ColorPicker.prototype.rgb2hsl(rgb) :
      format === 'rgb' ? rgb : null;
  }
  //Private Functions
  function changeColor(rgbColor) {
    let hex = ColorPicker.prototype.rgb2hex(rgbColor);
    displayColorBox.style.backgroundColor = hex;
    displayValueBox.innerHTML = hex;
    //Redrawing color box and cursor circle
    colorCtx.fillStyle = gradS; colorCtx.fillRect(0, 0, width, height);
    colorCtx.fillStyle = gradL; colorCtx.fillRect(0, 0, width, height);
    colorCtx.beginPath();
    colorCtx.strokeStyle = 'rgba(20, 20, 20, 0.3)';
    colorCtx.arc(cursorX, cursorY, 5, 0, Math.PI * 2, true);
    colorCtx.stroke();
    colorCtx.beginPath();
    colorCtx.strokeStyle = 'rgb(240, 240, 240)';
    colorCtx.arc(cursorX, cursorY, 4, 0, Math.PI * 2, true);
    colorCtx.stroke();
    colorInputCallback(rgbColor, hex);
  }
  function changeHue(newHue) {
    hue = Math.floor(newHue);
    //colorSelector Gradient
    gradS = colorCtx.createLinearGradient(0, 0, width, 0);
    gradL = colorCtx.createLinearGradient(0, 0, 0, height);
    gradS.addColorStop(0, 'hsl(0,0%,100%)'); //startColor = rgb(255, 255, 255);
    gradS.addColorStop(1, `hsl(${hue},100%,50%)`); //endColor
    gradL.addColorStop(0, 'hsla(0,0%,0%,0%)');
    gradL.addColorStop(1, `hsla(0,0%,0%,100%)`);
    //xOffsetColor = endColor - startColor;
    let endColor = ColorPicker.prototype.hsl2rgb([hue !== 360 ? hue : 0, 1, 0.5]);
    xOffsetColor = endColor.map(channel => channel - 255);
    
    //Drawing hue gradient
    hueCtx.clearRect(0, 0, width, 20);
    hueCtx.fillStyle = gradH; hueCtx.fillRect(0, 2, width, 16);
    hueCtx.strokeStyle = 'rgba(20, 20, 20, 0.5)';
    hueCtx.strokeRect(width * hue / 360 - 2, 0, 5, 20);
    hueCtx.strokeStyle = 'rgb(240, 240, 240)';
    hueCtx.strokeRect(width * hue / 360 - 1, 1, 3, 18);
  }
  function cursorPos2color(x, y) {
    //Consider this constants:
    //  const xRatio = x / width;
    //  const yRatio = 1 - y / height;
    //Then to calculate the color: 
    // - Considering the x pos (depends on xOffsetColor calculated in the
    //   changeHue function):
    //     {color = gradS.startColor + xRatio * xOffsetColor}
    // - Addint to this the lightness (y pos):
    //     {color = yRatio * color}
    //We could write the return value as the following:
    //  {return xOffsetColor.map(channel =>
    //     Math.floor(yRatio * (255 + xRatio * channel))
    //  );}
    //But to avoid float errors we rearrange the above equation to calculate
    //only one division between two big integers for each color as shown bellow
    const area = height * width;
    const dy = height - y;
    const wFactor = 255 * width;
    return xOffsetColor.map(channel => 
      Math.floor((dy * (wFactor + x * channel)) / area)
    );
  }
  function color2cursorPos(rgbColor) {
    var pos = [0, 0]; //[x, y]
    var colorDif, minColorDif = 1000;
    for (let i = 0; i < 3; i++) {
      let iNext = (i + 1) % 3;
      let xRatio = (255 * (rgbColor[i] - rgbColor[iNext])) / 
        (rgbColor[iNext] * xOffsetColor[i] - rgbColor[i] * xOffsetColor[iNext]);
      if (Number.isNaN(xRatio)) {xRatio = 0;}
      let yRatio = rgbColor[iNext] / (255 + xRatio * xOffsetColor[iNext]);
      if (Number.isNaN(yRatio)) {yRatio = 0;}

      let x = Math.round(xRatio * width);
      let y = Math.round((1 - yRatio) * height);
      let color = cursorPos2color(x, y);
      colorDif = color.reduce(
        (acc, channel, index) => acc + Math.abs(rgbColor[index] - channel)
      , 0);
      if (colorDif === 0) {return [x, y];}
      else if (colorDif < minColorDif) {
        pos[0] = x; pos[1] = y;
        minColorDif = colorDif;
      }
    }

    //If haven't found the right position because of floating errors,
    //then walks around the pos array until the colorDif === 0
    const closestPos = pos.slice(); //if fails search, will return this
    let steps = 1; //number of steps in a direction before change
    let dir = 0 //0:up, 1:left, 2:down, 3:right
    let iterations = 0;
    while (iterations++ < Math.max(width, height) / 2) {
      //walk the same number of steps twice before adding more
      for (let i = 0; i < 2; i++) {
        const dirChange = dir < 2 ? -1 : 1;
        for (let n = 0; n < steps; n++) {          
          if (dir % 2) { //left and right movement
            pos[0] += dirChange;
            if (pos[0] < 0 || width  < pos[0]) {continue;}
          }
          else { //up and down movement
            pos[1] += dirChange;
            if (pos[1] < 0 || height < pos[1]) {continue;}
          }

          let color = cursorPos2color(pos[0], pos[1]);
          colorDif = color.reduce(
            (acc, channel, index) => acc + Math.abs(rgbColor[index] - channel)
          , 0);
          if (colorDif === 0) {return pos;}
        }
        dir = (dir + 1) % 4;
      }
      steps++;
    }
    return closestPos; //if there was no pos corresponding exactly to the color
  }
  function mouseMoveColor({offsetX = cursorX, offsetY = cursorY} = {}) {
    if (offsetX < 0) {offsetX = 0;}
    if (offsetY < 0) {offsetY = 0;}
    cursorX = offsetX; cursorY = offsetY;
    rgb = cursorPos2color(cursorX, cursorY);
    changeColor(rgb);
  }
  function mouseMoveHue({offsetX}) {
    if (offsetX < 0) {offsetX = 0;}
    changeHue(360 * offsetX / width);
    mouseMoveColor(); //drawing colorSelector
  }

  //Initialize Object
  ;(function() {
    //Manipulating DOM
    //  Creating elements and classes
    let colorSelector = document.createElement('canvas');
    let hueSelector = document.createElement('canvas');
    let selectorContainer = document.createElement('div');
    let displayContainer = document.createElement('div');
    node.classList.add('color-picker');
    displayColorBox.classList.add('display-color');
    displayValueBox.classList.add('display-value');
    selectorContainer.classList.add('selector-container');
    displayContainer.classList.add('display-container');
    //  Adjusting Sizes
    displayColorBox.style.height = `${height}px`;
    colorSelector.height = height;
    colorSelector.width = width;
    hueSelector.height = 20;
    hueSelector.width = width;
    //  Linking nodes
    node.appendChild(selectorContainer);
    node.appendChild(displayContainer);
    selectorContainer.appendChild(colorSelector);
    selectorContainer.appendChild(hueSelector);
    displayContainer.appendChild(displayColorBox);
    displayContainer.appendChild(displayValueBox);
    //  Creating canvas context
    colorCtx = colorSelector.getContext('2d');
    hueCtx = hueSelector.getContext('2d');
    gradH = hueCtx.createLinearGradient(0, 0, width, 0);
    for (let h = 0; h <= 360; h++) {
      gradH.addColorStop(h / 360, `hsl(${h},100%,50%)`);
    }

    //Calculating initial state
    rgb = initialRGBColor;
    hue = ColorPicker.prototype.rgb2hsl(rgb)[0];
    changeHue(hue);
    let pos = color2cursorPos(rgb);
    cursorX = pos[0]; cursorY = pos[1];
    mouseMoveColor();
    
    //Creating Event Listeners
    colorSelector.addEventListener('mousedown', function(event) {
      mouseMoveColor(event);
      function stopMove() {
        colorSelector.removeEventListener('mousemove', mouseMoveColor);
        window.removeEventListener('mouseup', stopMove);
      }
      colorSelector.addEventListener('mousemove', mouseMoveColor);
      window.addEventListener('mouseup', stopMove);
    });
    hueSelector.addEventListener('mousedown', function(event) {
      mouseMoveHue(event);
      function stopMove() {
        hueSelector.removeEventListener('mousemove', mouseMoveHue);
        window.removeEventListener('mouseup', stopMove);
      }
      hueSelector.addEventListener('mousemove', mouseMoveHue);
      window.addEventListener('mouseup', stopMove);
    });
    displayColorBox.onclick = () => colorChangeCallback(rgb);
  })();
}

ColorPicker.prototype.hsl2rgb = function(hsl) {
  const [H, S, L] = hsl;
  const C = (1 - Math.abs(2 * L - 1)) * S;
  const X = C * (1 - Math.abs((H / 60) % 2 - 1));
  const m = L - C / 2;
  var rgb = 
      0 <= H && H <  60 ? [C, X, 0] :
     60 <= H && H < 120 ? [X, C, 0] :
    120 <= H && H < 180 ? [0, C, X] :
    180 <= H && H < 240 ? [0, X, C] :
    240 <= H && H < 300 ? [X, 0, C] :
    300 <= H && H < 360 ? [C, 0, X] :
    [0, 0, 0];
  rgb = rgb.map(channel => Math.floor((channel + m) * 255));
  return rgb;
}
ColorPicker.prototype.hsl2hex = function(hsl) {
  return ColorPicker.prototype.rgb2hex(
    ColorPicker.prototype.hsl2rgb(hsl)
  );
}
ColorPicker.prototype.rgb2hsl = function(rgb) {
  var [R, G, B] = rgb;
  R /= 255; G /= 255; B /= 255;
  const Cmin = Math.min(R, G, B);
  const Cmax = Math.max(R, G, B);
  const delta = Cmax - Cmin;
  let H = Math.round(delta === 0 ? 0 :
    Cmax === R ? 60 * (((G - B) / delta) % 6) :
    Cmax === G ? 60 * (((B - R) / delta) + 2) :
                 60 * (((R - G) / delta) + 4));
  if (H < 0) {H += 360;}
  const L = (Cmax + Cmin) / 2;
  const S = delta === 0 ? 0 : delta / (1 - Math.abs(2 * L - 1));
  return [H, S, L];
}
ColorPicker.prototype.rgb2hex = function(rgb) {
  var hex = '';
  rgb.forEach(channel => hex += channel.toString(16).padStart(2, '0'));
  return '#' + hex;
}
ColorPicker.prototype.hex2rgb = function(hex) {
  if (hex[0] === '#') {hex = hex.substring(1);}
  let value = Number.parseInt(hex, 16);
  if (Number.isNaN(value)) {return [0, 0, 0];}
  return [
      (value >> 16) & 0xff,
      (value >>  8) & 0xff,
      (value >>  0) & 0xff
  ];
}
ColorPicker.prototype.hex2hsl = function(hex) {
  return ColorPicker.prototype.rgb2hsl(
    ColorPicker.prototype.hex2rgb(hex)
  );
}
ColorPicker.prototype.string2color = function(string) {
  string = string.split(/[()]/)[1]; //'rgb-hsl(x, y, z)' => 'x, y, z'
  return string.split(',') //'x, y, z' => ['x', 'y', 'z']
    .map(sValue => Number.parseInt(sValue)); //['x', 'y', 'z'] => [x, y, z]
}
ColorPicker.prototype.color2string = function(color, format = 'rgb') {
  if (format === 'rgb') {
    if (color.length === 3) {return `rgb(${color.toString()})`;}
    else if (color.length === 4) {return `rgba(${color.toString()})`;}
  }
  else if (format === 'hsl') {
    if (color.length === 3) {
      return `hsl(${color[0]},` + 
        `${Math.round(color[1] * 1000) / 10}%,` + 
        `${Math.round(color[2] * 1000) / 10}%),`;
    }
    else if (color.length === 4) {
      return `hsl(${color[0]},` + 
        `${Math.round(color[1] * 1000) / 10}%,` + 
        `${Math.round(color[2] * 1000) / 10}%,` +
        `${color[3]})`;
    }
  }
  return '';
}
//This function checks if the given string represents a valid HTML color and
//returns this color as a rgb string if so, otherwise returns empty string.
ColorPicker.prototype.validateString = function(string) {
  let div = document.createElement('div');
  div.style.color = string;
  div.style.width = div.style.height = '0px';
  document.body.appendChild(div);
  const color = window.getComputedStyle(div).color;
  div.remove();
  return color;
}
