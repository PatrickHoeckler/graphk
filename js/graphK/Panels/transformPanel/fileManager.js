"use strict";

module.exports = {FileManager};
const d3 = require('d3');
const fs = require('fs');
const {extname, basename} = require('path');
const {DataHandler} = require('../../auxiliar/dataHandler.js');

function FileManager() {
  //Constants
  const observer = new MutationObserver(reverseMaliciousChanges);
  const files = [];
  //Public Attributes

  //Private Properties
  var transforms;
  var maliciousFunction; //indicates if transformation is a malicious file

  //Public Methods
  this.getTransformFromPath = getTransformFromPath;
  this.getDataFromPath = getDataFromPath;
  this.deleteDataInPath = function(path) {
    if (!Array.isArray(path) || !path.length) {return false;}
    if (path.length === 1) {files.splice(path[0], 1);}
    else {
      let dataHandler = getDataFromPath(path);
      if (!(dataHandler instanceof DataHandler)) {return false;}
      setFileTransformData(path, null);
    }
  }
  this.updateTransforms = function(newTransforms) {
    let oldTransforms = transforms;
    transforms = newTransforms;
    if (!oldTransforms) {return;}
    //Step 1 - Create an array for the old and new structure of each file
    let oldStructure = [];
    let newStructure = [];
    for (let k = 0; k < files.length; k++) {
      //Join all old structures in oldStructure array
      oldStructure.push(files[k].structure);
      //Create one structure for each file
      newStructure.push(genTransformsStructure(newTransforms));
    }
    //Step 2 - Compare the old and new transformations and checks which
    //transform is present in the two. If this transform was already
    //calculated, gets the value from the oldStructure and store it in the
    //newStructure array.
    let oldPath = [];
    let newPath = [];
    (function compareTransforms(oldTf, newTf) {
      if (!oldTf || !newTf) {return;}
      for (let i = 0; i < oldTf.length; i++) {
        if (oldTf[i].value) { //if oldTf[i] corresponds to a folder
          for (let j = 0; j < newTf.length; j++) {
            if (oldTf[i].name === newTf[j].name) {
              oldPath.push(i); newPath.push(j);
              compareTransforms(oldTf[i].value, newTf[j].value);
              break;
            }
          }
        }
        else { //if oldTf[i] corresponds to a transformation
          for (let j = 0; j < newTf.length; j++) {
            //if newTf also contains the oldTf[i] transformation
            if (oldTf[i] === newTf[j]) {
              for (let k = 0; k < files.length; k++) {
                let oldData = oldStructure[k];
                let newData = newStructure[k];
                for (let p = 0, n = oldPath.length; p < n; p++) {
                  oldData = oldData[oldPath[p]];
                  newData = newData[newPath[p]];
                }
                newData[j] = oldData[i];
              }
            }
          }
        }
      }
      oldPath.pop();
      newPath.pop();
    })(oldTransforms.value, newTransforms.value);
    //Step 3 - Update the structure for every file
    for (let k = 0; k < files.length; k++) {files[k].structure = newStructure[k];}
  }
  this.readFile = function(filePath) {
    let extension = extname(filePath);
    let fileName = basename(filePath, extension);
    let fileString = fs.readFileSync(filePath, 'utf8');
    if (extension === '.json') {return readJSON(fileName, fileString);}
    else {return readDSV(fileName, fileString);}
  }
  this.addFile = function(dataHandler) {
    if (!(dataHandler instanceof DataHandler)) {throw new TypeError(
      `Expected a instanceof DataHandler for the 'dataHandler' argument`
    )}
    Object.defineProperty(dataHandler, 'structure', {
      writable: true, configurable: true,
      value: dataHandler.value ? genTransformsStructure(transforms) : null
    })
    files.push(dataHandler);
  }
  this.setFileData = (fileId, data) => files[fileId].setData(data);
  this.resetFileStructure = function(fileId) {
    //files[fileId].structure = genTransformsStructure(transforms);
    (function recursiveSet(structureArray) {
      for (let i = 0, n = structureArray.length; i < n; i++) {
        if (!Array.isArray(structureArray[i])) {structureArray[i] = null;}
        else {recursiveSet(structureArray[i]);}
      }
    })(files[fileId].structure);
  }
  this.calculateTransform = function(path, getArguments) {
    let file = files[path[0]];
    let transform = getTransformFromPath(path.slice(1));
    return getArguments(transform.args).then(({args, canceled}) => {
      if (canceled) {return {};}
      args.data = file.isHierarchy ? file.getLevel(0).data : file.value;
      let value;
      try {value = calculateTransformSafely(transform.func, args);}
      catch (err) {throw err;}
      if (value === null || value === undefined) {return {};}
      let dataHandler = new DataHandler({
        name: transform.name, type: transform.type, value
      });
      setFileTransformData(path, dataHandler);
      return {transform, dataHandler};
    });
  }

  //Private Functions
  //  Generates a tree of arrays, each representing a folder of a
  //  set of transformations
  function genTransformsStructure(transformsObj) {
    let structure = [];
    (function recursiveGen(tfFolder, saveTo) {
      for (let tf of tfFolder) {
        //if tf is a directory (tf.value contain folder contents)
        if (tf.value) {
          let next = [];
          saveTo.push(next);
          recursiveGen(tf.value, next);
        }
        else {saveTo.push(null);}
      }
    })(transformsObj.value, structure);
    return structure;
  }
  function setFileTransformData(path, dataHandler) {
    let tfId = path[path.length - 1];
    let structure = files[path[0]].structure;
    for (let i = 1, n = path.length - 1; i < n; i++) {
      structure = structure[path[i]];
    }
    structure[tfId] = dataHandler;
  }
  function getTransformFromPath(path = Array.prototype) {
    if (!Array.isArray(path)) {return null;}
    let tf = transforms;
    for (let id of path) {
      if (!tf.value || !(tf = tf.value[id])) {return null;}
    }
    return tf;
  }
  function getDataFromPath(path = Array.prototype) {
    if (!Array.isArray(path)) {return null;}
    if (path.length === 0) {return files;}
    if (files.length <= path[0]) {return null;}
    if (path.length === 1) {return files[path[0]];}
    let tf = transforms;
    let value = files[path[0]].structure;
    for (let i = 1; i < path.length; i++) {
      if (!tf.value || !(tf = tf.value[path[i]])) {return null;}
      value = value[path[i]];
    }
    return value;
    let out = {};
    for (let key in tf) {out[key] = tf[key];}
    if (value instanceof DataHandler) {out.dataHandler = value;}
    return out;
  }
  function reverseMaliciousChanges(mutations) {
    maliciousFunction = true;
    for (let mutation of mutations) {
      if (mutation.type === 'attributes') {
        mutation.target.setAttribute(mutation.attributeName, mutation.oldValue);
      }
      else if (mutation.type === 'characterData') {
        mutation.target.innerHTML = mutation.oldValue;
      }
      else if (mutation.type === 'childList') {
        for (let elem of mutation.addedNodes) {elem.remove();}
        for (let elem of mutation.removedNodes) {
          mutation.target.insertBefore(elem, mutation.nextSibling);
        }
      }
    }
    throw null;
  }
  function calculateTransformSafely(func, args) {
    maliciousFunction = false;
    let alertHolder         = alert;
    let setTimeoutHolder    = setTimeout;
    let setIntervalHolder   = setInterval;
    let clearTimeoutHolder  = clearTimeout;
    let clearIntervalHolder = clearInterval;
    alert = clearTimeout = clearInterval = setTimeout = setInterval = 
    function () {maliciousFunction = true; throw null;};
    observer.observe(document.documentElement, {
      attributes: true, attributeOldValue: true,
      characterData: true, characterDataOldValue: true,
      childList: true, subtree: true
    });
    let value;
    try {try {value = func(args);}
    finally {
      alert         = alertHolder;
      setTimeout    = setTimeoutHolder;
      setInterval   = setIntervalHolder;
      clearTimeout  = clearTimeoutHolder;
      clearInterval = clearIntervalHolder;
      let queue = observer.takeRecords();
      observer.disconnect();
      if (queue.length) {try {reverseMaliciousChanges(queue);} catch{}}
      if (maliciousFunction) {alert(
        'WARNING: This transformation tried to breach this computer security ' +
        'by using functions not allowed by this program. No damage was done, ' +
        "but it's recommended that this transformation file and any other " + 
        'coming from the same origin be removed from this computer.'
      ); return null;}
    }} catch (err) {throw err;}
    return value;
  }
  function readDSV(name = 'NoName', dsvString) {
    //tries to find the separator if not given
    let separator = null;
    for (let i = 0, n = Math.max(dsvString.length, 100); i < n; i++) {
      let c = dsvString.charCodeAt(i);
      if (47 < c && c <  58) {continue;} // '0'-'9'
      if (64 < c && c <  91) {continue;} // 'A'-'Z'
      if (96 < c && c < 123) {continue;} // 'a'-'z'
      if (c === 43 || c === 45 || c === 46) {continue;} //'+', '-', '.'
      separator = dsvString[i];
      break;
    }
    if (!separator) {return false;}
    //Uses separator to convert dsvString to numerical data
    let data = [];
    let stringData = d3.dsvFormat(separator).parseRows(dsvString);
    let startRow = Number(stringData[0][0]) ? 0 : 1; //ignore if first row is header
    let nCols = stringData[0].length;
    if (nCols === 2) {
      let value = [];
      for (let i = startRow, n = stringData.length; i < n; i++) {
        value.push([Number(stringData[i][0]), Number(stringData[i][1])]);
      }
      data.push(new DataHandler({name, value, type: 'normal'}));
    }
    else {
      for (let col = 0; col < nCols; col++) {
        let value = [];
        for (let i = startRow, n = stringData.length; i < n; i++) {
          value.push([i, Number(stringData[i][col])]);
        }
        if (startRow === 1) {
          data.push(new DataHandler({
            name: stringData[0][col], value, type: 'normal'
          }));
        }
        else {
          data.push(new DataHandler({
            name: name + ' - c' + (col + 1), value, type: 'normal'
          }));
        }
      }
    }
    return data;
  }
  function readJSON(name = 'NoName', jsonString) {
    let data = JSON.parse(jsonString);
    if (!Array.isArray(data)) {data = [data];}
    for (let i = 0, n = data.length; i < n; i++) {
      if (!data[i].type) {data[i].type = 'normal';}
      if (!data[i].name) {data[i].name = name + ' - c' + (col + 1);}
      data[i] = new DataHandler(data[i]);
    }
    return data;
  }
  //Initialize object
  (function() {
  })();
}