"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

module.exports = {NavTree};

const {appendNewElement} = require('./auxiliar.js');
function NavTree() {
  //Public Methods
  this.node  = () => node;
  this.clear = () => node.innerHTML = '';
  this.addFolder = function (folder, parent = node) {
    let wrapper = appendNewElement(parent, 'div', 'collapsible collapsed');
    let folderDiv = appendNewElement(wrapper, 'div', 'folder');
    let contents = appendNewElement(wrapper, 'div', 'folder-contents');
    appendNewElement(folderDiv, 'span', 'node-icon');
    appendNewElement(folderDiv, 'span', 'node-name').innerHTML = folder.name;
    if (folder.type === 'pkg') {folderDiv.classList.add('pkg');}
    for (let file of folder.value) {
      if (typeof(file.value) === "object") {this.addFolder(file, contents);}
      else {
        let leaf = appendNewElement(contents, 'div', 'leaf');
        if (file.tooltip) {leaf.setAttribute('title', file.tooltip);}
        appendNewElement(leaf, 'span', 'node-icon');
        appendNewElement(leaf, 'span', 'node-name').innerHTML = file.name;
      }
    }
    return folderDiv;
  }
  //Searches up the parents to find the containing element of class 'folder' or 'leaf'
  this.getContainingElement = function (treeElem) {
    for (let curElem = treeElem;; curElem = curElem.parentElement) {
      if (!curElem || curElem === node) {return null;}
      if (curElem.classList.contains('folder') || curElem.classList.contains('leaf')) {return curElem;}
    }
  }
  this.toggleFolder = function (treeElem) {
    let container = this.getContainingElement(treeElem);
    if (
      container && //container must be true, else elem given is not part of tree
      container.classList.contains('folder') && //can only toggle folders
      !container.classList.contains('empty') //must not be a empty folder
    ) {container.parentElement.classList.toggle('collapsed');}
  }
  this.findPath = function (treeElem) {
    let container = this.getContainingElement(treeElem);
    if (!container) {return null;}
    //Finds path
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
      //if (!found)
    }
    return path;
  }
  this.isTopFolder = function (treeElem) {
    let container = this.getContainingElement(treeElem);
    return (
      container && container.classList.contains('folder') &&
      container.parentElement.parentElement.classList.contains('file-tree')
    );
  }
  this.getTopFolder = function (treeElem) {
    let top = node.children;
    for (let i = 0; i < top.length; i++) {
      if (top[i].contains(treeElem)) {return top[i].children[0];}
    }
    return null;
  }
  this.collapseAll = function() {
    let uncollapsed = node.getElementsByClassName('collapsible');
    for (let folder of uncollapsed) {folder.classList.add('collapsed');}
  }
  //Initialize object
  var node = appendNewElement(null, 'div', 'file-tree');
}