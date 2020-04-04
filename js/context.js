function ContextMenu(x = 0, y = 0, items = [], callback = null) {
  //Private Functions
  function itemSelected(event) {
    if (!itemSelectionCallback) {return;}
    let elem; 
    for (elem of event.path) {
      if (elem === div) {return;}
      if (elem.classList.contains('item-content')) {break;}
    }
    if (!elem.classList.contains('active')) {return;}
    itemSelectionCallback(elem.name);
  }

  //Public Methods
  this.node = () => div;
  this.appendTo = function(elem) {
    if (div) {div.remove();}
    elem.appendChild(div);
    let {height, width} = div.getBoundingClientRect();
    let docHeight = document.documentElement.clientHeight;
    let docWidth = document.documentElement.clientWidth;
    if (docHeight < top) {top = docHeight - height;}
    else if (docHeight < top + height) {top -= height;}
    if (docWidth  < left + width) {left = docWidth - width;}
    div.style.left = `${left}px`;
    div.style.top = `${top}px`;
  }
  this.destroy = function() {
    if (div) {div.remove();}
    div = null;
    top = left = 0;
  }
  this.createMenu = function (x = 0, y = 0, items = []) {
    //Check for correct type of argument
    if (!Array.isArray(items)) {throw new TypeError("Expected Array for arugment 'items'");}
    //Creates the context menu container
    this.destroy();
    left = x; top = y;
    div = document.createElement('div');
    div.classList.add('context');
    let ul = document.createElement('ul');
    ul.classList.add('item-list');
    div.appendChild(ul);

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
    div.addEventListener('mouseup', itemSelected);
    div.addEventListener('contextmenu', itemSelected);
  }
  this.onItemSelection = function(callback) {
    if (typeof(callback) !== 'function' && callback !== null) {
      throw new TypeError(`Expected 'callback' to be of type function or null, got ${typeof(callback)}`);
    }
    itemSelectionCallback = callback;
  }

  //Private Properties
  var div, top, left;  //context menu element and its position
  var itemSelectionCallback;

  //Initialize object
  this.createMenu(x, y, items);
  this.onItemSelection(callback);
  items = null; //dereference items array
}