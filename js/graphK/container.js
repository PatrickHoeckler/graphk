"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
// - Checar se não tem alternativas melhores para detectar o modo de funcionamento
//   sendo usado. O uso da variável 'mode' parece meio esquisito. Talvez pudesse ser
//   criado um objeto 'state' que é compartilhado entre esse objeto e seus filhos.
// - Mudar os nomes desses objetos, tá tudo muito confuso, o principal se chama
//   container. Tem também chartArea que contém chart. Bem esquisito, arrumar isso.
//

graphK.Container = function() {
  //constants
  const toolbarIcons = [
    {name: 'icon-plus', tooltip: 'Adiciona um arquivo de dados vazio.\nArraste um arquivo aqui para criar uma cópia dos dados'},
    {name: 'icon-document', tooltip: 'Abrir arquivo'},
    {name: 'icon-save', tooltip: 'Arraste um arquivo aqui para salvá-lo'},
    {name: 'icon-screen', tooltip: 'Adiciona um novo gráfico'},
    {name: 'icon-square-corners', tooltip: 'Seleciona região de dados no gráfico'},
    {name: 'icon-aqua-vitae', tooltip: 'Configurar transformações'}
  ]
  const modeClass = [
    ''      ,  //graphK.mode.NORMAL
    'select',  //graphK.mode.SELECT
    'rename',  //graphK.mode.RENAME
    'delete',  //graphK.mode.DELETE
    'brush' ,  //graphK.mode.BRUSH
    'drag'     //graphK.mode.DRAG
  ]
  const control = new graphK.Control();
  const chart = new graphK.ChartArea();
  const toolbar = new graphK.Toolbar(toolbarIcons);
  const mode = new graphK.Mode(graphK.mode.NORMAL);
  const subWindow = new graphK.Window();
  const tfSelector = new graphK.TransformSelector();

  //Public Attributes

  //Private Properties
  var node, container, wrapper;
  var brushEnabled;
  var saveCallback;

  //Public Methods
  this.node = () => node;
  this.mode = () => mode.mode();
  this.brushEnabled = () => brushEnabled;
  this.changeMode = newMode => mode.change(newMode);
  this.resize = () => chart.resize();
  //  Indirect calls to control object
  this.addToTree = control.addToTree;
  this.renameFile = control.renameFile;
  this.onGetArguments = control.onGetArguments;
  this.deleteFromTree = control.deleteFromTree;
  this.getDataFromPath = control.getDataFromPath;
  //this.updateTransforms = control.updateTransforms;
  this.setTransforms = function (transforms) {
    tfSelector.updateTransforms(transforms);
    control.updateTransforms(transforms);
  };
  this.getTransformFromPath = control.getTransformFromPath;
  this.getDataFromTreeElement = control.getDataFromTreeElement;
  this.readFiles = (paths) => paths.forEach(p => control.readFile(p));
  this.newRoutine = control.newRoutine;
  this.renameRoutine = control.renameRoutine;
  this.removeInRoutine = control.removeInRoutine;
  this.addToRoutine = control.addToRoutine;
  //  Indirect calls to chartArea object
  this.getDataFromBrush = chart.getDataFromBrush;
  this.removeChart = chart.removeChart;
  this.clearChart = chart.clearChart;
  //  Functions to set callbacks
  this.onSave = (callback) => saveCallback = callback;
  //  Functions to change mode of operation
  this.setBrush = setBrush;
  this.startDataSelect = control.startDataSelect;
  this.stopDataSelect = control.stopDataSelect;

  //Private Functions
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
  //Listener to be executed when the mode is about to change
  function modeChange(newMode) {
    node.classList.value = 'graphK';
    if (newMode !== graphK.mode.NORMAL) { //changing from NORMAL to other
      node.classList.add(modeClass[newMode]);
      if (newMode === graphK.mode.SELECT) {
        toolbar.node().classList.add('inactive');
        chart.node().classList.add('inactive', 'overlay');
      }
    }
    else { //changing back to normal
      if (mode.mode() === graphK.mode.SELECT) {
        toolbar.node().classList.remove('inactive');
        chart.node().classList.remove('inactive', 'overlay');
      }
    }
  }
  function createContextMenu(event, place, detail) {
    let items = graphK.getContextItems(place, detail);
    if (!items) {return;}
    let context = new graphK.Context(event.pageX, event.pageY, items, function(action) {
      context.destroy();
      executeContextAction(place, action, event.target);
    });
    context.appendTo(node);
  }
  function executeContextAction(place, action, target) {
    if (!action) {return;}
    if (place === 'chart') {
      if (action === 'select') {
        let data = chart.getDataFromBrush(target);
        if (!data) {return;}
        //third argument indicates that the rename box will be opened the
        //moment the file is created
        control.addToTree('selection', data, true);
        setBrush(false);
      }
      else if (action === 'remove') {chart.removeChart(target);}
      else if (action === 'clear') {chart.clearChart(target);}
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
        saveCallback(name, value);
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
  function configureTransforms() {
    let button = toolbar.node().getElementsByClassName('icon-aqua-vitae')[0];
    let {left, bottom} = button.getBoundingClientRect();
    if (!button.classList.contains('pressed')) {
      button.classList.add('pressed');
      button.style.position = 'relative';
      button.style.zIndex = '3141';
      subWindow.openIn(node, 200, 400, {left: left, top: bottom});
      tfSelector.onSelect((transforms) => {
        subWindow.close();
        button.classList.remove('pressed');
        button.style.position = '';
        button.style.zIndex = '';
        if (transforms) {control.updateTransforms(transforms);}
      });
    }
    else {tfSelector.cancelSelection();}
  }

  //Initialize object
  mode.addCheckListener(newMode => {
    if (!graphK.mode.isMode(newMode)) {return false;}
    return mode.mode() === graphK.mode.NORMAL || newMode === graphK.mode.NORMAL;
  });
  mode.addChangeListener(modeChange);
  control.setModeObj(mode);
  chart.setModeObj(mode);

  //  create container and append objects elements to it
  node = graphK.appendNewElement(null, 'section', 'graphK');
  container = graphK.appendNewElement(node, 'div', 'container');
  container.appendChild(toolbar.node());
  wrapper = graphK.appendNewElement(container, 'div', 'wrapper');
  wrapper.appendChild(control.node());
  wrapper.appendChild(chart.node());
  control.setMainNode(node);
  control.onContext(createContextMenu);
  chart.onContext(createContextMenu);
  subWindow.appendContent(tfSelector.node());

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
      if (e.target.classList.contains('pressed')) {control.stopDataSelect(true);}
      else {
        e.target.classList.add('pressed');
        control.startDataSelect((name, path, canceled) => {
          if (!canceled) {
            let value = control.getDataFromPath(path).value;
            name = name.split(':').pop();
            saveCallback(name, value);
            e.target.classList.remove('pressed');
          }
          else {e.target.classList.remove('pressed');}
        }, false);
      }
    }
    else if (e.target.classList.contains('icon-aqua-vitae')) {configureTransforms();} 
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
}