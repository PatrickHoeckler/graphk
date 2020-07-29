"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

module.exports = {ArgsSelector};

const {appendNewElement, defaultCallParent} = require('./auxiliar.js');
const {Window} = require('./window.js');
function ArgsSelector(argsFormat, parent, title = 'Select Arguments') {
  //Private Properties
  var argWindow, argsBox, bWrapper;
  var callParent = defaultCallParent;

  //Public Methods
  this.onCallParent = function (executor = defaultCallParent) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  this.close = destroy;
  this.recreate = recreate;

  //Private Functions
  function destroy() {
    if (argWindow) {
      argWindow.close();
      let [confirm, cancel] = bWrapper.children;
      confirm.remove('click', confirmSelection);
      cancel.remove('click', cancelSelection);
    }
    argWindow = bWrapper = argsBox = null;
  }
  function recreate(argsFormat, parent, title) {
    //ERROR CHECKING
    if (!Array.isArray(argsFormat) || !argsFormat.length) {throw new TypeError(
      "Expected an array containing at least one value for the 'argsFormat' argument")
    ;} 
    else if (!(parent instanceof HTMLElement)) {throw new TypeError(
      'Expected an HTMLElement as a parent for the ArgsSelector main node element')
    ;}

    //Creating main HTMLElements
    destroy(); //Destroying any old element if any
    let container = appendNewElement(null, 'div', 'args-selector');
    argsBox = appendNewElement(container, 'div', 'args-box');
    bWrapper = appendNewElement(container, 'div', 'button-wrapper');
    let confirm = appendNewElement(bWrapper, 'button');
    let cancel  = appendNewElement(bWrapper, 'button');
    confirm.innerHTML = 'Confirm';
    cancel.innerHTML = 'Cancel';
    //adding buttons functionality
    confirm.addEventListener('click', confirmSelection);
    cancel.addEventListener('click', cancelSelection);
    //removes warning class at the end of transition,
    //effectively creating a single pulse warning
    argsBox.addEventListener('transitionend', ({target}) => target.classList.remove('warning'));
    argWindow = new Window({
      width: 400, height:  90 + 60 * argsFormat.length,
      frame: !!title, title: title, frameButtons: [],
      parent, content: container
    });

    //Creating argument-specific HTMLElements
    for (let i = 0; i < argsFormat.length; i++) {
      let {name, type, value, optional, tooltip, option} = argsFormat[i];
      //checking type against valid values.
      //If invalid value is given, defaults to 'number'
      if (!['number', 'string', 'select', 'data'].includes(type)) {type = 'number';}
      //Creating the elements for the argument input
      let argWrapper = appendNewElement(argsBox, 'div', 'arg-wrapper');
      let argText = appendNewElement(argWrapper, 'div', 'arg-text');
      let argInput = appendNewElement(argWrapper, 
        type === 'select' ? 'select' : type === 'data'   ? 'button' : 'input',
        'arg-input'
      );

      //configuring argText
      argText.innerHTML = typeof(name) === 'string' ? name : 'N/A';
      if (tooltip) {
        argText.setAttribute('title', typeof(tooltip) === 'string' ? tooltip : 'Tooltip invalido');
      }
      //configuring argInput
      if (type === 'select') {
        for (let i = 0; i < option.length; i++) {
          let optionElem = appendNewElement(argInput, 'option');
          optionElem.innerHTML = option[i].name;
          optionElem.setAttribute('value', option[i].name);
          if (!option[i].tooltip) {
            optionElem.setAttribute('title', typeof(tooltip) === 'string' ? 
              option[i].tooltip : 'Tooltip invalido'
            );
          }
        }
      }
      else if (type === 'data') {
        argInput.innerHTML = 'Select File';
        argInput.addEventListener('click', ({currentTarget}) => {
          argWindow.hide();
          callParent('get-data').then(({dataHandler, path, canceled}) => {
            argWindow.show();
            if (canceled) {return;}
            currentTarget.innerHTML = dataHandler.name;
            //path is given as an array. The window that takes the arguments only accepts
            //values as string, so we stringify the array. Later we parse the values back
            currentTarget.value = JSON.stringify(path);
          });
        });
      }
      else { //(type === 'number' || type === 'string')
        argInput.setAttribute('type', type === 'string' ? 'text' : 'number');
        if (!value) {argInput.setAttribute('value', value);}
        if (optional) {
          argInput.setAttribute('placeholder', 'Optional');
          argInput.setAttribute('title', 'This attribute is optional');
        }
      }
    }
  }
  function confirmSelection() {
    let args = {};
    let inputEmpty = false;
    for (let argWrapper of argsBox.children) {
      let [argText, argInput] = argWrapper.children;
      let name = argText.textContent;
      let value = argInput.value;
      //checks if value is not set
      if (value === '') {
        //if value is not optional
        if (argInput.getAttribute('placeholder') === null) {
          argInput.classList.add('warning');
          inputEmpty = true;
        }
        continue;
      }
      if (argInput.getAttribute('type') === 'number') {args[name] = Number(value);}
      else {args[name] = value;}
    }
    if (inputEmpty) {return;}
    //disables buttons to prevent another click
    let [confirm, cancel] = bWrapper.children;
    confirm.disabled = true;
    cancel.disabled = true;
    callParent('end-selection', {args});
  }
  function cancelSelection() {
    //disables buttons to prevent another click
    let [confirm, cancel] = bWrapper.children;
    confirm.disabled = true;
    cancel.disabled = true;
    callParent('end-selection', {canceled: true});
  }

  //Initialize Object
  (function () {recreate(argsFormat, parent, title);})();
}