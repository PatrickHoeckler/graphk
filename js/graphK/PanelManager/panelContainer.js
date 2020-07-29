'use strict';

module.exports = {PanelContainer};
const {Panel} = require('./panel.js');
const {PanelHolder} = require('./panelHolder.js');
const {appendNewElement, defaultCallParent} = require('../auxiliar/auxiliar.js')

//The arguments must be of one of the following forms:
// - (TYPE 1) A single instance of a Panel object
// - (TYPE 2) An array containing multiple instances of a Panel object
//The constructor will create a PanelHolder for each argument given. Then,
//if the argument is of:
// - TYPE 1: The PanelHolder created will contain the single Panel
// given by the argument.
// - TYPE 2: The PanelHolder created will contain all the Panels that
// are inside the array given by the argument.
function PanelContainer(...panels) {
  //Constants
  const node = appendNewElement(null, 'div', 'panel-container');
  const holderList = [];
  //Private Properties
  var width;
  var callParent = defaultCallParent;
  //Public Attributes
  //Public Methods
  this.onCallParent = function (executor = defaultCallParent) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  this.node = () => node;
  this.contains = panel => holderList.some(h => h.contains(panel));
  this.removePanel = function(panel) {
    let holder = holderList.find(h => h.contains(panel));
    if (holder) {holder.removePanel(panel);}
  }
  this.addPanels = addPanels;
  this.fitPanels = fitPanels;
  this.getWidth = () => width;
  this.setWidth = function(newWidth) {
    if (newWidth < PanelContainer.prototype.MIN_WIDTH) {return false;}
    width = newWidth;
    node.style.width = `${newWidth}px`;
    return true;
  }
  this.addPanelsToHolder = function (holderElem, ...panels) {
    let holder = holderList.find((holder) => holder.node().contains(holderElem));
    holder.addPanels(...panels);
  }
  this.insertHolderAt = function (id = holderList.length, ...panels) {
    if (holderList.length < id || id < 0) {throw new Error(
      'Invalid id, out of bounds'
    );}
    let holder = new PanelHolder(...panels);
    holder.onCallParent(respondChild);
    holderList.splice(id, 0, holder);
    let resizer = appendNewElement(null, 'div', 'ns-resize');
    let next = node.children[2 * id];
    node.insertBefore(resizer, next ? next : null);
    node.insertBefore(holder.node(), next ? resizer : null);
    fitPanels();
  }
  this.changeWidth = (change) => this.setWidth(width + change);
  //Private Functions
  function addPanels(...panels) {
    let wasEmpty = !node.children.length;
    for (let panelList of panels) {
      //If invalid argument
      if (!(panelList instanceof Panel) && !Array.isArray(panelList)) {
        throw new TypeError('Wrong type of argument, expected a instanceof ' +
        'Panel or an array. Check the function details for more information'
      )}
      let holder;
      if (panelList instanceof Panel) { //Argument TYPE 1
        holder = new PanelHolder(panelList);
      }
      else if (Array.isArray(panelList)) { //Argument TYPE 2
        holder = new PanelHolder(...panelList);
      }
      holder.onCallParent(respondChild);
      holderList.push(holder);
      appendNewElement(node, 'div', 'ns-resize');
      node.appendChild(holder.node());
    }
    if (wasEmpty) {node.firstElementChild.remove();}
  }
  function fitPanels(id = 0) {
    if (!holderList[id]) {return;}
    let {height} = node.getBoundingClientRect();
    if (!height) {return;} //if container not appended yet
    let childrenHeight = holderList.reduce(
      (acc, holder) => acc + holder.getHeight(), 0
    );
    let nHolders = holderList.length;
    //Resizes uncollapsed PanelHolders until they fit in the container
    //If after resize they still don't fit, then starts collapsing panels
    let i = id + 1 < nHolders ? id + 1 : id - 1;
    let collapsing = false;
    while (childrenHeight > height) {
      let holder = holderList[i];
      if (!holder) {break;}
      if (!holder.isCollapsed()) {
        let h0 = holder.getHeight();
        if (collapsing) {holder.collapse();}
        else {
          holder.setHeight(Math.max(
            h0 + height - childrenHeight, holder.MIN_HEIGHT
          ));
        }
        childrenHeight += holder.getHeight() - h0;
      }
      if (i > id) {if (++i === nHolders) {i = id - 1;}}
      else {i--;}
      if (i < 0) {
        if (collapsing) {break;}
        i = id + 1 < nHolders ? id + 1 : id - 1;
        collapsing = true;
        holder = holderList[id];
        if (holder.isCollapsed()) {continue;}
        if (holder.changeHeight(height - childrenHeight)) {
          childrenHeight = height
        };
      };
    }

    if (childrenHeight === height) {return;}
    let holder = !holderList[id].isCollapsed() ? holderList[id] :
      holderList.find(holder => !holder.isCollapsed());
    if (holder) {holder.changeHeight(height - childrenHeight);}
  }
  function updateResizeDivs() {
    let firstUncollapsed = null, lastUncollapsed;
    for (let i = 0, n = holderList.length; i < n; i++) {
      if (holderList[i].isCollapsed()) {continue;}
      if (firstUncollapsed === null) {firstUncollapsed = i;}
      lastUncollapsed = i;
    }
    if (firstUncollapsed === null) {return;}
    
    for (let i = 0, n = holderList.length - 1; i < n; i++) {
      if (firstUncollapsed <= i && i < lastUncollapsed) {
        node.children[2 * i + 1].classList.remove('disable');
      }
      else {node.children[2 * i + 1].classList.add('disable');}
    }
  }
  function respondChild(message, details) {
    let id = holderList.findIndex((holder) => holder.node() === details.caller);
    if (message === 'collapse') {
      fitPanels(id);
      updateResizeDivs();
      return Promise.resolve(null);
    }
    else if (message === 'empty') {
      removeHolder(id);
      return Promise.resolve(null);
    }
    else if (message === 'undock') {return callParent('undock', details);}
    else {return Promise.reject(new Error('Message to parent invalid'));}
  }
  function handleResize({target, y}) {
    if (!target.classList.contains('ns-resize')) {return;}
    let resizerPos = Array.prototype.indexOf.call(node.children, target);
    //All resizers are on odd numbered positions, so we subtract 1 and
    //divide to get the real position
    resizerPos = (resizerPos - 1) / 2;
    //Get all holders uncollapsed on top of and down the resizer element
    let topHolders = [], downHolders = [];
    for (let i = resizerPos; holderList[i]; i--) {
      if (!holderList[i].isCollapsed()) {topHolders.push(holderList[i]);}
    }
    if(!topHolders.length) {return;}
    for (let i = resizerPos + 1; holderList[i]; i++) {
      if (!holderList[i].isCollapsed()) {downHolders.push(holderList[i]);}
    }
    if(!downHolders.length) {return;}
    let y0 = y;
    function move({y}) {
      let dy = y - y0;
      if (dy > 0) { //Extend first top holder and shrink any down holder
        if (downHolders.some(holder => holder.changeHeight(-dy))) {
          topHolders[0].changeHeight(dy);
          y0 = y;
        }
      }
      else { //Extend first down holder and shrink any top holder
        if (topHolders.some(holder => holder.changeHeight(dy))) {
          downHolders[0].changeHeight(-dy);
          y0 = y;
        }
      }
    }
    function stop() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      document.body.style.cursor = oldCursor;
      node.dispatchEvent(new Event('resize', {bubbles: true}));
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    let oldCursor = document.body.style.cursor;
    document.body.style.cursor = 'ns-resize';
  }
  function removeHolder(id) {
    let holder = holderList[id];
    if (!holder) {return;}
    let resizer = node.children[id === 0 ? 1 : 2 * id - 1];
    if (resizer) {resizer.remove();}
    holderList.splice(id, 1)[0];
    holder.node().remove();
    if (holderList.length) {fitPanels();}
    else {callParent('empty', {caller: node});}
  }

  //Initialize Object
  (function () {
    this.setWidth(PanelContainer.prototype.MIN_WIDTH);
    addPanels(...panels);
    node.addEventListener('mousedown', handleResize);
  }).call(this);
}

PanelContainer.prototype.MIN_WIDTH = 200;