'use strict';

module.exports = {
  appendNewElement,
  changePosition,
  selectDataInRange,
  checkType,
  mouseOverHighlight,
  countDecimals,
  createResizeHandler,
  createButtonWrapper,
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

function mouseOverHighlight(elem) {
  elem.classList.add('highlight');
  elem.addEventListener('mouseleave', function leave({currentTarget}) {
    currentTarget.classList.remove('highlight');
    currentTarget.removeEventListener('mouseleave', leave);
  });
}

function countDecimals(number) {
  return Number.isInteger(number) ? 0 :
  number.toString().split('.')[1].length;
}

function createResizeHandler(direction, nodeToResize, options) {
  const {min, max, onStop} = options;
  var getPoint, getSize, resize;
  if (direction === 'ns') {
    getPoint = event => event.y;
    getSize = (node) => Number.parseInt(node.style.height);
    resize = (node, size) => node.style.height = `${size}px`;
  }
  else if (direction === 'ew') {
    getPoint = event => event.x;
    getSize  = node => Number.parseInt(node.style.width);
    resize   = (node, size) => node.style.width = `${size}px`;
  }
  else {throw new Error(
    `Invalid value given to 'direction' argument. Can only accept 'ns' or 'ew'`
  );}
  return function handler(event) {
    const startPoint = getPoint(event);
    const startSize = getSize(nodeToResize);
    function move(event) {
      const newSize = startSize + getPoint(event) - startPoint;
      if (newSize < min || newSize > max) {return;}
      resize(nodeToResize, newSize);
    }
    function stop() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      document.body.style.cursor = oldCursor;
      if (onStop) {onStop();}
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    const oldCursor = document.body.style.cursor;
    document.body.style.cursor = `${direction}-resize`;
  }
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

/**
 * Creates a div element of class 'button-wrapper' that contains
 * the buttons given and creates a click handler to handle the
 * button clicks by calling the callbacks given
 * @param {string[]} buttons - array of button names to add to the wrapper
 * @param {(button: string) => void} click - click callback informing the button clicked
 * @returns {HTMLDivElement} the button wrapper element
 */
function createButtonWrapper(buttons, click) {
  const bw = document.createElement('div');
  bw.className = 'button-wrapper';
  for (let name of buttons) {
    const button = document.createElement('button');
    button.innerHTML = name;
    bw.appendChild(button);
  }
  bw.addEventListener('click', function({currentTarget, target}) {
    if (target !== currentTarget) {click(target.innerHTML);}
  });
  return bw;
}