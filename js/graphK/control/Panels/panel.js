'use strict';

module.exports = {Panel};

const {appendNewElement} = require('../../auxiliar/auxiliar.js')

function Panel(name = '', buttons = []) {
  if (!Array.isArray(buttons)) {throw new TypeError(
    'Expected an array for the argument buttons'
  );}
  //Constants
  const node = appendNewElement(null, 'div', 'panel');

  //Public Methods
  this.node = () => node;
  let panelBar = appendNewElement(node, 'div', 'panel-bar');
  appendNewElement(panelBar, 'span', 'panel-bar-indicator');
  appendNewElement(panelBar, 'span', 'panel-bar-name').innerHTML = name;
  let body = appendNewElement(node, 'div', 'panel-body');
  appendNewElement(body, 'div', 'panel-contents');
  if (buttons.length) {
    let toolbar = appendNewElement(body, 'div', 'panel-toolbar');
    for (let {className, tooltip} of buttons) {
      let pButton = appendNewElement(toolbar, 'span', 'panel-button');
      appendNewElement(pButton, 'span', className);
      if (tooltip) {pButton.setAttribute('title', tooltip);}
    }
  }
  panelBar.addEventListener('click',
    ({currentTarget}) => currentTarget.parentElement.classList.toggle('collapsed')
  );
}

Panel.prototype.setContent = function(elem) {
  //node.children[1] === .panel-body | (.panel-body).children[0] === .panel-contents
  let contents = this.node().children[1].children[0];
  contents.innerHTML = '';
  contents.appendChild(elem);
}
Panel.prototype.appendContent = function(elem) {
  this.node().children[1].children[0].appendChild(elem);
}
Panel.prototype.setContentClass = function(...tokens) {
  let contents = this.node().children[1].children[0];
  contents.className = 'panel-contents';
  contents.classList.add(...tokens);
}