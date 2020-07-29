'use strict';

module.exports = {PanelManager};
const {Panel} = require('./panel.js');
const {PanelContainer} = require('./panelContainer.js');
const {DockLight} = require('./dockLight.js');
const {appendNewElement} = require('../auxiliar/auxiliar.js')

//The arguments must be of one of the following forms:
// - (TYPE 1) A single instance of a Panel object
// - (TYPE 2) An array containing elements of one of the following forms:
//    -> (TYPE 2.a) A single instance of a Panel object
//    -> (TYPE 2.b) An array containing multiple instances of a Panel object
//The constructor will create a PanelContainer for each argument given. Then,
//if the argument is of:
// - TYPE 1: The PanelContainer will contain a single PanelHolder which will
//   contain the Panel given.
// - TYPE 2: The PanelContainer will create a PanelHolder for each element of
//   the array given. And if the elements of the array are of:
//    -> TYPE 2.a: The PanelHolder created will contain the single Panel
//    given by the element.
//    -> TYPE 2.b: The PanelHolder created will contain all the Panels that
//    are inside the array given by the element.
function PanelManager(...panels) {
  //Constants
  const node = appendNewElement(null, 'div', 'panel-region');
  const containerList = [];
  //Private Properties
  //Public Attributes
  //Public Methods
  this.appendTo = function(elem) {
    node.style.visibility = 'hidden';
    elem.appendChild(node);
    fitPanels();
    node.style.visibility = '';
  }
  this.addPanels = addPanels;
  this.fitPanels = fitPanels;
  this.contains = containsPanel;
  this.togglePanel = function togglePanel(panel, show) {
    if (!(panel instanceof Panel)) {
      throw new TypeError('Wrong type of argument, expected a instanceof ' +
      'Panel or an array. Check the function details for more information'
    );}
    if (show) {
      if (!containsPanel(panel)) {addPanels(panel);}
    }
    else {
      let container = containerList.find(c => c.contains(panel));
      if (container) {container.removePanel(panel); fitPanels();}
    }
  }
  //Private Functions
  function containsPanel(panel) {
    return containerList.some(c => c.contains(panel));
  }
  function addPanels(...panels) {
    let wasEmpty = !node.children.length;
    for (let panelList of panels) {
      if (!(panelList instanceof Panel) && !Array.isArray(panelList)) {
        throw new TypeError('Wrong type of argument, expected a instanceof ' +
        'Panel or an array. Check the function details for more information'
      );}
      let container;
      if (panelList instanceof Panel) { //Argument TYPE 1
        container = new PanelContainer(panelList);
      }
      else if (Array.isArray(panelList)) { //Argument TYPE 2
        container = new PanelContainer(...panelList);
      }
      container.onCallParent(respondChild);
      containerList.push(container);
      appendNewElement(node, 'div', 'ew-resize');
      node.appendChild(container.node());
    }
    if (wasEmpty) {node.firstElementChild.remove();}
    fitPanels();
  }
  function fitPanels(id = containerList.length - 1) {
    if (!containerList[id]) {return;}
    let {width} = node.getBoundingClientRect();
    if (!width) {return;} //if the node was not appended yet
    let childrenWidth = containerList.reduce(
      (acc, container) => acc + container.getWidth(), 0
    );
    let i = 0;
    while (childrenWidth > width) {
      if (i === id) {i++; continue;}
      let container = containerList[i];
      if (!container) {break;}
      let w0 = container.getWidth();
      container.setWidth(Math.max(
        w0 + width - childrenWidth, container.MIN_WIDTH
      ));
      childrenWidth += container.getWidth() - w0;
      i++;
    }
    if (childrenWidth !== width) {
      let container = containerList[id];
      container.changeWidth(width - childrenWidth);
    }
    containerList.forEach(container => container.fitPanels());
  }
  function handleResize({target, x}) {
    if (!target.classList.contains('ew-resize')) {return;}
    let resizerPos = Array.prototype.indexOf.call(node.children, target);
    //All resizers are on odd numbered positions, so we subtract 1 and
    //divide to get the real position
    resizerPos = (resizerPos - 1) / 2;
    //Get all containers at the right and left side of the resizer element
    let rightContainers = [], leftContainers = [];
    for (let i = resizerPos; containerList[i]; i--) {
      leftContainers.push(containerList[i]);
    }
    if(!leftContainers.length) {return;}
    for (let i = resizerPos + 1; containerList[i]; i++) {
      rightContainers.push(containerList[i]);
    }
    if(!rightContainers.length) {return;}
    let x0 = x;
    function move({x}) {
      let dx = x - x0;
      if (dx > 0) { //Extend first left container and shrink any right container
        if (rightContainers.some(container => container.changeWidth(-dx))) {
          leftContainers[0].changeWidth(dx);
          x0 = x;
        }
      }
      else { //Extend first right container and shrink any left container
        if (leftContainers.some(container => container.changeWidth(dx))) {
          rightContainers[0].changeWidth(-dx);
          x0 = x;
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
    document.body.style.cursor = 'ew-resize';
  }
  function prepareDocking({caller, panel, x0, y0}) {return new Promise((resolve) => {
    let dockLight = new DockLight();
    let container = new PanelContainer(panel);
    let bRect = node.getBoundingClientRect();
    let cNode = container.node();
    let nChildren = node.children.length;
    let target, region;
    cNode.classList.add('undocked');
    cNode.style.left = `${x0 - bRect.x}px`;
    cNode.style.top  = `${y0 - bRect.y}px`;
    cNode.style.zIndex = 1;
    node.appendChild(cNode);
    node.appendChild(dockLight.node());
    x0 = bRect.x; y0 = bRect.y;
    
    //Event Handlers
    function move({x, y}) {
      cNode.style.left = `${x - x0}px`;
      cNode.style.top  = `${y - y0}px`;
      let moveTarget, moveRegion;
      for (let i = 0; i < nChildren; i++) {
        moveRegion = dockLight.findPointedRegion(x, y, node.children[i]);
        if (moveRegion !== 'o') {
          moveTarget = node.children[i];
          break;
        }
      }
      if (!moveTarget) {return;}
      target = moveTarget; region = moveRegion;
      if (target.classList.contains('ew-resize')) {
        target = target.nextSibling; region = 'w';
      }
      if (region === 'w');
      else if (region === 'e' || target.classList.contains('ew-resize')) {
        if (target.nextSibling !== cNode) {
          target = target.nextSibling.nextSibling; region = 'w';
        }
      }
      else {
        let containerElem = target;
        for (let i = 0, n = containerElem.children.length; i < n; i++) {
          target = containerElem.children[i];
          region = dockLight.findPointedRegion(x, y, target);
          if (region !== 'o') {break;}
        }
        if (target.classList.contains('ns-resize')) {
          target = target.nextSibling; region = 'n';
        }
        if (region === 'e' || region === 'w') {region = 'c';}
        if (region === 's') {
          if (target.nextSibling) {
            target = target.nextSibling.nextSibling; region = 'n';
          }
        }
      }
      dockLight.changeTarget(target);
      dockLight.lightTarget(region);
    }
    function stop() {
      cNode.remove(); dockLight.remove();
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      if (caller === target && region === 'c') {resolve(true);}
      else {endDocking(); resolve(false);}
    }
    function endDocking() {
      if (region === 'w' || region === 'e') {
        cNode.classList.remove('undocked');
        cNode.style.left = cNode.style.right = cNode.style.zIndex = '';
        container.onCallParent(respondChild);
        let resizer = appendNewElement(null, 'div', 'ew-resize');
        if (region === 'w') {
          let id = Array.prototype.indexOf.call(node.children, target);
          containerList.splice(id / 2, 0, container);
          node.insertBefore(resizer, node.children[id]);
          node.insertBefore(cNode, resizer);
        }
        else {
          containerList.push(container);
          node.appendChild(resizer);
          node.appendChild(cNode);
        }
        fitPanels();
      }
      else {
        container = containerList.find(c => c.node().contains(target));
        if (region === 'c') {container.addPanelsToHolder(target, panel);}
        else {
          let id = Array.prototype.indexOf.call(container.node().children, target);
          id = region === 's' ? id / 2 + 1 : id / 2;
          container.insertHolderAt(id, panel);
        }
      }
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  });}
  function respondChild(message, details) {
    if (message === 'empty') {
      let id = containerList.findIndex((holder) => holder.node() === details.caller);
      let container = containerList[id];
      if (!container) {return;}
      let resizer = node.children[id === 0 ? 1 : 2 * id - 1];
      if (resizer) {resizer.remove();}
      containerList.splice(id, 1)[0];
      container.node().remove();
      fitPanels();
      return Promise.resolve(null);
    }
    if (message === 'undock') {
      return prepareDocking(details);
    }
    else {return Promise.reject(new Error('Message to parent invalid'));}
  }

  //Initialize Object
  (function () {
    if (panels.length) {addPanels(...panels);}
    node.addEventListener('mousedown', handleResize);
  })();
}
