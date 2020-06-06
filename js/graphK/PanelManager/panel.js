'use strict';

module.exports = {Panel};

const {appendNewElement} = require('../auxiliar/auxiliar.js');
function Panel(_name = 'Panel', buttons = []) {
  if (!Array.isArray(buttons)) {throw new TypeError(
    'Expected an array for the argument buttons'
  );}
  //Constants
  const node = appendNewElement(null, 'div', 'panel');
  //Private Properties
  var name;
  //Public Methods
  this.node = () => node;
  this.name = () => name;
  this.changeName = (_name) => name = _name;

  //Initialize Object
  (function() {
    name = _name;
    appendNewElement(node, 'div', 'panel-body');
    if (buttons.length) {
      let toolbar = appendNewElement(node, 'div', 'panel-toolbar');
      for (let {className, tooltip} of buttons) {
        let pButton = appendNewElement(toolbar, 'span', 'panel-button');
        appendNewElement(pButton, 'span', className);
        if (tooltip) {pButton.setAttribute('title', tooltip);}
      }
    }
  })();
}

Panel.prototype.setContent = function(elem) {
  let panelBody = this.node().children[0];
  panelBody.innerHTML = '';
  panelBody.appendChild(elem);
}
Panel.prototype.appendContent = function(elem) {
  this.node().children[0].appendChild(elem);
}
Panel.prototype.setContentClass = function(...tokens) {
  let panelBody = this.node().children[0];
  panelBody.className = 'panel-body';
  panelBody.classList.add(...tokens);
}
