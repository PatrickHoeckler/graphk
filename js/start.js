"use strict";

//FIXME: this variable is only in the global scope for debug purposes. Remove on release
var graphK;

//Wraps everything in this self-executing function to protect scope
(function() {

//Needs to wait for the preload to load the necessary modules
let id = setInterval(function() {
  if (!preloaded) {return;}
  clearInterval(id);
  startProgram();
}, 10);

function startProgram() {
  const {
    GraphK, path, loadFile, saveFile, saveString,
    getTransformsFiles, onFileAdd, onPanelMenuClick,
    captureImage, calcSHA256
  } = preloaded;
  preloaded = null;

  graphK = new GraphK();
  graphK.appendTo(document.body);
  window.onresize = waitForEndResize(graphK.resize, 200);
  onFileAdd((e, fileNames) => graphK.readFiles(fileNames));
  onPanelMenuClick(
    (e, panelName, checked) => graphK.togglePanel(panelName, checked)
  );

  graphK.onCallParent(function (message, details) {
    if (message === 'load-file') {return loadFile(details.filters);}
    if (message === 'save-file') {return saveFile(details.data);}
    if (message === 'save-json') {return saveString(
      {name: details.name, string: details.json}, ['json']
    );}
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
    if (e.key === 'Shift') {
      graphK.changeMode(GraphK.Mode.prototype.DELETE);
    }
  });
  window.addEventListener('keyup', function (e) {
    keyPressed = false;
    if (e.key === 'Shift') {
      graphK.changeMode(GraphK.Mode.prototype.NORMAL);
    }
    else if (e.key === 'Escape') {
      //cancels selection if in middle of selecting
      if (graphK.mode() === GraphK.Mode.prototype.SELECT) {
        graphK.stopDataSelect(true);
      }
    }
  });

  function loadTransforms(tfFiles) { return new Promise(resolve => {
    let transforms = GraphK.makeTransformDir('.');
    let errors = [];
    (function loadDir(transfFolder, folderPath, saveTo) {
      let importPromises = [];
      for (let i = 0; i < transfFolder.length; i++) {
        //if the element corresponds to a directory (is a object containing a value key)
        if (transfFolder[i].value) {
          let dir = GraphK.makeTransformDir(transfFolder[i].name);
          saveTo.push(dir);
          let nextPath = path.join(folderPath, transfFolder[i].name);
          importPromises.push(loadDir(transfFolder[i].value, nextPath, dir.contents));
        }
        else { //if the element corresponds to a file
          let transformPath = '.\\' + path.join(folderPath, transfFolder[i].name);
          let sha256 = calcSHA256(transformPath);
          if (!sha256) {errors.push({name: transformPath, error: 'hash'}); continue;}
          transformPath = transformPath.replace(/\\/g, '/');
          let impPromise = import(transformPath)
          .then(module => {
            let tf = GraphK.makeTransform(module, sha256);
            if (tf && !Array.isArray(tf)) {saveTo.push(tf);}
            else {errors.push({name: transformPath, error:tf});}
          }).catch(error => errors.push({name: transformPath, error}))
          importPromises.push(impPromise);
        }
      }
      return Promise.all(importPromises);
    })(tfFiles.value, '../transformations', transforms.contents)
    .then(() => {
      if (errors.length) {
        alert('Error opening some files');
      }
      resolve(transforms)
    });
  });}
}

function waitForEndResize(callback, ms) {
  var t0, intervalID = 0;
  return function() {
    t0 = Date.now();
    if (intervalID) {return;}
    intervalID = setInterval(function() {
      if (Date.now() - t0 < 200) {return;}
      clearInterval(intervalID);
      intervalID = 0;
      callback();
    }, ms);
  }
}

})();