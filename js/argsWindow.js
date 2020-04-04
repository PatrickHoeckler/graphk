"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

const graphK = {};
const electron = require('electron');
const {ipcRenderer} = electron;

ipcRenderer.on('arguments:input', (e, argsFormat) => {
  let mainDiv = document.getElementById('args-box');
  for (let i = 0; i < argsFormat.length; i++) {
    let {name, type, value, optional, tooltip, option} = argsFormat[i];
    //checking type against valid values.
    //If invalid value is given, defaults to 'number'
    if (!['number', 'string', 'select', 'data'].includes(type)) {type = 'number';}
    //Creating the elements for the argument input
    let argWrapper = document.createElement('div');
    let argText = document.createElement('div');
    let argInput = 
      type === 'select' ? document.createElement('select') :
      type === 'data'   ? document.createElement('button') :
      document.createElement('input'); //(type === 'number' || type === 'string')

    //configuring argWrapper and argText
    argWrapper.className = 'arg-wrapper';
    argText.className = 'arg-text';
    argText.innerHTML = typeof(name) === 'string' ? name : 'N/A';
    if (tooltip !== undefined)
      argText.setAttribute('title', typeof(tooltip) === 'string' ? tooltip : 'Tooltip invalido');

    //  configuring argInput
    argInput.className = 'arg-input';
    if (type === 'select') {
      for (let i = 0; i < option.length; i++) {
        let optionElem = document.createElement('option');
        optionElem.innerHTML = option[i].name;
        optionElem.setAttribute('value', option[i].name);
        if (option[i].tooltip !== undefined)
          optionElem.setAttribute('title', option[i].tooltip);
        argInput.appendChild(optionElem);
      }
    }
    else if (type === 'data') {
      argInput.innerHTML = 'Select File';
      argInput.addEventListener('click', (e) => {
        let button = e.target;
        ipcRenderer.send('arguments:select');
        ipcRenderer.once('arguments:selected', (e, name, path, canceled) => {
          if (canceled) {return;}
          button.innerHTML = name;
          button.value = path;
        });
      })
    }
    else { //(type === 'number' || type === 'string')
      argInput.setAttribute('type', type === 'string' ? 'text' : 'number');
      if (value !== undefined) argInput.setAttribute('value', value);
      if (optional) {
        argInput.setAttribute('placeholder', 'Optional');
        argInput.setAttribute('title', 'This attribute is optional');
      }
    }

    //appending elements
    argWrapper.appendChild(argText);
    argWrapper.appendChild(argInput);
    mainDiv.appendChild(argWrapper);
  }

  //defining button functionality
  let confirm = document.getElementById('confirm');
  let cancel = document.getElementById('cancel');
  confirm.addEventListener('click', () => {
    let args = {};
    let argElems = document.getElementsByClassName('arg-wrapper');
    let inputEmpty = false;
    for (let i = 0; i < argElems.length; i++) {
      let name = argElems[i].children[0].textContent;
      let value = argElems[i].children[1].value;
      //checks if value is not set
      if (value === '') {
        //if value is not optional
        if (argElems[i].children[1].getAttribute('placeholder') === null) {
          argElems[i].children[1].classList.add('warning');
          inputEmpty = true;
        }
        continue;
      }
      if (argsFormat[i].type === 'number') args[name] = Number(value);
      else args[name] = value;
    }
    if (inputEmpty) return;
    ipcRenderer.send('arguments:values', args);
    //disables buttons to prevent another click
    confirm.disabled = true;
    cancel.disabled = true;
  });

  cancel.addEventListener('click', () => {
    ipcRenderer.send('arguments:values', null);
    //disables buttons to prevent another click
    confirm.disabled = true;
    cancel.disabled = true;
    //electron.remote.getCurrentWindow().close();
  })

  mainDiv.addEventListener('transitionend', (e) => {
    e.target.classList.remove('warning');
  });
});