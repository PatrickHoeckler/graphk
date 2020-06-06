'use strict';

//    COISAS PARA AJUSTAR NO FUTURO
//
//

module.exports = {
  appendNewElement,
  getContextItems,
  changePosition,
  selectDataInRange,
  checkType
}

//This function creates an element of a given tagName and with a given class, and appends
//it to the given parentElem. The element created is then returned. If 'parentElem === null'
//then the function will only return the created element without appending it to anything
function appendNewElement(parentElem = HTMLElement.prototype, tagName = '', className = '') {
  let elem = document.createElement(tagName);
  if (className) {elem.className = className;}
  if (parentElem !== null) {
    try {parentElem.appendChild(elem);}
    catch (err) {throw new Error("Could not append to given 'parentElement'");}
  }
  return elem;
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

//change element position in a vector and shift other elements accordingly
function changePosition(vector, oldId, newId) {
  let temp = vector[oldId];
  for (let i = oldId; i < newId; i++) {vector[i] = vector[i + 1];}
  for (let i = oldId; i > newId; i--) {vector[i] = vector[i - 1];}
  vector[newId] = temp;
  return vector;
}


//returns all points of data that are between low and high
//if low === undefined, there will be no lower bound
//if high === undefined, there will be no higher bound
function selectDataInRange(data, [low, high]) {
  let error = checkType(['number', 'undefined'], {low: low, high:high});
  if (error) {throw new TypeError(
    `Expected a number as value for the ${error.key} argument. Got ${error.type}`
  );}
  let selection = [];
  for (let i = 0; i < data.length; i++) {
    let x = data[i][0];
    if (x < low || high < x) {continue;}
    selection.push(data[i]);
  }
  return selection;
}

//Error check functions
function checkType(type, obj) {
  if (!Array.isArray(type)) {type = [type];}
  for (let key in obj) {
    let keyType = typeof(obj[key]);
    if (!type.some((value) => keyType === value)) { 
      return {
        key: key, //name of key with wrong type
        type: typeof(obj[key]) //wrong type given
      }
    }
  }
  return null; //no type mismatch found
}