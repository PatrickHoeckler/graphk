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
// - Analisar a possibilidade de trocar todos ou alguns callbacks para Promises, deixando o
//   código mais simples.
// - Adicionar um jeito melhor de checar por erros, principalmente typeError. É difícil por
//   enquanto checar por vários tipos de uma só vez e dar throw quando encontra algum erro.
//   A função no arquivo 'graphK.js' chamada graphK.checkType() é uma opção que eu pensei
//   até o momento, mas ainda não é usada por nenhuma parte do programa. No futuro tentar
//   implementar algo do tipo para facilitar a detecção de erros. Por enquanto grande parte
//   das vezes eu estou assumindo que não vai ocorrer nenhum tipo de erro ou estou fazendo
//   uma checagem simples.
//

//Modules - all these are loaded and stored in the global object via the preload.js file
const {path, ipcRenderer} = preloadedModules;
const {GraphK, Mode} = require('../js/graphK/graphK.js')

//REMOVER ESSA VARIÁVEL DO ESCOPO GLOBAL NO FUTURO. SÓ DEIXEI AQUI PRA FACILITAR O DEBUG
var graphK;

(function() { //Self executing function to isolate scope

window.onload = function() {
  graphK = new GraphK();
  document.body.appendChild(graphK.node());
  //graphK.onSave((name, value) => ipcRenderer.send('save:file', name, value));
  graphK.onCallParent(function (message, details) {
    if (message === 'load-file') {return ipcRenderer.invoke('load:file');}
    if (message === 'save-file') {
      return ipcRenderer.invoke('save:file', details.name, details.value);
    }
  })
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
    graphK.setTransforms(transforms);
  });
}

window.onresize = () => graphK.resize();
ipcRenderer.on('file:add', (e, fileNames) => graphK.readFiles(fileNames));


var keyPressed;
window.addEventListener('keydown', function (e) {
  if (keyPressed) return;
  keyPressed = true;
  if (e.keyCode === 16) { //Shift
    graphK.changeMode(Mode.prototype.DELETE);
  }
});
window.addEventListener('keyup', function (e) {
  keyPressed = false;
  if (e.keyCode === 16) { //Shift
    graphK.changeMode(Mode.prototype.NORMAL);
  }
  else if (e.keyCode === 27) { //Escape
    //cancels selection if in middle of selecting
    if (graphK.mode() === Mode.prototype.SELECT) {
      graphK.stopDataSelect(true);
    }
    //stops brushing if brush mode is enabled
    else if (graphK.brushEnabled) {
      graphK.setBrush(false);
    }
  }
});

})(); //End of self executing function