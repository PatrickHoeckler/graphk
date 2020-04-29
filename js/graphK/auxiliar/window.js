"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

graphK.Window = function () {
  //Constants
  //  main elements of context menu
  const node = document.createElement('div');
  const window = document.createElement('div');
  const overlay = document.createElement('div');

  //Public Attributes
  
  //Private Properties
  var parent, width, height;

  //Public Methods
  this.appendTo = (elem) => (parent = elem).appendChild(node);
  this.openIn = function (elem, newWidth, newHeight, pos) {
    node.remove();
    parent = elem;
    this.resize(newWidth, newHeight);
    this.setPos(pos);
    this.appendTo(elem);
  }
  this.close = function() {
    node.remove();
    parent = null;
    this.setPos();
    this.resize();
  }
  this.resize = function (newWidth = 0, newHeight = 0) {
    window.style.width  = typeof(newWidth)  !== 'number' ? '' : `${newWidth}px`;
    window.style.height = typeof(newHeight) !== 'number' ? '' : `${newHeight}px`;
    width  = typeof(newWidth)  !== 'number' ? 0 : newWidth;
    height = typeof(newHeight) !== 'number' ? 0 : newHeight;
  }
  this.setPos = function ({top, bottom, left, right} = {}) {
    if (!width || !height) {
      let {rHeight, rWidth} = window.getBoundingClientRect();
      if (!width)  {width  = rWidth;}
      if (!height) {height = rHeight;}
    }
    let wTop  = top  ? top  : bottom ? bottom - height : null;
    let wLeft = left ? left : right  ? right - width   : null;
    if (parent) {
      let parHeight = parent.clientHeight;
      let parWidth = parent.clientWidth;
      if (wTop !== null) {
        if (wTop < 0) {wTop = 0;}
        else if (parHeight < wTop + height) {wTop = parHeight - height;}
      }
      if (wLeft !== null) {
        if (wLeft < 0) {wLeft = 0;}
        else if (parWidth  < wLeft + width) {wLeft = parWidth - width;}
      }
    }
    window.style.top  = wTop  !== null ? `${wTop}px` : '';
    window.style.left = wLeft !== null ? `${wLeft}px` : '';
  }
  this.appendContent = (elem) => window.appendChild(elem);
  this.clearContents = () => window.innerHTML = '';
  //Private Functions

  //Initialize object
  (function () {
    parent = null;
    height = width = 0;
    node.classList.value = 'window';
    window.classList.value = 'window-contents';
    overlay.classList.value = 'window-overlay';
    node.appendChild(overlay);
    node.appendChild(window);
  })();
}