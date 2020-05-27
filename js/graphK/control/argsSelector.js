"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

module.exports = {ArgsSelector};

const {appendNewElement} = require('../auxiliar/auxiliar.js');
function ArgsSelector() {
  const container = appendNewElement(null, 'div', 'args-selector');
  const argsBox = appendNewElement(container, 'div', 'args-box');

  //Public Methods
  this.node = () => container;
  this.onDataSelect = (callback) => startDataSelection = callback;
  this.onEndSelect = (callback) => endSelection = callback;
  this.setArgsFormat = function(argsFormat) {
    if (!startDataSelection) {throw new Error(
      'No callback function was set with the onDataSelect function on ArgsSelector object'
    );}
    argsBox.innerHTML = '';
    let [confirm, cancel] = container.children[1].children;
    confirm.disabled = cancel.disabled = false; //reenables buttons
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
        argInput.addEventListener('click', () => {
          startDataSelection(function(name, path, canceled) {
            if (canceled) {return;}
            argInput.innerHTML = name;
            //path is given as an array. The window that takes the arguments only accepts
            //values as string, so we stringify the array. Later we parse the values back
            argInput.value = JSON.stringify(path);
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

  //Private Properties
  var startDataSelection, endSelection; //callbacks
  //Initialize Object
  (function() {
    let bWrapper = appendNewElement(container, 'div', 'button-wrapper');
    let confirm = appendNewElement(bWrapper, 'button');
    let cancel  = appendNewElement(bWrapper, 'button');
    confirm.innerHTML = 'Confirm';
    cancel.innerHTML = 'Cancel';

    //adding buttons functionality
    confirm.addEventListener('click', () => {
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
      confirm.disabled = true;
      cancel.disabled = true;
      endSelection(args);
    });
    cancel.addEventListener('click', () => {
      endSelection(null);
      //disables buttons to prevent another click
      confirm.disabled = true;
      cancel.disabled = true;
    })
    //removes warning class at the end of transition,
    //effectively creating a single pulse warning
    argsBox.addEventListener('transitionend', (e) => {
      e.target.classList.remove('warning');
    });
  })();
}