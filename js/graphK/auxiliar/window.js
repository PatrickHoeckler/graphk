"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//  - Adicionar uma funcionalidade para os botões maximize e minimize
//  ou remover eles das opções se não forem usados

module.exports = {Window};

const {appendNewElement, checkType} = require('./auxiliar.js');
function Window(options = {}) {
  //Public Attributes

  //Public Methods
  this.appendContent = (elem) => wContent.appendChild(elem);
  this.clearContents = () => wContent.innerHTML = '';
  this.show = () => wNode.style.display = '';
  this.hide = () => wNode.style.display = 'none';
  this.appendTo = function (elem) {
    wNode.style.visibility = 'hidden';
    elem.appendChild(wNode);
    this.setPos(wLeft, wTop);
    wNode.style.visibility = '';
  }
  //'func' indicates that window was closed by a call from this function
  this.close = () => close('func');
  this.resize = function (width = 0, height = 0) {
    let error = checkType('number', {width: width, height: height});
    if (error) {throw new TypeError(
      `Expected type 'number' from option ${error.key}, got ${error.type}`
    );}
    wWidth  = width  > 0 ? width  : 0;
    wHeight = height > 0 ? height : 0;
    wContainer.style.width  = wWidth  ? `${wWidth}px`  : '';
    wContainer.style.height = wHeight ? `${wHeight}px` : '';
  }
  this.getSize = getSize;
  this.getPos = getPos;
  this.setPos = function (x, y) {
    x = typeof(x) === 'number' ? x : null;
    y = typeof(y) === 'number' ? y : null;
    positionWindow(x, y);
  }
  this.setContent = function(elem) {
    wContent.innerHTML = '';
    wContent.appendChild(elem);
  }
  this.recreate = function(options = {}) {
    let {
      width = 0, height = 0, x, y, //size and position options
      frame = false, title, frameButtons = ['close'], //frame options
      parent, content //parent and content elements
    } = options;

    let error = checkType('number', {width: width, height: height});
    if (error) {throw new TypeError(
      `Expected type 'number' from option ${error.key}, got ${error.type}`
    );}
    destroy();
    //Create window elements
    wNode = appendNewElement(null, 'div', 'window');
    appendNewElement(wNode, 'div', 'window-overlay');
    wContainer = appendNewElement(wNode, 'div', 'window-container');
    let header = appendNewElement(wContainer, 'div', 'window-header');
    wContent = appendNewElement(wContainer, 'div', 'window-contents');
    //Creating window frame if specified in options
    if (frame) {
      let frameElem = appendNewElement(header, 'div', 'window-frame');
      let titleElem = appendNewElement(frameElem, 'span', 'window-title');
      titleElem.addEventListener('mousedown', handleMove);
      if (typeof(title) === 'string') {titleElem.innerHTML = title;}
      if (frameButtons.length) {
        let wrapper = appendNewElement(frameElem, 'span', 'window-buttons');
        for (let type of frameButtons) {
          if (type === 'minimize' || type === 'maximize' || type === 'close') {
            let button = appendNewElement(wrapper, 'span', type);
            if (type === 'close') {
              button.addEventListener('click', () => close('click'));
            }
          }
        }
      }
    }
    //Resizing window and adjusting position
    wTop = y; wLeft = x;
    this.resize(width, height);
    if (parent) {this.appendTo(parent);}
    if (content) {wContent.appendChild(content);}
  }

  //Set Callback Functions
  this.onclose = function(callback) {
    if (typeof(callback) !== 'function' && callback !== null) { throw new TypeError(
      `Expected 'callback' to be a function or null. Got type ${typeof(callback)}`
    );}
    closeCallback = callback;
  }
  //Private Functions
  //  Position window container so its top left corner is on the given
  //  x and y coordinates. Will adjust the x and y so as to not overflow
  //  the window from the parent element
  function positionWindow(x, y) {
    let [width, height] = getSize();
    let parent = wNode.parentElement;
    //don't change anything until appended to a elem
    if (!parent) {return;}
    let parHeight = parent.clientHeight;
    let parWidth = parent.clientWidth;
    if (y !== null) {
      if (y < 0) {y = 0;}
      else if (parHeight < y + height) {y = parHeight - height;}
    }
    else {y = (parHeight - height) / 2;}
    if (x !== null) {
      if (x < 0) {x = 0;}
      else if (parWidth  < x + width) {x = parWidth - width;}
    }
    else {x = (parWidth - width) / 2;}
    wContainer.style.top  = `${wTop  = y}px`;
    wContainer.style.left = `${wLeft = x}px`;
  }
  function destroy() {
    if (!wNode) {return;}
    wNode.remove();
    wNode.innerHTML = '';
    closeCallback = null;
    wNode = wContainer = wContent = null;
    wTop = wLeft = wWidth = wHeight = null;
  }
  function close(state) {
    //if closeCallback returns any true value, prevent window close
    if (closeCallback && closeCallback(state)) {return;}
    wNode.remove();
  }
  function handleMove({pageX, pageY}) {
    wContainer.style.pointerEvents = 'none';
    let x0 = wLeft - pageX;
    let y0 = wTop  - pageY;
    function move(event) {
      positionWindow(x0 + event.pageX, y0 + event.pageY);
    }
    wNode.addEventListener('mousemove', move)
    wNode.addEventListener('mouseup', function remove() {
      wNode.removeEventListener('mousemove', move);
      wNode.removeEventListener('mouseup', remove);
      wContainer.style.pointerEvents = '';
    });
  }
  function getSize() {
    let width = wWidth;
    let height = wHeight;
    if (!width || !height) {
      let {bWidth, bHeight} = wContainer.getBoundingClientRect();
      width = bWidth; height = bHeight;
    }
    else {
      width = Number(wContainer.style.width.slice (0, -2));
      height = Number(wContainer.style.height.slice(0, -2));
    }
    return [width, height];
  }
  function getPos() {return [wLeft, wTop];}

  //Private Properties
  //  main elements of context menu
  var wNode, wContainer, wContent; //window elements
  var wTop, wLeft, wWidth, wHeight; //window position and size
  var closeCallback;

  //Initialize object
  (function () {
    closeCallback = null;
    wNode = wContainer = wContent = null;
    wTop = wLeft = wWidth = wHeight = null;
    this.recreate(options);
  }).call(this);
}