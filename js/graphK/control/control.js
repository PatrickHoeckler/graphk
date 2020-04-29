"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

graphK.Control = function() {
  //Constants
  const tfPanel = new graphK.TransformPanel();
  const rtPanel = new graphK.RoutinePanel();
  const subWindow = new graphK.Window();
  const navTree = new graphK.NavTree();
  //Public Attributes

  //Private Properties
  var mode, mainNode;
  var node, wrapper, resizer;
  var getArguments;
  var mouseOverElem;

  //Public Methods
  this.node = () => node;
  this.setModeObj = function (modeObj) {
    tfPanel.setModeObj(mode = modeObj);
    rtPanel.setModeObj(modeObj);
  }
  this.setMainNode = (node) => mainNode = node;
  this.updateTransforms = function (newTransforms) {
    tfPanel.updateTransforms(newTransforms);
    navTree.clear();
    for (let f of newTransforms.value) {navTree.addFolder(f);}
  }
  this.onGetArguments = function (callback) {
    if (typeof(callback) !== 'function') {throw new TypeError(
      `The 'callback' argument needs to be of type Function. Got type ${typeof(callback)}`
    );}
    getArguments = callback;
    tfPanel.onGetArguments(callback);
  }
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
  function getStep(option, target, callback) {
    if (option === 'transform') {
      let {right, bottom} = target.getBoundingClientRect();
      subWindow.openIn(mainNode, 200, 200, {left: right, bottom: bottom});
      navTree.node().addEventListener('dblclick', function dblClickHandler(e) {
        let elem = navTree.getContainingElement(e.target);
        if (!elem || !elem.classList.contains('leaf')) {return;}
        let path = navTree.findPath(e.target);
        let transform = tfPanel.getTransformFromPath(path);
        getArguments(transform.args, (args) => {
          callback({func: transform.func, args: args});
        });
        subWindow.close();
        navTree.node().removeEventListener('dblclick', dblClickHandler);
      });
    }
    else if (option === 'select') {
      return null;
    }
    else {callback(null);}
  }
  function getData(callback) {
    tfPanel.startDataSelect(function (name, path, canceled) {
      mode.change(graphK.mode.NORMAL);
      let data = canceled ? null : tfPanel.getDataFromPath(path);
      data = data && data.value ? data.value : null;
      callback(data);
    });
  }

  //Initialize object
  (function() {
    mouseOverElem = null;
    //  Creating control elements
    node = graphK.appendNewElement(null, 'div', 'chart-control');
    wrapper = graphK.appendNewElement(node, 'div', 'wrapper');
    resizer = graphK.appendNewElement(node, 'div', 'width-resizer');
    resizer.addEventListener('mousedown', handleResize);
    let selector = graphK.appendNewElement(null, 'div', 'routine-transforms');
    selector.appendChild(navTree.node());
    subWindow.appendContent(selector);
    
    let panels = [
      {name: 'DADOS', element: tfPanel.node()},
      {name: 'ROTINAS', element: rtPanel.node()},
      //{name: 'TESTE', element: document.createElement('div')}
    ]
    for (let i = 0; i < panels.length; i++) {
      let panelContainer = graphK.appendNewElement(wrapper, 'div', 'panel');
      let panelBar = graphK.appendNewElement(panelContainer, 'div', 'panel-bar');
      let panelBody = graphK.appendNewElement(panelContainer, 'div', 'panel-body');
      graphK.appendNewElement(panelBar, 'span', 'panel-bar-indicator');
      let panelName = graphK.appendNewElement(panelBar, 'span', 'panel-bar-name');
      panelName.innerHTML = panels[i].name;
      panelBody.appendChild(panels[i].element);
      panelBar.addEventListener('click', () => panelContainer.classList.toggle('collapsed'));
    }

    rtPanel.onGetStep(getStep);
    rtPanel.onGetData(getData);
    rtPanel.onSaveData(data => tfPanel.addToTree('Routine', data, true));

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