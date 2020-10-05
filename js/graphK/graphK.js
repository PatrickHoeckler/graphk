"use strict";

//TODO: mudar o type 'no-plot' para 'static' no butterworth e consertar todas as referencias
//incorretas a 'no-plot' no código. Pois a transformação activTime.js também é 'no-plot' mas
//ela precisa de dados

const {Mode} = require('./auxiliar/mode.js');
module.exports = {GraphK, Mode};

const {appendNewElement, defaultCallParent} = require('./auxiliar/auxiliar.js');
const {Window} = require('./auxiliar/window.js');
const {Context} = require('./auxiliar/context.js');
const {NavTree} = require('./auxiliar/navTree.js');
const {TransformSelector} = require('./auxiliar/transformSelector.js');
const {ArgsSelector} = require('./auxiliar/argsSelector.js');
const {ChartPanel} = require('./Panels/chartPanel/chartPanel.js');
const {RoutinePanel} = require('./Panels/routinePanel/routinePanel.js');
const {TransformPanel} = require('./Panels/transformPanel/transformPanel.js');
const {PropertiesPanel} = require('./Panels/propertiesPanel/propertiesPanel.js');
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
    chart: new ChartPanel(mode),
    properties: new PropertiesPanel()
  };
  //dictionary indexed by the transform file sha256 hash
  const transformDict = {};

  //Private Properties
  var callParent = defaultCallParent;
  var mouseOverElem = null;
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
    const validType = ['normal', 'no-plot', 'scatter', 'static'];
    //This function bellow indexes each transform file to the transformDict
    //object using the file hash as a key. It also adds default values if
    //some property was not set in the module file (i.e. the 'type' property
    //default is 'normal')
    (function checkTransforms(tfFolder) {
      for (let tfFile of tfFolder) {
        if (tfFile.value) { //if tfFile is also a folder
          checkTransforms(tfFile.value);
          if (tfFile.type === 'pkg') {
            tfFile.value.forEach(tf => tf.pkg = tfFile);
          }
        }
        else { //if tfFile is a transformation file
          if (!validType.includes(tfFile.type)) {tfFile.type = 'normal';}
        }
        //must add to the dictionary outside the if/else statement above
        //because if the tfFile is of type pkg, then it is considered a 
        //folder, but it is a single file with a single hash, containing
        //multiple transforms.
        if (tfFile.hash) {transformDict[tfFile.hash] = tfFile;}
      }
    })(transforms.value);
    tfSelector.updateTransforms(transforms);
    panels.transform.updateTransforms(transforms);
    panels.routine.updateTransforms(transforms, transformDict);
    navTree.clear();
    for (let f of transforms.value) {navTree.addToTree(f);}
  };
  this.getTransformFromPath = panels.transform.getTransformFromPath;
  this.getDataFromPath = panels.transform.getDataFromPath;
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
        panels.routine.updateTransforms(transforms);
        navTree.clear();
        for (let f of transforms.value) {navTree.addToTree(f);}
      }
      resolve(transforms);
    });
  });}
  function respondChild(message, details = {}) {
    if (message === 'context'  ) {return contextMenu(details);}
    if (message === 'load-file') {return callParent(message, details);}
    if (message === 'save-file') {return callParent(message, details);}
    if (message === 'save-json') {return callParent(message, details);}
    if (message === 'capture'  ) {return callParent(message, details);}
    if (message === 'configure-transforms') {return configureTransforms();}
    if (message === 'full-window') {return createFullWindow(details.title);}
    if (message === 'transform') {return selectTransform(details.x, details.y);}
    if (message === 'get-data' ) {return panels.transform.startDataSelect();}
    if (message === 'add-data') {
      panels.transform.addToTree(details.dataHandler, false);
      return Promise.resolve(null);
    }
    if (message === 'select-range') {
      return Promise.reject(new Error(null));
    }
    if (message === 'arguments') {
      return getArguments(details.argsFormat, details.windowTitle);
    }
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
  function selectTransform(x, y) { return new Promise((resolve) => {
    mode.lock();
    const tfWindow = new Window({
      width: 250, height: 400, x: x, y: y,
      parent: node, content: navTree.node().parentElement,
      frame: true, title: 'Select transform', frameButtons: ['close']
    });
    function selected(event) {
      mode.unlock();
      let elem = navTree.getContainingElement(event.target);
      if (!elem || !elem.classList.contains('leaf-node')) {return;}
      elem.classList.remove('highlight');
      tfWindow.hide();
      let path = navTree.findPath(elem);
      //Selecting transform arguments if any
      let transform = panels.transform.getTransformFromPath(path);
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
      mode.unlock();
    });
  });}
  function getArguments(argsFormat, title = 'Select Parameters') {
  return new Promise((resolve) => {
    if (!argsFormat) {return resolve({args: {}});}
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
            //Now we use the path to get the data, we are only interested in
            //the (x,y) points of the curve.
            let dataHandler = panels.transform.getDataFromPath(path);
            args[name] = dataHandler.isHierarchy ? 
              dataHandler.getLevel(0).data : dataHandler.value;
          }
        }
        resolve({args});
      }
    });
  });}
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

    //Adding Event Listeners
    navTree.node().addEventListener('mouseover', function ({target}) {
      if (mouseOverElem) {mouseOverElem.classList.remove('highlight');}
      mouseOverElem = navTree.getContainingElement(target);
      if (mouseOverElem) {mouseOverElem.classList.add('highlight');}
    });
    navTree.node().addEventListener('mouseout', function (e) {
      if (mouseOverElem) {mouseOverElem.classList.remove('highlight');}
      mouseOverElem = null;
    });
    navTree.node().addEventListener('click', (e) => navTree.toggleFolder(e.target));
  }).call(this);
}