"use strict";

module.exports = GraphK;

const {appendNewElement, defaultCallParent} = require('./auxiliar/auxiliar.js');
const {makeTransform, makeTransformDir} = require('./auxiliar/transformations.js');
const {selectArguments} = require('./auxiliar/argsSelector.js');
const {Mode} = require('./auxiliar/mode.js');
const {Window} = require('./auxiliar/window.js');
const {Context} = require('./auxiliar/context.js');
const {TransformSelector} = require('./auxiliar/transformSelector.js');
const {ChartPanel} = require('./Panels/chartPanel/chartPanel.js');
const {RoutinePanel} = require('./Panels/routinePanel/routinePanel.js');
const {TransformPanel} = require('./Panels/transformPanel/transformPanel.js');
const {PropertiesPanel} = require('./Panels/propertiesPanel/propertiesPanel.js');
const {PanelManager} = require('./PanelManager/panelManager.js');

GraphK.Mode = Mode;
GraphK.makeTransform = makeTransform;
GraphK.makeTransformDir = makeTransformDir;

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
  const tfSelector = new TransformSelector();
  const panelManager = new PanelManager();
  const panels = {
    transform: new TransformPanel(mode),
    routine: new RoutinePanel(mode),
    chart: new ChartPanel(mode),
    properties: new PropertiesPanel()
  };
  //dictionary indexed by the transform file sha256 hash
  const transformDict = {};
  //Private Properties
  var callParent = defaultCallParent;
  var transferData;

  //Public Methods
  this.node = () => node;
  this.mode = () => mode.value();
  this.changeMode = mode.change;
  this.resize = () => {
    panelManager.fitPanels();
    panels.chart.resize();
  }
  this.appendTo = (elem) => {
    node.style.visibility = 'hidden';
    elem.appendChild(node);
    panelManager.appendTo(node);
    panels.chart.resize();
    node.style.visibility = '';
  }
  this.setTransforms = function (transforms) {
    (function modifyTransformFolder(tfFolder) {
      if (tfFolder.type === 'pkg') {
        tfFolder.contents.forEach(tf => tf.pkg = tfFolder);
      }
      //This clone is important because the `value` key will be used to hold
      //the current active transformations, while the `contents` key will also
      //hold the inactive. The `value` key will be used to create the navTree
      //object, so it can be modified to remove unwanted transformations.
      tfFolder.value = Array.from(tfFolder.contents);
      for (let tfFile of tfFolder.contents) {
        //if tfFile is also a folder
        if (tfFile.contents) {modifyTransformFolder(tfFile);}
        //must add to the dictionary outside the if/else statement above
        //because if the tfFile is of type pkg, then it is considered a 
        //folder, but it is a single file with a single hash, containing
        //multiple transforms.
        if (tfFile.hash) {transformDict[tfFile.hash] = tfFile;}
      }
    })(transforms);
    tfSelector.updateTransforms(transforms);
    panels.transform.updateTransforms(transforms);
    panels.routine.updateTransforms(transforms, transformDict);
  };
  this.readFiles = panels.transform.readFiles;
  this.togglePanel = function(panelName, show) {
    var panel;
    if (panelName === 'Files')           {panel = panels.transform;}
    else if (panelName === 'Routines'  ) {panel = panels.routine;}
    else if (panelName === 'Charts'    ) {panel = panels.chart;}
    else if (panelName === 'Properties') {panel = panels.properties;}
    else {return;}
    panelManager.togglePanel(panel, show);
  }
  this.onCallParent = function (executor = defaultCallParent) {
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
  function contextMenu({x, y, contextItems}) {return new Promise((resolve) => {
    let context = new Context(x, y, contextItems, function(action) {
      context.destroy();
      resolve(action);
    });
    context.appendTo(node);
  });}
  function configureTransforms() {
    const subWindow = new Window({
      width: 250, height: 400,
      parent: node, frame: true, frameButtons: [],
      title: 'Choose the transforms to be used'
    });
    return tfSelector.selectTransform(subWindow.contentNode())
    .then(transforms => {
      subWindow.close();
      if (transforms) {
        panels.transform.updateTransforms(transforms);
        panels.routine.updateTransforms(transforms);
      }
    });
  }
  function respondChild(message, details = {}) {
    if (message === 'context'  ) {return contextMenu(details);}
    if (message === 'load-file') {return callParent(message, details);}
    if (message === 'save-file') {return callParent(message, details);}
    if (message === 'save-json') {return callParent(message, details);}
    if (message === 'capture'  ) {return callParent(message, details);}
    if (message === 'configure-transforms') {return configureTransforms();}
    if (message === 'full-window') {return createFullWindow(details.title);}
    if (message === 'get-data' ) {return startDataSelect()}
    if (message === 'add-data') {
      panels.transform.addToTree(details.dataHandler, false);
      return Promise.resolve(null);
    }
    if (message === 'arguments') {return selectArguments(
      details.windowTitle || 'Select Arguments',
      details.transform, node, startDataSelect
    );}
    if (message === 'properties') {
      panels.properties.openProperties(details.pObjs);
      return Promise.resolve(null);
    }
    if (message === 'transferData') {
      let temp = transferData;
      transferData = details.transferData;
      return Promise.resolve(temp);
    }
    return Promise.reject(new Error('Invalid message to parent'));
  }
  function startDataSelect() {
    panelManager.focusPanel(panels.transform);
    return panels.transform.startDataSelect()
    .then((data) => {panelManager.focusPanel(); return data;});
  }
  //TODO: change how this function creates the full window, probably need to
  //revisit the code window.js to make it more functional and encapsulated
  function createFullWindow(title) {return new Promise((resolve, reject) => {
    if (!panelManager.node().parentElement) {
      return reject('Already have a full window open');
    }
    const {wNode, wContents} = Window.createFullWindow(title);
    panelManager.node().remove();
    node.appendChild(wNode);
    resolve({node: wContents, stop: function() {
      wNode.remove();
      panelManager.appendTo(node);
    }});
  });}


  //Initialize object
  (function () {
    mode.addCheckListener(newMode => {
      if (!mode.isMode(newMode)) {return false;}
      return mode.is(Mode.prototype.NORMAL) || newMode === Mode.prototype.NORMAL;
    });
    mode.addChangeListener(modeChange);

    //create container and append objects elements to it
    panelManager.addPanels(
      //PanelContainer[0]
      [
        //PanelHolder[0]
        panels.transform,
        //PanelHolder[1]
        [panels.properties, panels.routine]
      ],
      //PanelContainer[1]
      panels.chart
    );
    panels.chart.resize();

    for (let key in panels) {
      if (panels[key].onCallParent) {
        panels[key].onCallParent(respondChild);
      }
    }
  }).call(this);
}