"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

graphK.Toolbar = function(icons) {
  //Public Attributes

  //Private Properties
  var node;
  //Public Methods
  this.node = () => node;

  //Private Functions


  //Initialize object
  node = graphK.appendNewElement(null, 'div', 'toolbar');
  for (let i = 0; i < icons.length; i++) {
    graphK.appendNewElement(node, 'span', `gpk ${icons[i].name}`)
      .setAttribute('title', icons[i].tooltip);
  }
}