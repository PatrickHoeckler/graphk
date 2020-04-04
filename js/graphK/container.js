"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
// - Checar se não tem alternativas melhores para detectar o modo de funcionamento
//   sendo usado. O uso da variável 'mode' parece meio esquisito. Talvez pudesse ser
//   criado um objeto 'state' que é compartilhado entre esse objeto e seus filhos.
//

graphK.Container = function() {
  //constants
  const toolbarIcons = [
    {name: 'icon-plus', tooltip: 'Adiciona um arquivo de dados vazio.\nArraste um arquivo aqui para criar uma cópia dos dados'},
    {name: 'icon-document', tooltip: 'Abrir arquivo'},
    {name: 'icon-save', tooltip: 'Arraste um arquivo aqui para salvá-lo'},
    {name: 'icon-screen', tooltip: 'Adiciona um novo gráfico'},
    {name: 'icon-square-corners', tooltip: 'Seleciona região de dados no gráfico'}
  ]
  const modeClass = [
    ''      ,  //graphK.mode.NORMAL
    'select',  //graphK.mode.SELECT
    'rename',  //graphK.mode.RENAME
    'delete',  //graphK.mode.DELETE
    'brush' ,  //graphK.mode.BRUSH
    'drag'     //graphK.mode.DRAG
  ]
  //Public Attributes
  this._control;
  this._chart;

  //Private Properties
  var node, wrapper;
  var control, chart, toolbar;
  var brushEnabled;
  var keyPressed;
  var mode; //current mode of operation being used

  //Public Methods
  this.node = () => node;
  this.resize = () => chart.resize();
  //  Indirect calls to control object
  this.renameFile = (treeElem) => control.renameFile(treeElem);
  this.readFiles = (paths) => paths.forEach(p => control.readFile(p));
  this.updateTransforms = (transforms) => control.updateTransforms(transforms);
  this.getDataFromPath = (path) => control.getDataFromPath(path);
  this.getDataFromTreeElement = (treeElem) => control.getDataFromTreeElement(treeElem);
  this.deleteFromTree = (treeElem) => control.deleteFromTree(treeElem);
  this.addToTree = (name = '', value, openRenameBox = false) => control.addToTree(name, value, openRenameBox);
  //  Indirect calls to chartArea object
  this.getDataFromBrush = (brushElem) => chart.getDataFromBrush(brushElem);
  this.removeChart = (chartElem) => chart.removeChart(chartElem);
  this.clearChart = (chartElem) => chart.clearChart(chartElem);
  //  Functions to set callbacks
  this.onGetArguments = function(callback) {
    if (typeof(callback) !== 'function') {
      throw new TypeError(`The 'callback' argument needs to be of type Function. Got type ${typeof(callback)}`);
    }
    control.onGetArguments((argsFormat, calculateTransform) => {
      //if can't set mode to normal, then don't call the callback
      if (!setMode(graphK.mode.NORMAL)) {return;}
      callback(argsFormat, calculateTransform);
    });
  }
  this.onContext = function(callback) {
    //callback is a function of the form:
    //function callback(place, target), where:
    //  - event: the callback event data
    //  - place: string representing the part of graphK that the context was open (i.e. 'navTree', 'brush', etc.)
    if (typeof(callback) !== 'function') {
      throw new TypeError(`The 'callback' argument needs to be of type Function. Got type ${typeof(callback)}`);
    }
    control.onContext(callback);
    chart.onContext(callback);
  }
  //  Functions to change mode of operation
  this.setBrush = setBrush;
  this.selectMode = selectFromTree;
  this.deleteMode = () => setMode(graphK.mode.DELETE);
  this.normalMode = () => setMode(graphK.mode.NORMAL);

  //Private Functions
  function setMode(newMode) {
    if (mode === newMode) {return true;}
    if (!graphK.mode.isMode(newMode)) {return false;}
    if (!control.canSetMode(newMode) || !chart.canSetMode(newMode)) {return false;}
    node.classList.value = 'graphK';
    if (newMode !== graphK.mode.NORMAL) {node.classList.add(modeClass[newMode]);}
    chart.setMode(newMode);
    control.setMode(newMode);
    mode = newMode;
    return true;
  }
  function setBrush(enable) {
    enable = enable ? true : false;
    let button = toolbar.node().getElementsByClassName('icon-square-corners')[0];
    if (enable) {
      button.classList.add('pressed');
      toolbar.node().classList.add('inactive');
      control.node().classList.add('inactive', 'overlay');
    }
    else {
      button.classList.remove('pressed');
      toolbar.node().classList.remove('inactive');
      control.node().classList.remove('inactive', 'overlay');
    }
    brushEnabled = enable;
    chart.setBrush(enable);
  }
  function selectFromTree(callback) {
    if (typeof(callback) !== 'function') {
      throw new TypeError(`Expected a 'callback' function as argument. Got type ${typeof(callback)}`);
    }
    if (!setMode(graphK.mode.SELECT)) {return false;}
    toolbar.node().classList.add('inactive');
    chart.node().classList.add('inactive', 'overlay');
    control.selectFromTree((name, path, canceled) => {
      toolbar.node().classList.remove('inactive');
      chart.node().classList.remove('inactive', 'overlay');
      callback(name, path, canceled);
      control.selectFromTree(null); //removes the callback function
      setMode(graphK.mode.NORMAL);
    });
    return true;
  };

  //Initialize object
  mode = graphK.mode.NORMAL;
  //  create objects
  control = new graphK.Control();
  chart = new graphK.ChartArea();
  toolbar = new graphK.Toolbar(toolbarIcons);

  //  create container and append objects elements to it
  node = graphK.appendNewElement(null, 'section', 'graphK');
  node.appendChild(toolbar.node());
  wrapper = graphK.appendNewElement(node, 'div', 'wrapper');
  wrapper.appendChild(control.node());
  wrapper.appendChild(chart.node());

  //  adding event listeners
  //    mouse events
  toolbar.node().addEventListener('mouseover', (e) => {
    if (e.target.classList.contains('toolbar')) {return;}
    e.target.classList.add('highlight');
  });
  toolbar.node().addEventListener('mouseout', (e) => {
    if (e.target.classList.contains('toolbar')) {return;}
    e.target.classList.remove('highlight');
  });
  toolbar.node().addEventListener('click', (e) => {
    if (e.target.classList.contains('icon-document')) {ipcRenderer.send('open:file');}
    else if (e.target.classList.contains('icon-plus')) {control.addToTree('empty');}
    else if (e.target.classList.contains('icon-screen')) {chart.addChart();}
    else if (e.target.classList.contains('icon-square-corners')) {setBrush(!brushEnabled);}
    else if (e.target.classList.contains('icon-save')) {
      if (e.target.classList.contains('pressed')) {
        setMode(graphK.mode.NORMAL);
        e.target.classList.remove('pressed');
        return;
      }
      e.target.classList.add('pressed');
      selectFromTree((name, path, canceled) => {
        e.target.classList.remove('pressed');
        if (canceled) {return;}
        let value = control.getDataFromPath(path).value;
        name = name.split(':').pop();
        ipcRenderer.send('save:file', name, value);
      });
    }
  });
  //    Drag and drop events
  toolbar.node().addEventListener('dragover', (e) => {
    if (
      e.target.classList.contains('icon-save') || 
      e.target.classList.contains('icon-plus')
    ) {
      e.target.style.backgroundColor = 'green';
      e.preventDefault();
    }
  });
  toolbar.node().addEventListener('dragleave', (e) => {
    e.target.style.backgroundColor = '';
  });
  toolbar.node().addEventListener('drop', (e) => {
    e.target.style.backgroundColor = '';
    let {name, value} = JSON.parse(e.dataTransfer.getData('text'));
    if (e.target.classList.contains('icon-save')) {
      ipcRenderer.send('save:file', name, value);
    }
    else if (e.target.classList.contains('icon-plus')) {
      control.addToTree(name, value, true);
    }
  })
  wrapper.addEventListener('dragstart', (e) => {
    if (!setMode(graphK.mode.DRAG)) {
      e.preventDefault();
      return;
    }
  }, true);
  wrapper.addEventListener('dragend', () => setMode(graphK.mode.NORMAL));

  window.onkeydown = function (e) {
    if (keyPressed) return;
    keyPressed = true;
    if (e.keyCode === 16) {setMode(graphK.mode.DELETE);} //Shift
    //else if (e.keyCode === 17) { //Ctrl
    //  console.log('Ctrl - DOWN');
    //}
    //else if (e.keyCode === 18) { //Alt
    //  e.preventDefault();
    //  console.log('Alt - DOWN');
    //}
    //else if (e.keyCode === 27) { //Escape
    //}
  }
  window.onkeyup = function (e) {
    keyPressed = false;
    if (e.keyCode === 16) {setMode(graphK.mode.NORMAL);} //Shift
    //else if (e.keyCode === 17) { //Ctrl
    //  console.log('Ctrl - UP');
    //}
    //else if (e.keyCode === 18) { //Alt
    //  e.preventDefault();
    //  console.log('Alt - UP');
    //}
    else if (e.keyCode === 27) { //Escape
      //changes control mode to normal if in select mode
      if (mode === graphK.mode.SELECT) {setMode(graphK.mode.NORMAL);}
      //stops brushing if brush mode is enabled
      else if (brushEnabled) {setBrush(false);}
    }
  }

  
  //===DEBUG STUFF===
  this._control = control;
  this._chart = chart;
  this.getTransforms = () => control.getTransforms();
  //=================
}