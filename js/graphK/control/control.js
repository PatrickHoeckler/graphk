"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

graphK.Control = function() {
  //Constants
  //const filenameRegExp = new RegExp('^[^\\\\/?<>:|\\"*^]{1,128}$');
  const filenameRegExp = /^[^\\/?<>:|\"*^]{1,128}$/;
  //Public Attributes

  //Private Properties
  var node, wrapper, resizer;
  var tfBox;

  //Public Methods
  this.node = () => node;
  //  indirect calls to tfBox object
  this.getDataFromPath = (path) => tfBox.getDataFromPath(path);
  this.getDataFromTreeElement = (treeElem) => tfBox.getDataFromTreeElement(treeElem);
  this.addToTree = (name, value, openRenameBox) => tfBox.addToTree(name, value, openRenameBox);
  this.deleteFromTree = (treeElem) => tfBox.deleteFromTree(treeElem);
  this.selectFromTree = (callback) => tfBox.selectFromTree(callback);
  this.renameFile = (treeElem) => tfBox.renameFile(treeElem);;
  this.readFile = (filePath) => tfBox.readFile(filePath);
  this.updateTransforms = (transforms) => tfBox.updateTransforms(transforms);
  this.onGetArguments = (callback) => tfBox.onGetArguments(callback);
  this.onContext = function(callback) {
    tfBox.onContext(callback);
  }
  //  mode change functions
  this.getMode = () => tfBox.getMode();
  this.setMode = (newMode) => tfBox.setMode(newMode);
  this.canSetMode = (newMode) => tfBox.canSetMode(newMode);
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

  //Initialize object
  (function() {
    tfBox = new graphK.TransformBox();
    //  Creating control elements
    node = graphK.appendNewElement(null, 'div', 'chart-control');
    wrapper = graphK.appendNewElement(node, 'div', 'wrapper');
    resizer = graphK.appendNewElement(node, 'div', 'width-resizer');
    resizer.addEventListener('mousedown', handleResize);
    
    let panels = [
      {name: 'DADOS', element: tfBox.node()},
      {name: 'ROTINAS', element: document.createElement('div')},
      //{name: 'TESTE', element: document.createElement('div')}
    ]
    for (let i = 0; i < panels.length; i++) {
      let panelContainer = graphK.appendNewElement(wrapper, 'div', 'panel');
      let panelBar = graphK.appendNewElement(panelContainer, 'div', 'panel-bar');
      let panelBody = graphK.appendNewElement(panelContainer, 'div', 'panel-body');
      graphK.appendNewElement(panelBar, 'span', 'panel-bar-indicator');
      let panelName = graphK.appendNewElement(panelBar, 'span', 'panel-bar-name');
      panelName.innerHTML = panels[i].name;
      if (i === 0) {panelBody.appendChild([tfBox.node()][i]);}
      panelBar.addEventListener('click', () => panelContainer.classList.toggle('collapsed'));
    }
  })();

  //===DEBUG STUFF===
  this.getTransforms = () => tfBox.getTransforms();
  //=================
}