"use strict";

module.exports = {TransformSelector};

const {NavTree} = require('./navTree.js');
const {appendNewElement, createButtonWrapper} = require('./auxiliar.js');

function TransformSelector() {
  //Constants
  const navTree = new NavTree();
  //Public Attributes
  
  //Private Properties
  var mouseOverElem;
  var transforms;

  //Public Methods
  this.updateTransforms = function(newTransforms) {
    transforms = newTransforms;
    navTree.clear();
    for (let tf of transforms.value) {
      navTree.addToTree(tf, content => content);
    }
    (function checkAllInBranch(branchElem) {
      let contents = navTree.getFolderContents(branchElem);
      for (let elem of contents) {
        elem.classList.add('checked');
        if (!navTree.isLeaf(elem)) {checkAllInBranch(elem);}
      }
    })(navTree.node());
  }
  /**
  * Creates the HTMLElements and event handlers necessary to select a set of
  * transformations given as argument.
  * @return {Promise} Promise that will resolve with the selected transforms
  * or with `null` if the action was cancelled by the user.
  */
  this.selectTransform = function selectTransforms(appendTo) {
  return new Promise(resolve => {
    const node = appendNewElement(appendTo, 'div', 'transform-selector');
    appendNewElement(node, 'div', 'tree-wrapper').appendChild(navTree.node());
    node.appendChild(createButtonWrapper(['Apply', 'Cancel'], button => {
      if (button === 'Apply') {
        updateCheckedTransforms();
        resolve(transforms);
      }
      else {resolve(null);}
      navTree.node().remove();
      node.remove();
    }));
  });}

  //Private Functions
  function toggleSelect(treeElem, checkParent = true) {
    const isChecked = treeElem.classList.toggle('checked');
    if (!navTree.isLeaf(treeElem)) {
      let contents = navTree.getFolderContents(treeElem);
      for (let elem of contents) {
        if (isChecked === elem.classList.contains('checked')) {continue;}
        if (navTree.isLeaf(elem)) {elem.classList.toggle('checked');}
        else {toggleSelect(elem, false);}
      }
    }
    if (checkParent) {
      let parent = treeElem;
      while (parent = navTree.getParentFolder(parent)) {
        if (parent === navTree.node()) {break;}
        if (isChecked) {parent.classList.add('checked');}
        else {
          let contents = navTree.getFolderContents(parent);
          if (contents.some(elem => elem.classList.contains('checked'))) {break;}
          else {parent.classList.remove('checked');}
        }
      }
    }
  }

  function updateCheckedTransforms() {
    (function searchBranch(branchElem) {
      let branchTransform = navTree.elemData(branchElem) || transforms;
      branchTransform.value = [];
      let contents = navTree.getFolderContents(branchElem);
      for (let elem of contents) {
        if (!elem.classList.contains('checked')) {continue;}
        if (!navTree.isLeaf(elem)) {searchBranch(elem);}
        branchTransform.value.push(navTree.elemData(elem));
      }
    })(navTree.node());

  }

  //Initialize object
  (function () {
    navTree.node().addEventListener('mouseover', ({target}) => {
      target = navTree.getContainingElement(target);
      if (mouseOverElem === target) {return;}
      if (mouseOverElem) {mouseOverElem.classList.remove('highlight');}
      if (target) {target.classList.add('highlight');}
      mouseOverElem = target;
    });
    navTree.node().addEventListener('mouseout', ({target}) => {
      mouseOverElem = null;
      target = navTree.getContainingElement(target);
      if (target) {target.classList.remove('highlight');}
    });
    navTree.node().addEventListener('click', ({target}) => {
      let elem = navTree.getContainingElement(target);
      if (!elem) {return;}
      if (!navTree.isLeaf(elem) && target.classList.contains('node-icon')) {
        navTree.toggleFolder(elem);
      }
      else {toggleSelect(elem);}
    });
  })();
}
