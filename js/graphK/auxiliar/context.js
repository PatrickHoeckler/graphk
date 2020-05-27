"use strict";

module.exports = {Context};

function Context(x = 0, y = 0, items = [], callback = null, weak = true) {
  //Private Functions
  function itemSelected(event) {
    let item = getContainingItem(event.target);
    if (!item || !item.classList.contains('active')) {return;}
    if (item.classList.contains('submenu')) {return;}
    if (isWeak) {
      window.removeEventListener('blur' , removeSelf);
      overlay.removeEventListener('mousedown', removeSelf);
      div.style.display = 'none';
    }    
    if (itemSelectionCallback) {itemSelectionCallback(item.children[0].name);}
  }
  function removeSelf() {
    div.style.display = 'none';
    if (itemSelectionCallback) {itemSelectionCallback(null);}
    while (openedSubMenus.length) {
      let {elem, timeoutID} = openedSubMenus.pop();
      elem.classList.remove('open');
      if (timeoutID) {clearTimeout(timeoutID)};
    }
  }
  function getContainingItem(elem) {
    for (;;elem = elem.parentElement) {
      if (elem === div) {return null;}
      if (elem.classList.contains('item')) {return elem;}
    }
  }
  function createMenu(items) {
    //Check for correct type of argument
    if (!Array.isArray(items)) {throw new TypeError("Expected Array for arugment 'items'");}
    //Creates the menu container
    let newMenu = document.createElement('div'); newMenu.classList.add('context-menu');
    let ul = document.createElement('ul');
    ul.classList.add('item-list');
    newMenu.appendChild(ul);

    for (let itemInfo of items) {
      //Check for correct type of argument
      if (typeof(itemInfo) !== 'object' || itemInfo === null) {
        throw new TypeError("Argument 'items' shold only contain objects indicating " +
        `each the item details, found item of type ${typeof(itemInfo)}`);
      }
      //Creates context item and gives a class based on its type
      let item = document.createElement('li'); item.classList.add('item');
      let label = document.createElement('a'); label.classList.add('item-label');
      ul.appendChild(item);
      item.appendChild(label);
      if (itemInfo.type === 'separator') {item.classList.add('separator');}
      else {
        let name = itemInfo.name ? itemInfo.name : '';
        label.innerText = name;
        label.name = itemInfo.return ? itemInfo.return : name;
        if (itemInfo.type === 'inactive') {item.classList.add('inactive');}
        else if (itemInfo.type === 'submenu') {
          item.classList.add('active', 'submenu');
          if (!itemInfo.submenu) {throw new Error (
            'Item of type submenu given to context menu does not contain submenu information'
          );}
          let indicator = document.createElement('span'); indicator.className = 'indicator';
          let subMenu = createMenu(itemInfo.submenu);
          item.appendChild(indicator);
          item.appendChild(subMenu);
        }
        else {item.classList.add('active');}
      }
    }
    return newMenu;
  }
  function showSubmenu(event) {
    let item = getContainingItem(event.target);
    if (!item || !item.classList.contains('submenu')) {return;}
    let subMenu = item.children[2];
    if (subMenu.classList.contains('open')) {return;}
    //Closes any other open submenu
    for (let i = openedSubMenus.length - 1; i >= 0; i--) {
      if (openedSubMenus[i].elem.contains(subMenu)) {break;}
      let {elem, timeoutID} = openedSubMenus.pop();
      elem.classList.remove('open');
      if (timeoutID) {clearTimeout(timeoutID);}
    }
    //if subMenu wasn't positioned correctly
    if (!subMenu.style.top) {
      subMenu.style.visibility = 'hidden';
      subMenu.classList.add('open');
      //get positioning information
      let bRect = item.getBoundingClientRect();
      let {height, width} = subMenu.getBoundingClientRect();
      let docHeight = document.documentElement.clientHeight;
      let docWidth = document.documentElement.clientWidth;
      //Sets top and left as to not overflow the context menu
      let sLeft, sTop;
      if (docWidth < bRect.left + bRect.width + width) {sLeft = 2 - width;}
      else {sLeft = bRect.width - 2;}
      if (docHeight < bRect.top + bRect.height + height) {sTop = 2 + bRect.height - height;}
      else {sTop = -2;}
      subMenu.style.left = `${sLeft}px`;
      subMenu.style.top = `${sTop}px`;
      subMenu.style.visibility = '';
    }
    subMenu.classList.add('open');
    openedSubMenus.push({elem: subMenu, timeoutID: 0});
  }
  function setSubmenuTimeout(event) {
    for (let opened of openedSubMenus) {
      if (opened.elem.parentElement.contains(event.target)) {
        if (opened.timeoutID) {
          opened.timeoutID = clearTimeout(opened.timeoutID);
        }
      }
      else {
        if (opened.timeoutID) {return;}
        opened.timeoutID = setTimeout(() => hideSubmenu(opened.elem), 1000);
      }
    }
  }
  function hideSubmenu(subMenu) {
    for (let i = 0; i < openedSubMenus.length; i++) {
      if (openedSubMenus[i].elem !== subMenu) {continue;}
      for (let j = i; j < openedSubMenus.length; j++) {
        let opened = openedSubMenus[j];
        opened.elem.classList.remove('open');
        opened.timeoutID = clearTimeout(opened.timeoutID);
      }
      openedSubMenus.splice(i);
      break;
    }
  }

  //Public Methods
  this.appendTo = function(elem) {
    if (!div) {throw new Error(
      "Can't append context menu to element because the menu was not created beforehand."
    );}
    //initially menu is hidden until positioned correctly
    menu.style.visibility = 'hidden';
    elem.appendChild(div);
    //uses height and width to calculate values for top and left
    let {height, width} = menu.getBoundingClientRect();
    let docHeight = document.documentElement.clientHeight;
    let docWidth = document.documentElement.clientWidth;
    if (docHeight < top) {top = docHeight - height;}
    else if (docHeight < top + height) {top -= height;}
    if (docWidth  < left + width) {left = docWidth - width;}
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    //stops hidding menu
    menu.style.visibility = '';
  }
  this.hide = removeSelf;
  this.show = () => div.style.display = '';
  this.destroy = function() {
    window.removeEventListener('blur' , removeSelf);
    if (overlay) {overlay.removeEventListener('mousedown', removeSelf);}
    if (div) {div.remove();}
    div = menu = overlay = null;
    itemSelectionCallback = null;
    top = left = 0;
    while (openedSubMenus.length) {
      let timeoutID = openedSubMenus.pop().timeoutID;
      if (timeoutID) {clearTimeout(timeoutID)};
    }
    openedSubMenus = [];
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
    div = document.createElement('div'); div.className = 'context-container';
    overlay = document.createElement('div'); overlay.className = 'context-overlay';
    menu = createMenu(items);
    menu.classList.add('open');
    div.appendChild(overlay);
    div.appendChild(menu);

    //Add event listeners
    menu.addEventListener('mouseup', itemSelected);
    if (isWeak = !!weak) {
      overlay.addEventListener('mousedown', removeSelf);
      window.addEventListener('blur' , removeSelf);
    }
    //if the context menu contains any submenu, add handlers to support them
    if (menu.getElementsByClassName('submenu').length) {
      menu.addEventListener('click', showSubmenu);
      menu.addEventListener('mouseover', setSubmenuTimeout);
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
  var openedSubMenus;
  var isWeak;
  var itemSelectionCallback;

  //Initialize object
  (function (){
    openedSubMenus = [];
    this.create(x, y, items, weak);
    this.onItemSelection(callback);
  }).call(this);
}