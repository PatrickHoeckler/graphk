"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
// - Isso aqui parece muito pouco código pra um único módulo, analisar alternativas
//   para o uso deste módulo (Talvez até tirar a toolbar do programa e substituir a
//   funcionalidade pelas barras específicas de cada painel).
//

module.exports = {Toolbar};

const {appendNewElement} = require('./auxiliar/auxiliar.js')
function Toolbar(icons) {
  //Public Attributes

  //Private Properties
  var node;
  //Public Methods
  this.node = () => node;

  //Private Functions

  //Initialize object
  node = appendNewElement(null, 'div', 'toolbar');
  for (let i = 0; i < icons.length; i++) {
    appendNewElement(node, 'span', `gpk ${icons[i].name}`)
      .setAttribute('title', icons[i].tooltip);
  }
}