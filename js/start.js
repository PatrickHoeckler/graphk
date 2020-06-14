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
// - Adicionar um jeito melhor de checar por erros, principalmente typeError. É difícil por
//   enquanto checar por vários tipos de uma só vez e dar throw quando encontra algum erro.
//   A função no arquivo 'graphK.js' chamada graphK.checkType() é uma opção que eu pensei
//   até o momento, mas ainda não é usada por nenhuma parte do programa. No futuro tentar
//   implementar algo do tipo para facilitar a detecção de erros. Por enquanto grande parte
//   das vezes eu estou assumindo que não vai ocorrer nenhum tipo de erro ou estou fazendo
//   uma checagem simples.
//

//FIXME: this variable is only in the global scope for debug purposes. Remove on release
var graphK;

//Wraps everything in this self-executing function to protect scope
(function() {

//Needs to wait for the preload to load the necessary modules
let id = setInterval(function() {
  if (!preloadedModules) {return;}
  clearInterval(id);
  startProgram();
}, 10);

function startProgram() {
  const {
    GraphK, Mode, path,
    loadFile, saveFile, getTransformsFiles, onFileAdd, captureImage
  } = preloadedModules;
  preloadedModules = null;

  graphK = new GraphK();
  graphK.appendTo(document.body);
  window.onresize = () => graphK.resize();
  onFileAdd((e, fileNames) => graphK.readFiles(fileNames));

  graphK.onCallParent(function (message, details) {
    if (message === 'load-file') {return loadFile();}
    if (message === 'save-file') {return saveFile(details.data);}
    if (message === 'capture') {
      captureImage(details.target.getBoundingClientRect());
      return Promise.resolve(null);
    }
    return Promise.reject(new Error('Invalid message to parent'));
  });
  getTransformsFiles().then(loadTransforms).then(graphK.setTransforms);


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
    }
  });

  function loadTransforms(tfFiles) { return new Promise(resolve => {
    let transforms = {name: '.', value: []};
    (function loadDir(transfFolder, folderPath, saveTo) {
      let importPromises = [];
      for (let i = 0; i < transfFolder.length; i++) {
        //if the element corresponds to a directory (is a object containing a value key)
        if (transfFolder[i].value !== undefined) {
          let newFolder = [];
          saveTo.push({name: transfFolder[i].name, value: newFolder, type: 'dir'});
          let nextPath = path.join(folderPath, transfFolder[i].name);
          //loadDir(transfFolder[i].value, nextPath, newFolder);
          importPromises.push(loadDir(transfFolder[i].value, nextPath, newFolder));
        }
        else { //if the element corresponds to a file
          let transformPath = '.\\' + path.join(folderPath, transfFolder[i].name);
          transformPath = transformPath.replace(/\\/g, '/');
          let impPromise = import(transformPath);
          impPromise.then(module => {
            if (Array.isArray(module.pkg)) {
              let pkgName = module.pkgName ? module.pkgName : path.parse(transformPath).name;
              let newFolder = [];
              saveTo.push({name: pkgName, value: newFolder, type: 'pkg'});
              for (let tf of module.pkg) {newFolder.push(tf);}
            }
            else {saveTo.push(module);}
          });
          importPromises.push(impPromise);
        }
      }
      return Promise.all(importPromises);
    })(tfFiles.value, '../transformations', transforms.value)
    .then(() => resolve(transforms));
  });}

}})();