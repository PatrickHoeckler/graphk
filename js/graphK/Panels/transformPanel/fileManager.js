"use strict";

module.exports = {FileManager};
const d3 = require('d3');
const fs = require('fs');
const {extname, basename} = require('path');

function FileManager() {
  //Constants
  const observer = new MutationObserver(reverseMaliciousChanges);
  const files = [];
  //Public Attributes

  //Private Properties
  var transforms;
  var maliciousFunction; //indicates if transformation is a malicious file

  //Public Methods
  this.getTransformFromPath = function(path = Array.prototype) {
    if (!Array.isArray(path)) {return null;}
    let tf = transforms;
    for (let id of path) {
      if (!tf.value || !(tf = tf.value[id])) {return null;}
    }
    return tf;
  }
  this.getDataFromPath = function (path, onlyWritableValues = false) {
    let data = getDataFromPath(path);
    if (!onlyWritableValues) {return data;}
    let {name, value, type} = data;
    return {name, value, type};
  }
  this.deleteDataInPath = function(path) {
    if (!Array.isArray(path) || !path.length) {return false;}
    if (path.length === 1) {files.splice(path[0], 1);}
    else {
      let transform = getDataFromPath(path);
      if (!transform) {return false;}
      if (transform.type === 'dir' || transform.type === 'pkg') {return false;}
      setFileTransformValue(path, null);
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
    //Step 2 - Compare which transformation is kept in this change
    //it's value in the newStructure array
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
            if (newTf[j] === oldTf[i]) {
              for (let k = 0; k < files.length; k++) {
                let oldData = oldStructure[k];
                let newData = newStructure[k];
                for (let p = 0, n = oldPath.length - 1;; p++) {
                  oldData = oldData[oldPath[p]];
                  if (p !== n) {newData = newData[newPath[p]];}
                  else {
                    newData[newPath[p]] = oldData;
                    break;
                  }
                }
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
  this.addFile = function({
    name = 'NoName',
    value = null,
    type = 'normal'
  }) {
    let structure = null;
    if (value) {structure = genTransformsStructure(transforms);}
    let newFile = {name, value, type, structure};
    files.push(newFile);
  }
  this.setFileData = function(fileId, data) {
    let file = files[fileId];
    for (let key of ['name', 'value', 'type']) {
      if (data[key] !== undefined) {file[key] = data[key];}
    }
  }
  this.resetFileStructure = function(fileId) {
    files[fileId].structure = genTransformsStructure(transforms);
  }
  this.calculateTransform = function(path, getArguments) {
    let file = files[path[0]];
    let transform = getDataFromPath(path);
    let argsFormat = transform.args;
    return getArguments(argsFormat).then(({args, canceled}) => {
      if (canceled) {return {};}
      let value;
      try {value = calculateTransformSafely(transform.func, args, file.value);}
      catch (err) {throw err;}
      if (value === null || value === undefined) {return {};}
      setFileTransformValue(path, value);
      transform.value = value;
      return transform;
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
  function setFileTransformValue(path, value) {
    let tfId = path[path.length - 1];
    let structure = files[path[0]].structure;
    for (let i = 1, n = path.length - 1; i < n; i++) {
      structure = structure[path[i]];
    }
    structure[tfId] = value;
  }
  function getDataFromPath(path = Array.prototype, ) {
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
    let out = {};
    for (let key in tf) {out[key] = tf[key];}
    if (!out.value) {out.value = value;}
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
  function calculateTransformSafely(func, args, data) {
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
    try {try {value = func(data, args);}
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
      data.push({name, value, type: 'normal'});
    }
    else {
      for (let col = 0; col < nCols; col++) {
        let value = [];
        for (let i = startRow, n = stringData.length; i < n; i++) {
          value.push([i, Number(stringData[i][col])]);
        }
        if (startRow === 1) {
          data.push({name: stringData[0][col], value, type: 'normal'});
        }
        else {
          data.push({name: name + ' - c' + (col + 1), value, type: 'normal'});
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
    }
    return data;
  }
  //Initialize object
  (function() {
  })();
}