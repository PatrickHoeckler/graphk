"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
// - O programa precisa aceitar mais formatos: tem que ler e salvar em JSON pelo menos.
//   Tem que salvar em JSON um conjunto de dados que não necessariamente é um array, mas
//   um objeto contendo diversos tipos de dados. Por exemplo suponha uma curva qualquer
//   e um conjunto de dados sobre essa curva:
//      data = {
//        mean, rms, maxValue, minValue, etc
//      }
//   É preciso ter um jeito de criar uma transformação que calcula e retorna esse tipo de
//   dados, e também é preciso um jeito de salvá-los e carregá-los no futuro (JSON é a
//   melhor opção que eu vejo no momento).
//

//Modules
const d3 = require('d3');
const fs = require('fs');
const path = require('path');
const electron = require('electron');
const {ipcRenderer} = electron;

var graphKcontainer;

//===DEBUG===
var t1, t2;
//===========

(function() {
  var chartSpace;
  window.onload = function() {
    graphKcontainer = new graphK.Container();
    graphKcontainer.onGetArguments(getArguments);
    graphKcontainer.onContext(createContextMenu);
    chartSpace = document.getElementById("chart-space");
    chartSpace.appendChild(graphKcontainer.node());
    ipcRenderer.send('transformations:names', 'all');
  }

  window.onresize = () => graphKcontainer.resize();
  ipcRenderer.on('file:add', (e, fileNames) => graphKcontainer.readFiles(fileNames));
  ipcRenderer.on('transformations:values', () => {
    let transforms = electron.remote.getGlobal('graphK').transforms;
    graphKcontainer.updateTransforms(transforms);
  })

  function getArguments(argsFormat, calculateTransform) {
    //if no arguments needed, just calls the callback to calculate transform
    if (!argsFormat) {
      calculateTransform();
      return;
    }
    //send request for arguments of given format to main process
    ipcRenderer.send('arguments:input', argsFormat);
    //catches requests for data selection
    ipcRenderer.on('arguments:select', () => {
      graphKcontainer.selectMode((name, path, canceled) => {
        //path is given as an array. The window that takes the arguments only accepts
        //values as string, so we stringify the array. Later we parse the values back
        path = JSON.stringify(path);
        ipcRenderer.send('arguments:selected', name, path, canceled);
      });
    })
    //once the argument request has been answered
    ipcRenderer.once('arguments:values', (e, success, args) => {
      ipcRenderer.removeAllListeners('arguments:select');
      if (!success) {return;}
      for (let i = 0; i < argsFormat.length; i++) {
        let {name, type} = argsFormat[i];
        if (type === 'data') {
          //in this situation args[name] holds the path to the data on the navTree,
          //we need to get the data using this path. First we parse the values of
          //the path back from the stringify operation made before.
          let path = JSON.parse(args[name]);
          //Now we use the path to get the data. Since we are only interested in
          //the (x,y) points of the curve, we just get the key 'value'.
          args[name] = graphKcontainer.getDataFromPath(path).value;
        }
      }
      calculateTransform(args);
    });
  }
  function createContextMenu(event, place, detail) {
    let items = getContextItems(place, detail);
    if (!items) {return;}
    let overlay = document.createElement('div');
    overlay.classList.add('context-overlay');
    let context = new ContextMenu(event.pageX, event.pageY, items, function(action) {
      removeContextMenu();
      executeContextAction(place, action, event.target);
    });
    chartSpace.appendChild(overlay);
    context.appendTo(chartSpace);
    overlay.addEventListener('mousedown', removeContextMenu);
    window.addEventListener('blur' , removeContextMenu);
    function removeContextMenu() {
      overlay.remove();
      context.destroy();
      window.removeEventListener('blur' , removeContextMenu);
    }
  }

  function executeContextAction(place, action, target) {
    if (place === 'chart') {
      if (action === 'copy') {
        let data = graphKcontainer.getDataFromBrush(target);
        if (!data) {return;}
        //third argument indicates that the rename box will be opened the
        //moment the file is created
        graphKcontainer.addToTree('selection', data, true);
        graphKcontainer.setBrush(false);
      }
      else if (action === 'remove') {graphKcontainer.removeChart(target);}
      else if (action === 'clear') {graphKcontainer.clearChart(target);}
    }
    else if (place === 'navTree') {
      if (action === 'copy') {
        let {name, value} = graphKcontainer.getDataFromTreeElement(target);
        graphKcontainer.addToTree(name, value, true);
      }
      if (action === 'rename') {graphKcontainer.renameFile(target);}
      else if (action === 'remove') {graphKcontainer.deleteFromTree(target);}
      else if (action === 'save') {
        let {name, value} = graphKcontainer.getDataFromTreeElement(target);
        if (!value) {return;}
        ipcRenderer.send('save:file', name, value);
      }
    }
  }
  function getContextItems(place, detail) {
    if (place === 'navTree') {
      //There are six possibilities for detail:
      //folder, folder:top, folder:empty
      //leaf, leaf:ready, leaf:broken
      if (
        detail === 'folder' ||
        detail === 'leaf:broken' ||
        detail === 'leaf'
      ) {return null;}
      let [where, state] = detail.split(':');
      return [
        {name: 'Copy to New', return: 'copy', type: state === 'empty' ? 'inactive' : undefined},
        {name: 'Rename', return: 'rename', type: where === 'leaf' ? 'inactive' : undefined},
        {name: 'Save',   return: 'save', type: state === 'empty' ? 'inactive' : undefined},
        {name: 'Remove', return: 'remove'},
      ];
    }
    else if (place === 'chart') {
      return [
        {name: 'Copy Region', return: 'copy', type: detail !== 'brush' ? 'inactive' : undefined},
        {type: 'separator'},
        {name: 'Remove', return: 'remove'},
        {name: 'Clear', return: 'clear'}
      ]
    }
    else {return null;}
  }
})();