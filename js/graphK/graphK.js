"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

const {Mode} = require('./auxiliar/mode.js')
module.exports = {GraphK, Mode};

const {
  appendNewElement, getContextItems,
} = require('./auxiliar/auxiliar.js');
const {Window} = require('./auxiliar/window.js');
const {Context} = require('./auxiliar/context.js');
const {NavTree} = require('./auxiliar/navTree.js');
const {TransformSelector} = require('./auxiliar/transformSelector.js');
const {ArgsSelector} = require('./auxiliar/argsSelector.js');
const {ChartPanel} = require('./Panels/chartPanel/chartPanel.js');
const {RoutinePanel} = require('./Panels/routinePanel/routinePanel.js');
const {TransformPanel} = require('./Panels/transformPanel/transformPanel.js');
const {PanelManager} = require('./PanelManager/panelManager.js');

function GraphK() {
  //constants
  const modeClass = [
    ''      ,  //mode.NORMAL
    'select',  //mode.SELECT
    'rename',  //mode.RENAME
    'delete',  //mode.DELETE
    'brush' ,  //mode.BRUSH
    'drag'     //mode.DRAG
  ]
  const node = appendNewElement(null, 'section', 'graphK');
  const mode = new Mode(Mode.prototype.NORMAL);
  const navTree = new NavTree();
  const tfSelector = new TransformSelector();
  const panelManager = new PanelManager();
  const panels = {
    transform: new TransformPanel(mode),
    routine: new RoutinePanel(mode),
    chart: new ChartPanel(mode)
  };

  //Public Attributes

  //Private Properties
  var callParent = () => Promise.reject(new Error('callParent not set'));

  //Public Methods
  this.node = () => node;
  this.mode = () => mode.value();
  this.changeMode = mode.change;
  this.resize = () => {
    panelManager.fitPanels();
    panels.chart.resize();
  }
  this.appendTo = (elem) => {
    elem.appendChild(node);
    panelManager.appendTo(node);
  }
  this.setTransforms = function (transforms) {
    tfSelector.updateTransforms(transforms);
    panels.transform.updateTransforms(transforms);
    navTree.clear();
    for (let f of transforms.value) {navTree.addFolder(f);}
  };
  this.getTransformFromPath = panels.transform.getTransformFromPath;
  this.getDataFromPath = panels.transform.getDataFromPath;
  this.readFiles = (paths) => paths.forEach(p => panels.transform.readFile(p));
  //  Functions to set callbacks
  this.onCallParent = function (
    executor = () => Promise.reject(new Error('callParent not set'))
  ) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  //  Functions to change mode of operation
  this.startDataSelect = panels.transform.startDataSelect;
  this.stopDataSelect = panels.transform.stopDataSelect;

  //Private Functions
  //  Listener to be executed when the mode is about to change
  function modeChange(newMode) {
    node.classList.value = 'graphK';
    if (newMode !== Mode.prototype.NORMAL) { //changing from NORMAL to other
      node.classList.add(modeClass[newMode]);
      if (newMode === Mode.prototype.SELECT) {
        node.classList.add('cursor-pointer');
      }
    }
    else { //changing back to normal
      if (mode.is(Mode.prototype.SELECT)) {
        node.classList.remove('cursor-pointer');
      }
    }
  }
  function createContextMenu(event, place, detail) {
    let items = getContextItems(place, detail);
    if (!items) {return;}
    let context = new Context(event.pageX, event.pageY, items, function(action) {
      context.destroy();
      executeContextAction(place, action, event.target);
    });
    context.appendTo(node);
  }
  function executeContextAction(place, action, target) {
    if (!action) {return;}
    if (place === 'chart') {
      if (action === 'select') {
        let data = panels.chart.getDataFromBrush(target);
        if (!data) {return;}
        //third argument indicates that the rename box will be opened the
        //moment the file is created
        panels.transform.addToTree('selection', data, true);
      }
      else if (action === 'remove') {panels.chart.removeChart(target);}
      else if (action === 'clear') {panels.chart.clearChart(target);}
    }
    else if (place === 'navTree') {
      if (action === 'copy') {
        let {name, value} = panels.transform.getDataFromTreeElement(target);
        panels.transform.addToTree(name, value, true);
      }
      else if (action === 'rename') {panels.transform.renameFile(target);}
      else if (action === 'remove') {panels.transform.deleteFromTree(target);}
      else if (action === 'save') {
        let {name, value} = panels.transform.getDataFromTreeElement(target);
        if (!value) {return;}
        callParent('save-file', {name, value});
      }
    }
    else if (place === 'routine') {
      if (action === 'newR') panels.routine.newRoutine('routine', true);
      else if (action === 'remR') panels.routine.removeInRoutine(target);
      else if (action === 'rename') panels.routine.renameRoutine(target);
      else if (action === 'newS') panels.routine.addToRoutine(target, 'step', true);
      else if (action === 'remS') panels.routine.removeInRoutine(target);
    }
  }
  function configureTransforms() {return new Promise((resolve) => {
    const subWindow = new Window({
      width: 250, height: 400,
      parent: node, content: tfSelector.node(),
      frame: true, frameButtons: [],
      title: 'Choose the transforms to be used'
    });
    tfSelector.onSelect((transforms) => {
      subWindow.close();
      if (transforms) {
        panels.transform.updateTransforms(transforms);
        navTree.clear();
        for (let f of transforms.value) {navTree.addFolder(f);}
      }
      resolve(transforms);
    });
  });}
  function respondChild(message, details = {}) {
    if (message === 'load-file') {return callParent('load-file');}
    if (message === 'save-file') {return callParent('save-file', details);}
    if (message === 'configure-transforms') {return configureTransforms();}
    if (message === 'transform') {return selectTransform(details.x, details.y);}
    if (message === 'get-data') {return panels.transform.startDataSelect();}
    if (message === 'add-data') {
      panels.transform.addToTree('Routine', details.data, true);
      return Promise.resolve(null);
    }
    if (message === 'select-range') {
      return Promise.reject(new Error(null));
    }
    if (message === 'arguments') {
      return getArguments(details.argsFormat, details.windowTitle);
    }
    else {return Promise.reject(new Error('Invalid message to parent'));}
  }
  function selectTransform(x, y) { return new Promise((resolve) => {
    const tfWindow = new Window({
      width: 250, height: 400, x: x, y: y,
      parent: node, content: navTree.node().parentElement,
      frame: true, title: 'Select transform', frameButtons: ['close']
    });
    function selected(event) {
      let elem = navTree.getContainingElement(event.target);
      if (!elem || !elem.classList.contains('leaf')) {return;}
      elem.classList.remove('highlight');
      tfWindow.hide();
      //Selecting transform arguments if any
      let transform = panels.transform.getDataFromTreeElement(elem);
      getArguments(transform.args).then(({args, canceled}) => {
        if (canceled) {tfWindow.show(); return;}
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
    const argsSelector = new ArgsSelector(argsFormat, node, title);
    argsSelector.onCallParent(function (message, details) {
      if (message === 'get-data') {return panels.transform.startDataSelect();}
      else if (message === 'end-selection') {
        argsSelector.close();
        let {args, canceled} = details;
        if (canceled) {return resolve({canceled: true});}
        for (let i = 0; i < argsFormat.length; i++) {
          let {name, type} = argsFormat[i];
          if (type === 'data') {
            //in this situation args[name] holds the path to the data on the file tree,
            //we need to get the data using this path. First we parse the values of
            //the path back from the stringify operation made in the argsSelector.
            let path = JSON.parse(args[name]);
            //Now we use the path to get the data. Since we are only interested in
            //the (x,y) points of the curve, we just get the key 'value'.
            args[name] = panels.transform.getDataFromPath(path).value;
          }
        }
        resolve({args: args});
        return Promise.resolve(null);
      }
    });
  });}


  //Initialize object
  (function () {
    appendNewElement(null, 'div', 'routine-transforms').appendChild(navTree.node());
    mode.addCheckListener(newMode => {
      if (!mode.isMode(newMode)) {return false;}
      return mode.is(Mode.prototype.NORMAL) || newMode === Mode.prototype.NORMAL;
    });
    mode.addChangeListener(modeChange);

    //create container and append objects elements to it
    panelManager.addPanels(
      //PanelContainer[0]
      [
        panels.transform, //PanelHolder[0]
        panels.routine,   //PanelHolder[1]
      ],
      //PanelContainer[1]
      panels.chart
    );
    
    panels.transform.onContext(createContextMenu);
    panels.routine.onContext(createContextMenu);
    panels.chart.onContext(createContextMenu);
    panels.transform.onCallParent(respondChild);
    panels.routine.onCallParent(respondChild);

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