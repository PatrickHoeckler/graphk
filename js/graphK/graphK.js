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