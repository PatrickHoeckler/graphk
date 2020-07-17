'use strict';

module.exports = {PanelHolder};
const {Panel} = require('./panel.js');
const {
  appendNewElement, changePosition, defaultCallParent
} = require('../auxiliar/auxiliar.js');

//The arguments must be instances of a Panel object to be all contained
//by the PanelHolder
function PanelHolder(...panels) {
  //Constants
  const node = appendNewElement(null, 'div', 'panel-holder');
  const frame = appendNewElement(node, 'div', 'holder-frame');
  const body = appendNewElement(node, 'div', 'holder-body');
  const panelList = [];
  //Private Properties
  var focusedPanelID;
  var height; //height of the PanelHolder including the margins
  var timeoutId;
  var collapsed;
  var callParent = defaultCallParent;
  //Public Attributes
  //Public Methods
  this.onCallParent = function(executor = defaultCallParent) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  this.node = () => node;
  this.contains = panel => panelList.includes(panel);
  this.removePanel = panel => removePanelById(getPanelId(panel.node()));
  this.addPanels = addPanels;
  this.getHeight = () => !collapsed ? height : node.getBoundingClientRect().height;
  this.setHeight = setHeight;
  this.changeHeight = (change) => setHeight(height + change);
  this.isCollapsed = () => collapsed;
  this.collapse = collapse;
  this.uncollapse = uncollapse;
  //Private Functions
  function addPanels(...panels) {
    for (let p of panels) {
      if (!(p instanceof Panel)) { //Invalid argument
        throw new TypeError('Wrong type of argument, expected a instanceof ' +
        'Panel. Check the function details for more information'
      )}
      panelList.push(p);
      let name = appendNewElement(frame, 'span', 'panel-name');
      name.innerHTML = p.name();
    }
  }
  function focusPanel(id) {
    if (id === focusedPanelID || !panelList[id]) {return;}
    //remove focused panel from DOM and unfocus its panel name
    if (body.children[0]) {body.children[0].remove();}
    frame.children[focusedPanelID].classList.remove('focus');
    //focus new panel
    body.appendChild(panelList[id].node());
    frame.children[id].classList.add('focus');
    focusedPanelID = id;
  }
  function getPanelId(elem) {
    var id = Array.prototype.indexOf.call(frame.children, elem);
    if (id === -1) {id = panelList.findIndex(panel => panel.node() === elem);}
    return id;
  }
  function setHeight(newHeight) {
    if (newHeight < PanelHolder.prototype.MIN_HEIGHT) {return false;}
    height = newHeight;
    node.style.height = `${height = newHeight}px`;
    return true;
  }
  function collapse() {
    node.classList.add('collapsed');
    collapsed = true;
  }
  function uncollapse() {
    node.classList.remove('collapsed');
    collapsed = false;
  }
  function removePanelById(id) {
    if (id === -1) {return;}
    if (focusedPanelID === id) {focusPanel(id !== 0 ? 0 : 1);}
    panelList.splice(id, 1)[0];
    if (panelList.length) {
      if (id === focusedPanelID) {focusPanel(id !== 0 ? id - 1 : 1);}
      if (id < focusedPanelID) {focusedPanelID--;}
      frame.children[id].remove();
    }
    else {callParent('empty', {caller: node});}
  }
  function reorderPanels(id, x0) {
    timeoutId = 0;
    if (!frame.children[id]) {return;}
    //Calculating important values
    let finalId = id;
    let target = frame.children[id];
    let targetRect = target.getBoundingClientRect();
    let frameRect = frame.getBoundingClientRect();
    let xmax = frameRect.width - targetRect.width;
    let oldCursor = document.body.style.cursor;
    let frameY = frameRect.y;
    x0 += frameRect.x - targetRect.x;
    
    //Configuring DOM elements
    let empty = document.createElement('span');
    let fill = document.createElement('span');
    empty.style.marginLeft = `${-targetRect.width}px`;
    fill.style.width = `${targetRect.width}px`;
    frame.replaceChild(fill, target);
    target.style.left = `${targetRect.x - frameRect.x}px`;
    frame.insertBefore(empty, frame.children[0]);
    frame.insertBefore(target, frame.children[0]);
    target.classList.add('grab');
    document.body.style.cursor = 'grabbing';

    //Event Listeners
    function move({x, y}) {
      if (Math.abs(frameY - y) > 100) {return abort(x, y);}
      let dx = x - x0;
      dx = dx < 0 ? 0 : dx < xmax ? dx : xmax;
      target.style.left = `${dx}px`;

      //find the element being covered by the target (grabbed elem)
      let fillPos = finalId + 2; //the fill element id will always match this value
      let elemUnder = null, underId;
      let coveringLeft;
      targetRect = target.getBoundingClientRect();
      //if moving to the left of fill
      if (targetRect.x < fill.getBoundingClientRect().x) {
        coveringLeft = true;
        for (underId = fillPos - 1; underId > 1; underId--) {
          let child = frame.children[underId];
          let childRect = child.getBoundingClientRect();
          if (childRect.left < targetRect.left) {
            elemUnder = child;
            break;
          }
        }
      }
      else { //if moving to the right of fill
        coveringLeft = false;
        for (underId = fillPos + 1;; underId++) {
          let child = frame.children[underId];
          if (!child) {break;}
          let childRect = child.getBoundingClientRect();
          if (targetRect.right < childRect.right) {
            elemUnder = child;
            break;
          }
        }
      }
      if (!elemUnder) {return;}
      let elemRect = elemUnder.getBoundingClientRect();
  
      //switch positions if covering enough of the other element
      if (coveringLeft) {
        let limX = elemRect.right - 0.6 * elemRect.width;
        if (targetRect.left < limX) { //if covering enough
          let next = frame.children[underId];
          frame.insertBefore(fill, next ? next : null);
          finalId = underId - 2; //-2 because of empty and target elems
        }
        else if (fillPos !== underId + 1) {
          let next = frame.children[underId + 1];
          frame.insertBefore(fill, next ? next : null);
          finalId = underId - 1; //(underId + 1) - 2
        }
      }
      else {
        let limX = elemRect.left + 0.6 * elemRect.width;
        if (limX < targetRect.right) { //if covering enough
          let next = frame.children[underId + 1];
          frame.insertBefore(fill, next ? next : null);
          finalId = underId - 2; //-2 because of empty and target elems
        }
        else if (fillPos !== underId - 1) {
          let next = frame.children[underId];
          frame.insertBefore(fill, next ? next : null);
          finalId = underId - 3; //"It just works" - Todd Howards
        }
      }
    }
    function stop() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      target.style.left = '';
      document.body.style.cursor = oldCursor;
      target.classList.remove('grab');
      fill.remove(); empty.remove();
      let next = frame.children[finalId + 1];
      frame.insertBefore(target, next ? next : null);
      if (finalId !== id) {
        if (focusedPanelID === id) {focusedPanelID = finalId;}
        else if (focusedPanelID === finalId) {focusedPanelID = id;}
        changePosition(panelList, id, finalId);
      }
    }
    function abort(x, y) {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      target.style.visibility = 'hidden';
      callParent('undock', {caller: node, panel: panelList[id], x, y})
      .then((dockedInThisHolder) => {
        if (dockedInThisHolder) {
          target.style.visibility = '';
          stop();
          if (focusedPanelID === finalId) {
            body.appendChild(panelList[finalId].node());
          }
        }
        else {finalId = id; stop(); removePanelById(id);}
      });
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
  }

  //Initialize Object
  (function () {
    timeoutId = 0;
    collapsed = false;
    setHeight(PanelHolder.prototype.MIN_HEIGHT);
    //Add panels and focus on the first
    addPanels(...panels);
    body.appendChild(panelList[0].node());
    frame.children[0].classList.add('focus');
    focusedPanelID = 0;

    //Adding Event Listeners
    frame.addEventListener('dblclick', () => {
      collapse();
      callParent('collapse', {caller: node});
    });
    frame.addEventListener('mousedown', ({target, x}) => {
      timeoutId = setTimeout(function() {
        window.removeEventListener('mouseup', onMouseUp);
        reorderPanels(getPanelId(target), x);
      }, 200);
      window.addEventListener('mouseup', onMouseUp);
      function onMouseUp({target, ctrlKey}) {
        clearTimeout(timeoutId); timeoutId = 0;
        window.removeEventListener('mouseup', onMouseUp);
        focusPanel(getPanelId(target));
        if (node.classList.contains('collapsed')) {
          uncollapse();
          callParent('collapse', {caller: node});
        }
      }
    });
  })();
}

PanelHolder.prototype.MIN_HEIGHT = 150;