"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

graphK.NavTree = function() {
  //Public Methods
  this.node  = () => node;
  this.clear = () => node.textContent = '';
  this.addFolder = function (folder, parent = node) {
    let wrapper = graphK.appendNewElement(parent, 'div', 'collapsible collapsed');
    let folderDiv = graphK.appendNewElement(wrapper, 'div', 'folder');
    let branch = graphK.appendNewElement(wrapper, 'div', 'wrapper');
    graphK.appendNewElement(folderDiv, 'span', 'node-name').innerHTML = folder.name;
    if (folder.type === 'pkg') {folderDiv.classList.add('pkg');}
    for (let file of folder.value) {
      if (typeof(file.value) === "object") {this.addFolder(file, branch);}
      else {
        let leaf = graphK.appendNewElement(branch, 'div', 'leaf');
        if (file.tooltip) {leaf.setAttribute('title', file.tooltip);}
        graphK.appendNewElement(leaf, 'span', 'node-name').innerHTML = file.name;
      }
    }
    return folderDiv;
  }

  //this.addFolder = function (folder, folderName, parent = node) {
  //  let wrapper = graphK.appendNewElement(parent, 'div', 'collapsible collapsed');
  //  let folderDiv = graphK.appendNewElement(wrapper, 'div', 'folder');
  //  let branch = graphK.appendNewElement(wrapper, 'div', 'wrapper');
  //  graphK.appendNewElement(folderDiv, 'span', 'node-name').innerHTML = folderName;
  //  if (folder[i].type === 'pkg') {folderDiv.classList.add('pkg');}
  //  for (let i = 0; i < folder.length; i++) {
  //    if (typeof(folder[i].value) === "object") {
  //      this.addFolder(folder[i].value, folder[i].name, branch);
  //    }
  //    else {
  //      let leaf = graphK.appendNewElement(branch, 'div', 'leaf');
  //      if (folder[i].tooltip) {leaf.setAttribute('title', folder[i].tooltip);}
  //      graphK.appendNewElement(leaf, 'span', 'node-name').innerHTML = folder[i].name;
  //    }
  //  }
  //  return folderDiv;
  //}

  this.getContainingElement = function (elem) {
    for (let curElem = elem;; curElem = curElem.parentElement) {
      if (!curElem || curElem === node) {return null;}
      if (curElem.classList.contains('folder') || curElem.classList.contains('leaf')) {return curElem;}
    }
  }
  this.findPath = function (elem) {
    let container = this.getContainingElement(elem);
    if (!container) return null;
    let path = [];
    let curElem = node;
    while (curElem !== container) {
      for (let i = 0; i < curElem.children.length; i++) {
        if (curElem.children[i].contains(container)) {
          path.push(i);
          //if the element child is collapsible (is a directory)
          if (curElem.children[i].classList.contains('collapsible')) {
            curElem = curElem.children[i].children[0].contains(container) ?
                      curElem.children[i].children[0] : curElem.children[i].children[1];
          }
          //if the element child has no childs (is a leaf)
          else {
            curElem = curElem.children[i];
          }
        }
      }
    }
    return path;
  }
  this.isTopFolder = function (elem) {
    let container = this.getContainingElement(elem);
    if (!container) return false;
    if (!container.classList.contains('folder')) return false;
    if (container.parentElement.parentElement !== node) return false;
    return true;
  }
  this.getTopFolder = function (elem) {
    let top = node.children;
    for (let i = 0; i < top.length; i++) {
      if (top[i].contains(elem))
        return top[i].children[0];
    }
    return null;
  }
  this.toggleFolder = function (elem) {
    let container = this.getContainingElement(elem);
    if (!container) {return;}
    if (container.classList.contains('folder') && !container.classList.contains('empty')) {
      container.parentElement.classList.toggle('collapsed');
    }
  }

  //Initialize object
  var node = document.createElement('div');
  node.classList.value = 'file-tree';
}