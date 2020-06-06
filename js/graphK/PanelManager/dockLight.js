"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

module.exports = {DockLight};

function DockLight() {
  //Constants
  const node = document.createElement('div');
  //Private Properties
  var target, limits;
  var highlightedRegion;

  //Public Methods
  this.node = () => node;
  this.getTarget = () => target;
  this.remove = () => node.remove();
  //  Finds the position x, y in relation to target element. Can assume:
  //  'o' (outside), 'c' (center), n' (north), 's' (south), 'w' (west), 'e' (east)
  this.findPointedRegion = function(x, y, pointedTarget = target) {
    let lim = pointedTarget === target ? limits : calculateLimits(pointedTarget);
    x -= lim.left; y -= lim.top;
    if (x < 0 || x > lim.width ) {return 'o';}
    if (y < 0 || y > lim.height) {return 'o';}
    if (x < lim.w) {return 'w';}
    if (x > lim.e) {return 'e';}
    if (y < lim.n) {return 'n';}
    if (y > lim.s) {return 's';}
    return 'c';
  }
  this.changeTarget = function(elem) {
    if (target === elem) {return;}
    highlightedRegion = null;
    limits = calculateLimits(elem);
    node.className = 'dock-light';
    node.style.top = `${limits.top}px`;
    node.style.left = `${limits.left}px`;
    node.style.width = `${limits.width}px`;
    node.style.height = `${limits.height}px`;
  }
  this.lightTarget = function(region) {
    if (region === 'o') {region = '';}
    if (region === highlightedRegion) {return;}
    node.classList.remove(highlightedRegion);
    if (highlightedRegion === 's') {node.style.top = `${limits.top}px`   ;}
    else if (region       === 's') {node.style.top = `${limits.bottom}px`;}
    if (highlightedRegion === 'e') {node.style.left = `${limits.left}px` ;}
    else if (region       === 'e') {node.style.left = `${limits.right}px`;}
    if (region) {node.classList.add(region);}
    highlightedRegion = region
  }

  //Private Functions
  function calculateLimits(elem) {
    let lim = elem.getBoundingClientRect();
    lim.w = lim.width  < 50 ? 0.2 * lim.width  :              20;
    lim.e = lim.width  < 50 ? 0.8 * lim.width  : lim.width  - 20;
    lim.n = lim.height < 50 ? 0.2 * lim.height :              20;
    lim.s = lim.height < 50 ? 0.8 * lim.height : lim.height - 20;
    return lim;
  }
  //Initialize Object
  ;(function () {node.className = 'dock-light';})();
}
