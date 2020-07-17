'use strict';

module.exports = {
  appendNewElement,
  changePosition,
  selectDataInRange,
  checkType,
  defaultCallParent: () => Promise.reject(new Error('callParent not set'))
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
  for (let key in obj) {
    let keyType = typeof(obj[key]);
    if (keyType === type) {continue;}
    return `Expected type '${type}' for the argument '${key}', got '${keyType}'`;
  }
  return ''; //no type mismatch found
}