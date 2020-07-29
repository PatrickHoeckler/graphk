"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

module.exports = {PropertiesPanel};

const {
  appendNewElement, defaultCallParent
} = require('../../auxiliar/auxiliar.js');
const {Context} = require('../../auxiliar/context.js');
const {Panel} = require('../../PanelManager/panel.js');
const {ColorPicker} = require('../../auxiliar/colorPicker.js');
const {Window} = require('../../auxiliar/window.js');

function PropertiesPanel() {
  //Constants
  //Private Properties
  var pContents;
  
  //Public Methods
  //  Shows in the panel all the given properties. The pObjs argument is an
  //  array containing one or more objects that hold properties, each one can
  //  having one or several properties. These objects must be of the form:
  //   - name (string): name of the object, shown above its properties as a
  //     header. Can be omitted (the header will not be created).
  //   - props (object[]): an array describing its properties.
  //   - onChange (function): callback called everytime a property is changed.
  //      -- callback({
  //        name: The name of the property
  //        value: The value of the property
  //        objId: The index of the property container, i.e., the element of
  //               class 'property-object'
  //      })
  //   - onInput (function): callback called everytime a property calls the
  //   input event. The callback argument is the same as for the onChange key.
  //  The props key is an array containing objects representing the properties.
  //  These objects can have the following keys:
  //   - name (string): the property name
  //   - disabled (bool): if the property can't be edited
  //   - value: the value of the property, can be empty
  //   - type (string): the type of the property, can be:
  //      -- 'text': default, the value is considered as string of text
  //      -- 'number': the value can assume only numbers
  //      -- 'range': the property is show as a range bar from a minimum to a
  //      maximum given by the keys 'min' and 'max' (see bellow).
  //      -- 'select': a drop-down menu, the items are given by the option key.
  //      The value key will start the current selected option, if the value is
  //      not valid, the first item will be selected.
  //      -- 'color': a color property, will open a selector to choose any color
  //      -- 'button': a simple button that fires the onInput event when clicked.
  //   - min (number): the minimum value for the range type of property
  //   - max (number): the maximum value for the range type of property
  //   - step (number): the intervals of the 'range' type of property
  //   - option (string[]): all the values for the drop-down menu. Only needed
  //   for properties of type 'select'.
  //   
  this.openProperties = function(pObjs = []) {
    pContents.innerHTML = '';
    for (let obj of pObjs) {
      addObjectProperties(obj);
    }
  }

  //Private Functions
  //TODO: try to reduce the ammount of code in this function
  function addObjectProperties({name, props = [], onChange, onInput}) {
    let objElem = appendNewElement(pContents, 'div', 'property-object');
    //Creating Object Header
    if (name) {
      let header = appendNewElement(objElem, 'span', 'property-header');
      header.innerHTML = name;
    }
    for (let p of props) {addPropertyToObject(objElem, p);}
    if (onChange) {
      objElem.addEventListener('change', ({target, currentTarget}) => {
        target.blur();
        //onChange(propertyName, propertyValue): can return an object with the
        //following keys:
        //  - rename (string): If given, will rename the container of the
        //  property with this value.
        //  - replace (string): If given, will cancel the change and replace
        //  the value with this replace value.
        const response = onChange({
          name: target.parentElement.children[0].innerText,
          value: target.value,
          objId: Array.prototype.indexOf
            .call(currentTarget.parentElement.children, currentTarget)
        });
        if (!response) {return;}
        const {rename, replace} = response;
        if (rename) {currentTarget.firstChild.innerHTML = rename;}
        if (replace) {
          target.classList.add('warning');
          target.value = replace;
          target.addEventListener('transitionend', function blink() {
            target.classList.remove('warning');
            target.removeEventListener('transitionend', blink);
          })
        }
      });
    }
    if (onInput) {
      objElem.addEventListener('input', ({target, currentTarget}) => {
        onInput({
          name: target.parentElement.children[0].innerText,
          value: target.value,
          objId: Array.prototype.indexOf
            .call(currentTarget.parentElement.children, currentTarget)
        });
      });
    }
  }
  function addPropertyToObject(objElem, p) {
    let prContainer = appendNewElement(objElem, 'div', 'property-container');
    let prNameElem = appendNewElement(prContainer, 'span', 'property-name');
    prNameElem.innerHTML = p.name;
    prNameElem.title = p.name;

    //Create value element based on property type
    let prValueElem;
    if (p.type === 'select') {
      prValueElem = appendNewElement(prContainer, 'select', 'property-value');
      for (let opt of p.option) {
        let optElem = appendNewElement(prValueElem, 'option');
        optElem.innerHTML = opt;
        optElem.setAttribute('value', opt);
        if (p.value === opt) {optElem.selected = true;}
      }
    }
    else if (p.type === 'color') {
      //--Using default input color type
      //prValueElem = appendNewElement(prContainer, 'input', 'property-value');
      //prValueElem.setAttribute('type', 'color');
      //prValueElem.value = p.value;

      //--Using my ColorPicker class
      let colorString = ColorPicker.prototype.validateString(p.value);
      prValueElem = appendNewElement(prContainer, 'input', 'property-value');
      prValueElem.setAttribute('type', 'button');
      if (!colorString) {colorString = 'rgb(0, 0, 0)';}
      let color = ColorPicker.prototype.string2color(colorString);
      updateColorButton(prValueElem, color);
      prValueElem.addEventListener('click', ({target}) => {
        const colorInputCallback = function(color) {
          updateColorButton(target, color);
          target.dispatchEvent(new Event('input', {bubbles: true}));
        }
        openColorPicker(target, colorInputCallback).then(rgbColor => {
          updateColorButton(target, rgbColor);
          target.dispatchEvent(new Event('change', {bubbles: true}));
        });
      });
    }
    else if (p.type === 'range') {
      prValueElem = appendNewElement(prContainer, 'input', 'property-value range');
      prValueElem.setAttribute('type', 'range');
      prValueElem.setAttribute('value', p.value);
      prValueElem.setAttribute('step', p.step);
      prValueElem.setAttribute('min', p.min);
      prValueElem.setAttribute('max', p.max);
    }
    else if (p.type === 'button') {
      prValueElem = appendNewElement(prContainer, 'button', 'property-value');
      prValueElem.setAttribute('type', 'button');
      if (!p.value) {
        prValueElem.innerHTML = p.name;
        prNameElem.remove();
      }
      else {prValueElem.innerHTML = p.value}
      prValueElem.addEventListener('click', ({target}) => {
        target.dispatchEvent(new Event('input', {bubbles: true}));
      });
    }
    else { //type === 'number' or defaults to type === 'text'
      prValueElem = appendNewElement(prContainer, 'input', 'property-value');
      prValueElem.setAttribute('type', p.type === 'number' ? p.type : 'text');
      prValueElem.setAttribute('value', p.value);
    }
    if (p.disabled) {prValueElem.disabled = true;}
  }

  function openColorPicker(colorInputElement, colorChangeCallback) {
  return new Promise((resolve) => {
    let colorString = colorInputElement.value;
    let color = ColorPicker.prototype.string2color(colorString);
    let colorPicker = new ColorPicker(color, 200, 180);
    let bRect = colorInputElement.getBoundingClientRect();
    let pickerWindow = new Window({
      x: bRect.x, y: bRect.y + bRect.height, frame: false,
      parent: colorInputElement.parentElement, content: colorPicker.node()
    });
    pickerWindow.setPos(bRect.x, bRect.bottom);
    colorPicker.onColorInput(colorChangeCallback);
    colorPicker.onColorChange(rgbColor => {
      pickerWindow.close();
      resolve(rgbColor);
    }); 
  });}
  function updateColorButton(colorInputElement, rgbColor) {
    let fontColor;
    const [H, S, L] = ColorPicker.prototype.rgb2hsl(rgbColor);
    if (L + 0.2 * S < 0.6) {fontColor = 'rgb(240, 240, 240)';}
    else {fontColor = 'rgb(20, 20, 20)';}
    let colorString = ColorPicker.prototype.color2string(rgbColor, 'rgb');
    colorInputElement.style.color = fontColor;
    colorInputElement.style.backgroundColor = colorString;
    colorInputElement.value = colorString;
  }

  //Initialize object
  ;(function (){
    //Inheriting from Panel Object
    Panel.call(this, 'Properties');
    pContents = this.node().getElementsByClassName('panel-body')[0];
    pContents.classList.add('properties-panel');
  }).call(this);
}

//Setting prototype so as to inherit from Panel
PropertiesPanel.prototype = Object.create(Panel.prototype);
Object.defineProperty(PropertiesPanel.prototype, 'constructor', { 
  value: PropertiesPanel, enumerable: false, writable: true
});