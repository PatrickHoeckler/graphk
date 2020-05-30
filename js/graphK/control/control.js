"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

module.exports = {Control};

const {appendNewElement} = require('../auxiliar/auxiliar.js');
const {Window} = require('../auxiliar/window.js');
const {NavTree} = require('./navTree.js');
const {ArgsSelector} = require('./argsSelector.js');
const {RoutinePanel} = require('./Panels/routinePanel');
const {TransformPanel} = require('./Panels/transformPanel');

function Control(modeObj) {
  if (modeObj === null || typeof(modeObj) !== 'object') {throw new Error(
    'Cannot create object without a reference to a Mode() object to hold ' +
    'the mode of operation of this object'
  );}
  //Constants
  const mode = modeObj;
  const tfPanel = new TransformPanel(mode);
  const rtPanel = new RoutinePanel(mode);
  const navTree = new NavTree();

  //Public Attributes

  //Private Properties
  var mainNode;
  var node, wrapper, resizer;
  var mouseOverElem;
  var callParent = () => Promise.reject(new Error('callParent not set'));

  //Public Methods
  this.node = () => node;
  this.setMainNode = (node) => mainNode = node;
  this.updateTransforms = updateTransforms;
  //  indirect calls to tfPanel object
  this.readFile = tfPanel.readFile;
  this.renameFile = tfPanel.renameFile;
  this.addToTree = tfPanel.addToTree;
  this.deleteFromTree = tfPanel.deleteFromTree;
  this.getDataFromPath = tfPanel.getDataFromPath;
  this.getTransformFromPath = tfPanel.getTransformFromPath;
  this.getDataFromTreeElement = tfPanel.getDataFromTreeElement;
  this.startDataSelect = tfPanel.startDataSelect;
  this.stopDataSelect = tfPanel.stopDataSelect;
  //  indirect calls to rtPanel object
  this.newRoutine = rtPanel.newRoutine;
  this.renameRoutine = rtPanel.renameRoutine;
  this.removeInRoutine = rtPanel.removeInRoutine;
  this.addToRoutine = rtPanel.addToRoutine;
  this.onContext = function (callback) {
    rtPanel.onContext(callback);
    tfPanel.onContext(callback);
  }
  this.onCallParent = function (
    executor = () => Promise.reject(new Error('callParent not set'))
  ) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  //Private Functions
  //  Resize Function
  function handleResize(e) {
    let oldWidth = node.clientWidth;
    let startX = e.x;
    function move(e) {
      let newWidth = oldWidth + e.x - startX;
      newWidth = newWidth < 100 ? 100 : newWidth > 600 ? 600 : newWidth;
      node.style.width = `${newWidth}px`;
    }
    function stop() {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    }
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop); 
  }
  function updateTransforms(newTransforms) {
    tfPanel.updateTransforms(newTransforms);
    navTree.clear();
    for (let f of newTransforms.value) {navTree.addFolder(f);}
  }
  function respondChild(message, details = {}) {
    if (message === 'transform') {return selectTransform(details.x, details.y);}
    if (message === 'get-data') {return tfPanel.startDataSelect();}
    if (message === 'add-data') {
      tfPanel.addToTree('Routine', details.data, true);
      return Promise.resolve(null);
    }
    if (message === 'select-range') {
      return Promise.reject(new Error(null));
    }
    if (message === 'arguments') {
      return getArguments(details.argsFormat, details.windowTitle);
    }
    if (message === 'load-file') {return callParent('load-file');}
    if (message === 'save-file') {return callParent('save-file', details);}
    if (message === 'configure-transforms') {return callParent('configure-transforms');}
    else {return Promise.reject(new Error('Invalid message to parent'));}
  }
  function selectTransform(x, y) { return new Promise((resolve) => {
    const tfWindow = new Window({
      width: 250, height: 400, x: x, y: y,
      parent: mainNode, content: navTree.node().parentElement,
      frame: true, title: 'Select transform', frameButtons: ['close']
    });
    function selected(event) {
      let elem = navTree.getContainingElement(event.target);
      if (!elem || !elem.classList.contains('leaf')) {return;}
      elem.classList.remove('highlight');
      tfWindow.hide();
      //Selecting transform arguments if any
      let path = navTree.findPath(elem);
      let transform = tfPanel.getTransformFromPath(path);
      getArguments(transform.args).then(({args, canceled}) => {
        if (canceled) {
          tfWindow.show();
          return;
        }
        tfWindow.close();
        navTree.collapseAll();
        navTree.node().removeEventListener('dblclick', selected);
        resolve({func: transform.func, args: args});
      }).catch(() => tfWindow.show());
    }
    navTree.node().addEventListener('dblclick', selected);
    tfWindow.onclose(function(state) {
      if (state !== 'click') {return;}
      navTree.node().removeEventListener('dblclick', selected);
      resolve({canceled: true});
    });
  });}
  function getArguments(argsFormat, title = 'Select Parameters') {
  return new Promise((resolve) => {
    //if no arguments needed, just calls the callback to calculate transform
    if (!argsFormat) {return resolve({args: null});}
    const argsSelector = new ArgsSelector(argsFormat, mainNode, title);
    argsSelector.onCallParent(function (message, details) {
      if (message === 'get-data') {return tfPanel.startDataSelect();}
      else if (message === 'end-selection') {
        argsSelector.close();
        let {args, canceled} = details;
        if (canceled) {
          resolve({canceled: true});
          return Promise.resolve(null);
        }
        for (let i = 0; i < argsFormat.length; i++) {
          let {name, type} = argsFormat[i];
          if (type === 'data') {
            //in this situation args[name] holds the path to the data on the file tree,
            //we need to get the data using this path. First we parse the values of
            //the path back from the stringify operation made in the argsSelector.
            let path = JSON.parse(args[name]);
            //Now we use the path to get the data. Since we are only interested in
            //the (x,y) points of the curve, we just get the key 'value'.
            args[name] = tfPanel.getDataFromPath(path).value;
          }
        }
        resolve({args: args});
        return Promise.resolve(null);
      }
    });
  });}

  //Initialize object
  (function() {
    mouseOverElem = null;
    //  Creating control elements
    node = appendNewElement(null, 'div', 'chart-control');
    wrapper = appendNewElement(node, 'div', 'wrapper');
    resizer = appendNewElement(node, 'div', 'width-resizer');
    resizer.addEventListener('mousedown', handleResize);
    let selector = appendNewElement(null, 'div', 'routine-transforms');
    selector.appendChild(navTree.node());
    
    let panels = [tfPanel, rtPanel];
    for (let p of panels) {wrapper.appendChild(p.node());}
    tfPanel.onCallParent(respondChild);
    rtPanel.onCallParent(respondChild);
    //Adding Event Listeners
    navTree.node().addEventListener('mouseover', function (e) {
      mouseOverElem = navTree.getContainingElement(e.target);
      if (mouseOverElem) {mouseOverElem.style.backgroundColor = 'rgb(70,70,70)';}
    });
    navTree.node().addEventListener('mouseout', function (e) {
      mouseOverElem = navTree.getContainingElement(e.target);
      if (mouseOverElem) {mouseOverElem.style.backgroundColor = '';}
    });
    navTree.node().addEventListener('click', (e) => navTree.toggleFolder(e.target));
  })();
}