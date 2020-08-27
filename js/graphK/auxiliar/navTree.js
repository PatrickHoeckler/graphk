"use strict";

module.exports = {NavTree};
const {appendNewElement} = require('./auxiliar.js');

function NavTree() {
  const node = appendNewElement(null, 'div', 'nav-tree');
  this.node  = () => node;
}

function addFolder(folder, parent) {
  let folderDiv = appendNewElement(parent, 'div', 'folder collapsed');
  let folderNode = appendNewElement(folderDiv, 'div', 'folder-node');
  let contents = appendNewElement(folderDiv, 'div', 'folder-contents');
  appendNewElement(folderNode, 'span', 'node-icon');
  appendNewElement(folderNode, 'span', 'node-name').innerHTML = folder.name;
  if (folder.type === 'pkg') {folderDiv.classList.add('pkg');}
  if (folder.data) {folderDiv[NavTree.dataSymbol] = folder.data;}
  for (let file of folder.value) {
    if (typeof(file.value) === "object") {addFolder(file, contents);}
    else {addLeaf(file, contents);}
  }
  return folderNode;
}

function addLeaf(leaf, parent) {
  let leafNode = appendNewElement(parent, 'div', 'leaf-node');
  if (leaf.tooltip) {leafNode.setAttribute('title', leaf.tooltip);}
  if (leaf.data) {leafNode[NavTree.dataSymbol] = leaf.data;}
  appendNewElement(leafNode, 'span', 'node-icon');
  appendNewElement(leafNode, 'span', 'node-name').innerHTML = leaf.name;
  return leafNode;
}

NavTree.prototype = {
  constructor: NavTree,
  clear: function() {this.node().innerHTML = '';},
  addToTree: function(data, parent) {
    if (!parent) {parent = this.node();}
    if (typeof(data.value) === "object") {return addFolder(data, parent);}
    else {return addLeaf(data, parent);}
  },
  //Searches up the parents to find the containing element of class
  //'folder-node' or 'leaf-node'
  getContainingElement: function (treeElem) {
    for (let curElem = treeElem;; curElem = curElem.parentElement) {
      if (!curElem || curElem === this.node()) {return null;}
      if (curElem.classList.contains('leaf-node') ||
        curElem.classList.contains('folder-node')
      ) {return curElem;}
    }
  },
  collapseAll: function() {
    let uncollapsed = this.node().getElementsByClassName('collapsible');
    for (let folder of uncollapsed) {folder.classList.add('collapsed');}
  },
  getTopFolder: function (treeElem) {
    for (let child of this.node().children) {
      if (child.contains(treeElem)) {return child.children[0];}
    }
    return null;
  },
  isTopFolder: function (treeElem) {
    let container = this.getContainingElement(treeElem);
    return (
      container && container.classList.contains('folder-node') &&
      container.parentElement.parentElement === this.node()
    );
  },
  findPath:  function (treeElem) {
    let container = this.getContainingElement(treeElem);
    if (!container) {return null;}
    let path = [], curElem = this.node();
    while (curElem !== container) {
      let found = false;
      for (let i = 0, n = curElem.children.length; i < n; i++) {
        let child = curElem.children[i];
        if (!child.contains(container)) {continue;}
        found = true;
        path.push(i);
        if (child.classList.contains('folder')) {
          curElem = child.children[0].contains(container) ?
            child.children[0] : child.children[1];
        }
        else {curElem = child;}
        break;
      }
      if (!found) {return null;}
    }
    return path;
  },
  toggleFolder: function (treeElem) {
    let container = this.getContainingElement(treeElem);
    if (
      container && //container must be true, else elem given is not part of tree
      container.classList.contains('folder-node') && //can only toggle folders
      !container.parentElement.classList.contains('empty') //must not be a empty folder
    ) {container.parentElement.classList.toggle('collapsed');}
  },
  //sets the bound data for the container element of treeElem or,
  //if data is undefined, returns the current bound data
  elemData: function(treeElem, data) {
    let container = this.getContainingElement(treeElem);
    if (!container) {return null;}
    return !data ? container[NavTree.dataSymbol] :
      (container[NavTree.dataSymbol] = data);
  }
}
Object.defineProperty(NavTree, 'dataSymbol', {value: Symbol('NavTree')});