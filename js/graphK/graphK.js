"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
// - Esse jeito de eu indexar os modos de um jeito parecido com enumeradores parece meio
//   estranho. Pesquisar melhor pra ver se eu acho uma solução melhor ou se essa é adequada.
//

//Namespace
const graphK = {};

//Colors
graphK.color = {
  HIGHLIGHT_NORMAL: 'dimgray',
  HIGHLIGHT_DELETE: 'crimson',
  HIGHLIGHT_SELECT: 'darkcyan',
  HIGHLIGHT_BRUSHING: 'red'
};

//Modes
graphK.Mode = function (startMode) {
  //Public Methods
  this.mode = () => mode;
  this.canChange = (newMode) => checkCallback && checkCallback(newMode);
  this.change = function (newMode) {
    if (mode === newMode) {return true;}
    if (!checkCallbacks.every(check => check(newMode))) {return false;}
    changeCallbacks.forEach(callback => callback(newMode));
    mode = newMode;
    return true;
  }
  this.check = newMode => {
    let r = mode === newMode || checkCallbacks.every(check => check(newMode));
    return r;
  }
  this.addChangeListener = (callback) => changeCallbacks.push(callback);
  this.addCheckListener  = (callback) => checkCallbacks.push(callback);
  this.removeChangeListener = (callback) => {
    let index = changeCallbacks.indexOf(callback);
    if (index !== -1) {changeCallbacks.splice(index, 1);}
  }
  this.removeCheckListener = (callback) => {
    let index = checkCallbacks.indexOf(callback);
    if (index !== -1) {checkCallbacks.splice(index, 1);}
  }

  //Private properties
  var mode;
  var checkCallbacks, changeCallbacks;

  //Initialize Object
  mode = startMode;
  checkCallbacks = [];
  changeCallbacks = [];
}

graphK.mode = {
  NORMAL: 0,
  SELECT: 1,
  RENAME: 2,
  DELETE: 3,
  BRUSH : 4,
  DRAG  : 5,
  isMode: function(mode) {
    if (typeof(mode) !== 'number' || !Number.isInteger(mode)) {return false;}
    return this.NORMAL <= mode && mode <= this.DRAG;
  },
}

//Auxiliar Functions
//  This function creates an element of a given tagName and with a given class, and appends
//  it to the given parentElem. The element created is then returned. If 'parentElem === null'
//  then the function will only return the created element without appending it to anything
graphK.appendNewElement = function(parentElem = HTMLElement.prototype, tagName = '', classValue = '') {
  let elem = document.createElement(tagName);
  elem.classList.value = classValue;
  if (parentElem !== null) {
    try {parentElem.appendChild(elem);}
    catch (err) {throw new Error("Could not append to given 'parentElement'");}
  }
  return elem;
}
//  Deep clones transforms object to store on files array
//  using JSON stringify/parse combination first, and then
//  looping through to also store the functions
graphK.deepClone = function(obj) {
  let clone = Array.isArray(obj) ? [] : {};
  for (let i in obj) {
    if (typeof(obj[i]) === 'object') clone[i] = graphK.deepClone(obj[i]);
    else {
      clone[i] = obj[i];
    }
  }
  return clone;
}

graphK.getContextItems = function(place, detail) {
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
      {name: 'Select Region', return: 'select', type: detail !== 'brush' ? 'inactive' : undefined},
      {type: 'separator'},
      {name: 'Remove', return: 'remove'},
      {name: 'Clear', return: 'clear'}
    ]
  }
  else if (place === 'routine') {
    return [
      {name: 'Rename', return: 'rename', type: detail === 'panel' ? 'inactive' : undefined},
      {name: 'New Routine', return: 'newR'},
      {name: 'Remove Routine', return: 'remR', type: detail !== 'head' ? 'inactive' : undefined},
      {type: 'separator'},
      {name: 'New Step', return: 'newS', type: detail === 'panel' ? 'inactive' : undefined},
      {name: 'Remove Step', return: 'remS', type: detail !== 'step' ? 'inactive' : undefined},
    ]
  }
  else {return null;}
}