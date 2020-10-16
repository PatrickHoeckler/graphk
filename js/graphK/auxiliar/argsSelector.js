"use strict";

module.exports = {selectArguments};

const {appendNewElement, createButtonWrapper} = require('./auxiliar.js');
const {Window} = require('./window.js');
const _argData = Symbol('argsSelector.argData');
const _argFormat = Symbol('argsSelector.argFormat');

function selectArguments(title, transform, parent, getDataCallback) {
return new Promise((resolve) => {
  if (!transform.args) {return resolve({args: {}});}
  const checkArgs = transform.checkArgs;
  const argWindow = new Window({
    width: 400, height:  Math.min(500, 90 + 60 * transform.args.length),
    frame: !!title, title: title, frameButtons: [], parent
  });
  const container = appendNewElement(argWindow.contentNode(), 'div', 'args-selector');
  const argsBox = appendNewElement(container, 'div', 'args-box');
  const bWrapper = createButtonWrapper(['Confirm', 'Cancel'], button => {
    let resolveValue = null;
    if (button === 'Confirm') {
      resolveValue = confirmSelection(argsBox, checkArgs);
      if (!resolveValue) {return;}
    }
    container.style.pointerEvents = 'none';
    argWindow.close();
    resolve(resolveValue);
  });
  container.appendChild(bWrapper);
  argsBox.addEventListener('transitionend', ({target}) => target.classList.remove('warning'));

  for (let argument of transform.args) {
    let argWrapper = appendNewElement(argsBox, 'div', 'arg-wrapper');
    let argText = appendNewElement(argWrapper, 'div', 'arg-text');
    argText.innerHTML = argument.name;
    if (argument.tooltip) {argText.setAttribute('title', argument.tooltip);}
    let argInput = createInputElement(argument);
    argWrapper.appendChild(argInput);
    if (argument.type === 'data') {
      argInput.addEventListener('click', ({currentTarget}) => {
        argWindow.hide();
        getDataCallback().then(({dataHandler, canceled}) => {
          argWindow.show();
          if (canceled) {
            currentTarget[_argData] = null;
            currentTarget.innerHTML = 'Select File' + 
              (currentTarget[_argFormat].optional ? ' (Optional)' : '');
          }
          else {
            currentTarget.innerHTML = dataHandler.name;
            currentTarget[_argData] = dataHandler.isHierarchy ?
              dataHandler.getLevel(0).data : dataHandler.value;
          }
        });
      });
    }
  }
});}

function createInputElement(argument) {
  let argInput;
  if (argument.type === 'number') {
    argInput = appendNewElement(null, 'input', 'arg-input');
    argInput.setAttribute('type', 'number');
    ['value', 'step', 'min', 'max'].forEach(key => {
      if (argument[key] !== undefined) {argInput.setAttribute(key, argument[key]);}
    })
    if (argument.optional) {argInput.setAttribute('placeholder', 'Optional');}
  }
  if (argument.type === 'select') {
    argInput = appendNewElement(null, 'select', 'arg-input');
    for (let option of argument.option) {
      let optionElem = appendNewElement(argInput, 'option');
      optionElem.setAttribute('value', optionElem.innerHTML = option.name);
      if (option.tooltip) {optionElem.setAttribute('title', option.tooltip);}
    }
    if (argument.value) {argInput.value = argument.value;}
  }
  else if (argument.type === 'checkbox') {
    argInput = appendNewElement(null, 'label', 'arg-input');
    let checkbox = appendNewElement(argInput, 'input');
    checkbox.setAttribute('type', 'checkbox');
    checkbox.checked = argument.value;
    appendNewElement(argInput, 'span', 'checkbox');
  }
  else if (argument.type === 'data') {
    argInput = appendNewElement(null, 'button', 'arg-input');
    argInput.innerHTML = 'Select File' + (argument.optional ? ' (Optional)' : '');
    argInput[_argData] = argument.value;
  }
  if (argument.optional) {
    argInput.setAttribute('title', 'This attribute is optional');
  }
  argInput[_argFormat] = argument;
  return argInput;
}

function confirmSelection(argsBox, checkArgs) {
  let args = {};
  let invalid = false;
  for (let argWrapper of argsBox.children) {
    let argInput = argWrapper.children[1];
    let argument = argInput[_argFormat];
    let value = argument.type === 'data' ? argInput[_argData] :
      argument.type === 'checkbox' ? argInput.children[0].checked : argInput.value;
    if (!value && value !== false) {
      if (argument.optional) {continue;}
      argInput.classList.add('warning');
      invalid = true;
    }
    if (argument.type === 'number') {args[argument.keyname] = Number(value);}
    else {args[argument.keyname] = value;}
  }
  if (checkArgs) {invalid = checkArgs(args);}
  return invalid ? null : args;
}
