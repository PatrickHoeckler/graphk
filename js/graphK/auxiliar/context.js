"use strict";

graphK.Context = function (x = 0, y = 0, items = [], callback = null, weak = true) {
  //Private Functions
  function itemSelected(event) {
    let elem; 
    for (elem of event.path) {
      if (elem === div) {return;}
      if (elem.classList.contains('item-content')) {break;}
    }
    if (!elem.classList.contains('active')) {return;}
    if (isWeak) {
      window.removeEventListener('blur' , removeSelf);
      overlay.removeEventListener('mousedown', removeSelf);
      div.style.display = 'none';
    }
    if (itemSelectionCallback) {itemSelectionCallback(elem.name);}
  }
  function removeSelf() {
    window.removeEventListener('blur' , removeSelf);
    overlay.removeEventListener('mousedown', removeSelf);
    div.style.display = 'none';
    if (itemSelectionCallback) {itemSelectionCallback(null);}
  }

  //Public Methods
  this.node = () => div;
  this.appendTo = function(elem) {
    if (!div) {throw new Error(
      "Can't append context menu to element because the menu was not created beforehand."
    );}
    elem.appendChild(div);
    let {height, width} = menu.getBoundingClientRect();
    let docHeight = document.documentElement.clientHeight;
    let docWidth = document.documentElement.clientWidth;
    if (docHeight < top) {top = docHeight - height;}
    else if (docHeight < top + height) {top -= height;}
    if (docWidth  < left + width) {left = docWidth - width;}
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  }
  this.hide = () => !!(div.style.display = 'none');
  this.show = function (weak = true) {
    div.style.display = '';
    if (isWeak = !!weak) {
      overlay.addEventListener('mousedown', removeSelf);
      window.addEventListener('blur' , removeSelf);
    }
  }
  this.destroy = function() {
    if (div) {div.remove();}
    div = menu = overlay = null;
    itemSelectionCallback = null;
    top = left = 0;
  }
  this.create = function (x = 0, y = 0, items = [], weak = true) {
    //Check for correct type of argument
    if (!Array.isArray(items)) {throw new TypeError("Expected Array for arugment 'items'");}
    if (typeof(x) !== 'number' && typeof(y) !== 'number') {
      throw new TypeError("Expected a number value for arguments 'x' and 'y'");
    }
    //Creates the context menu container
    this.destroy();
    left = x; top = y;
    div = document.createElement('div');
    overlay = document.createElement('div'); overlay.classList.add('context-overlay');
    menu = document.createElement('div'); menu.classList.add('context-menu');
    div.appendChild(overlay);
    div.appendChild(menu);
    let ul = document.createElement('ul');
    ul.classList.add('item-list');
    menu.appendChild(ul);

    for (let itemInfo of items) {
      //Check for correct type of argument
      if (typeof(itemInfo) !== 'object' || itemInfo === null) {
        this.destroy();
        throw new TypeError("Argument 'items' shold only contain objects indicating " +
        `each the item details, found item of type ${typeof(itemInfo)}`);
      }
      //Creates context item and gives a class based on its type
      let item = document.createElement('li');
      item.classList.add('item');
      let a = document.createElement('a');
      a.classList.add('item-content');
      if (itemInfo.type === 'separator') {a.classList.add('separator');}
      else {
        if (itemInfo.type === 'inactive') {a.classList.add('inactive');}
        else {a.classList.add('active');}
        let name = itemInfo.name ? itemInfo.name : '';
        a.innerText = name;
        a.name = itemInfo.return ? itemInfo.return : name;
      }
      item.appendChild(a);
      ul.appendChild(item);
    }

    //Add event listeners
    menu.addEventListener('mouseup', itemSelected);
    menu.addEventListener('contextmenu', itemSelected);
    if (isWeak = !!weak) {
      overlay.addEventListener('mousedown', removeSelf);
      window.addEventListener('blur' , removeSelf);
    }
  }
  this.onItemSelection = function(callback) {
    if (typeof(callback) !== 'function' && callback !== null) {
      throw new TypeError(`Expected 'callback' to be of type function or null, got ${typeof(callback)}`);
    }
    itemSelectionCallback = callback;
  }

  //Private Properties
  var div, menu, overlay; //main elements of context menu
  var top, left;  //context menu position
  var isWeak;
  var itemSelectionCallback;
  

  //Initialize object
  (function (){
    this.create(x, y, items, weak);
    this.onItemSelection(callback);
  }).call(this);
}