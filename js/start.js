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
// - Por enquanto não existe a possibilidade de escolher quais transformações usar, ele vai
//   mostrar tudo que está na pasta transformations. A função usada já consegue filtrar os
//   arquivos dado uma máscara, mas não foi implementado um meio de criá-la por meio da
//   seleção dos nomes dos arquivos.

//Modules
const d3 = require('d3');
const fs = require('fs');
const path = require('path');
const {ipcRenderer} = require('electron');

var graphKcontainer;

//===DEBUG===
var t1, t2;
//===========

(function() { //Self executing function to isolate scope

window.onload = function() {
  graphKcontainer = new graphK.Container();
  graphKcontainer.onGetArguments(getArguments);
  graphKcontainer.onSave((name, value) => ipcRenderer.send('save:file', name, value));
  document.body.appendChild(graphKcontainer.node());
  
  ipcRenderer.invoke('transformations:names').then(function(tfFiles) {
    let checkMask = false;
    let transforms = {name: '.', value: []};
    //defining a self executing function to load all
    //transformations into the transforms object
    (function loadTransforms(transfFolder, folderPath, mask, saveTo) {
      for (let i = 0; i < transfFolder.length; i++) {
        //if the element corresponds to a directory (is a object containing a value key)
        if (transfFolder[i].value !== undefined) {
          //if the mask needs to be checked and if mask is false ignores the directory
          if (checkMask && !mask[i][0]) continue;
          let newFolder = [];
          saveTo.push({name: transfFolder[i].name, value: newFolder, type: 'dir'});
          let nextPath = path.join(folderPath, transfFolder[i].name);
          loadTransforms(
            transfFolder[i].value, nextPath,
            !checkMask ? null : mask[i].slice(1),
            newFolder
          );
        }
        //if the element corresponds to a file
        else {
          //if the mask needs to be checked and if mask is false ignores the file
          if (checkMask && !mask[i]) continue;
          let transformPath = '.\\' + path.join(folderPath, transfFolder[i].name);
          let imports = require(transformPath);
          if (Array.isArray(imports.pkg)) {
            let pkgName = imports.pkgName ? imports.pkgName : path.parse(transformPath).name;
            let newFolder = [];
            saveTo.push({name: pkgName, value: newFolder, type: 'pkg'});
            for (let tf of imports.pkg) {newFolder.push(tf);}
          }
          else {saveTo.push(imports);}
        }
      }
    })(tfFiles.value, '../transformations', null, transforms.value)
    graphKcontainer.setTransforms(transforms);
  });
}

window.onresize = () => graphKcontainer.resize();
ipcRenderer.on('file:add', (e, fileNames) => graphKcontainer.readFiles(fileNames));

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
    graphKcontainer.startDataSelect((name, path, canceled) => {
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

var keyPressed;
window.addEventListener('keydown', function (e) {
  if (keyPressed) return;
  keyPressed = true;
  if (e.keyCode === 16) { //Shift
    graphKcontainer.changeMode(graphK.mode.DELETE);
  }
});
window.addEventListener('keyup', function (e) {
  keyPressed = false;
  if (e.keyCode === 16) { //Shift
    graphKcontainer.changeMode(graphK.mode.NORMAL);
  }
  else if (e.keyCode === 27) { //Escape
    //cancels selection if in middle of selecting
    if (graphKcontainer.mode() === graphK.mode.SELECT) {
      graphKcontainer.stopDataSelect(true);
    }
    //stops brushing if brush mode is enabled
    else if (graphKcontainer.brushEnabled) {
      graphKcontainer.setBrush(false);
    }
  }
});

////////////////////////////DEBUG////////////////////////////
window.addEventListener('keydown', function debugPause(e) {
  if (e.key === 'F7') {
    console.log('Pause');
  }
});
/////////////////////////////////////////////////////////////

})(); //End of self executing function