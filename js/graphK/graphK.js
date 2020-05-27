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
const {TransformSelector} = require('./auxiliar/transformSelector.js');
const {ChartPanel} = require('./render/chartPanel.js');
const {Control} = require('./control/control.js');

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
  const control = new Control(mode);
  const chartPanel = new ChartPanel(mode);
  const tfSelector = new TransformSelector();

  //Public Attributes

  //Private Properties
  var callParent = () => Promise.reject(new Error('callParent not set'));

  //Public Methods
  this.node = () => node;
  this.mode = () => mode.value();
  this.changeMode = mode.change;
  this.resize = () => chartPanel.resize();
  this.setTransforms = function (transforms) {
    tfSelector.updateTransforms(transforms);
    control.updateTransforms(transforms);
  };
  this.getTransformFromPath = control.getTransformFromPath;
  this.getDataFromTreeElement = control.getDataFromTreeElement;
  this.readFiles = (paths) => paths.forEach(p => control.readFile(p));
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
  this.startDataSelect = control.startDataSelect;
  this.stopDataSelect = control.stopDataSelect;

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
        node.classList.add('cursor-pointer');
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
        let data = chartPanel.getDataFromBrush(target);
        if (!data) {return;}
        //third argument indicates that the rename box will be opened the
        //moment the file is created
        control.addToTree('selection', data, true);
      }
      else if (action === 'remove') {chartPanel.removeChart(target);}
      else if (action === 'clear') {chartPanel.clearChart(target);}
    }
    else if (place === 'navTree') {
      if (action === 'copy') {
        let {name, value} = control.getDataFromTreeElement(target);
        control.addToTree(name, value, true);
      }
      else if (action === 'rename') {control.renameFile(target);}
      else if (action === 'remove') {control.deleteFromTree(target);}
      else if (action === 'save') {
        let {name, value} = control.getDataFromTreeElement(target);
        if (!value) {return;}
        callParent('save-file', {name, value});
      }
    }
    else if (place === 'routine') {
      if (action === 'newR') control.newRoutine('routine', true);
      else if (action === 'remR') control.removeInRoutine(target);
      else if (action === 'rename') control.renameRoutine(target);
      else if (action === 'newS') control.addToRoutine(target, 'step', true);
      else if (action === 'remS') control.removeInRoutine(target);
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
      if (transforms) {control.updateTransforms(transforms);}
      resolve(transforms);
    });
  });}
  function respondChild(message, details = {}) {
    if (message === 'load-file') {return callParent('load-file');}
    if (message === 'save-file') {return callParent('save-file', details);}
    if (message === 'configure-transforms') {return configureTransforms();}
  }

  //Initialize object
  (function () {
    mode.addCheckListener(newMode => {
      if (!mode.isMode(newMode)) {return false;}
      return mode.is(Mode.prototype.NORMAL) || newMode === Mode.prototype.NORMAL;
    });
    mode.addChangeListener(modeChange);

    //create container and append objects elements to it
    let container = appendNewElement(node, 'div', 'container');
    container.appendChild(control.node());
    let panelColumn = appendNewElement(container, 'div', 'panel-column');
    panelColumn.appendChild(chartPanel.node());
    control.setMainNode(node);
    control.onContext(createContextMenu);
    control.onCallParent(respondChild);
    chartPanel.onContext(createContextMenu);
  })();
}