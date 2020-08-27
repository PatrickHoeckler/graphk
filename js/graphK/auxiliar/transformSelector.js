"use strict";

module.exports = {TransformSelector};

const {NavTree} = require('./navTree.js');
const {appendNewElement} = require('./auxiliar.js');

function TransformSelector() {
  //Constants
  const navTree =  new NavTree(); //navigation tree object;
  const node = appendNewElement(null, 'div', 'transform-selector');

  //Public Attributes
  
  //Private Properties
  var transforms;
  var selectCallback;
  var mouseOverElem;
  var checkedElems;

  //Public Methods
  this.node = () => node;
  this.reset = function() {
    selectCallback = null;
    navTree.collapseAll();
    if (mouseOverElem) {mouseOverElem.style.backgroundColor = '';}
  }
  this.updateTransforms = function(_transforms) {
    transforms = _transforms;
    navTree.clear();
    checkedElems = [];
    for (let f of _transforms.value) {navTree.addToTree(f);}
    let folders = navTree.node().getElementsByClassName('folder-node');
    let leafs = navTree.node().getElementsByClassName('leaf-node');
    for (let node of folders) {
      let checkbox = appendNewElement(null, 'span', 'checkbox checked');
      node.insertBefore(checkbox, node.children[0]);
      checkedElems.push(checkbox);
    }
    for (let node of leafs) {
      let checkbox = appendNewElement(null, 'span', 'checkbox checked');
      node.replaceChild(checkbox, node.children[0]);
      checkedElems.push(checkbox);
    }
  }
  this.onSelect = (callback) => selectCallback = callback;
  this.cancelSelection = cancelSelection;
  //Private Functions
  function getSelectedTransforms() {
    let selected = {name: '.', value: []};
    checkedElems = [];
    (function getFromFolder(folder, folderTransforms, saveTo) {
      for (let i = 0; i < folder.children.length; i++) {
        let elem = folder.children[i];
        //if elem corresponds to a container (folder/pkg) of transformations
        if (elem.classList.contains('folder')) {
          let [folderDiv, contents] = elem.children;
          let checkbox = folderDiv.children[0];
          if (checkbox.classList.contains('checked')) {
            let next = [];
            saveTo.push({name:folderTransforms[i].name , value: next});
            checkedElems.push(checkbox);
            getFromFolder(contents, folderTransforms[i].value, next);
          }
        }
        //if elem corresponds to a leaf/transformation
        else {
          let checkbox = elem.children[0];
          if (checkbox.classList.contains('checked')) {
            checkedElems.push(checkbox);
            saveTo.push(folderTransforms[i]);
          }
        }
      }
    })(navTree.node(), transforms.value, selected.value);
    return selected;
  }
  function cancelSelection() {
    let checked = Array.from(navTree.node().getElementsByClassName('checked'));
    for (let elem of checked) {elem.classList.remove('checked');}
    for (let elem of checkedElems) {elem.classList.add('checked');}
    if (selectCallback) {selectCallback(null);}
  }
  //Initialize object
  (function () {
    transforms = null;
    selectCallback = null;
    appendNewElement(node, 'div', 'tree-wrapper').appendChild(navTree.node());
    let bWrapper = appendNewElement(node, 'div', 'button-wrapper');
    let apply = appendNewElement(bWrapper, 'button');
    let cancel = appendNewElement(bWrapper, 'button');
    apply.innerHTML = 'Apply';
    cancel.innerHTML = 'Cancel'
    apply.setAttribute('name', 'apply');
    cancel.setAttribute('name', 'cancel');

    navTree.node().addEventListener('mouseover', function (e) {
      if (mouseOverElem) {mouseOverElem.classList.remove('highlight');}
      mouseOverElem = navTree.getContainingElement(e.target);
      if (mouseOverElem) {mouseOverElem.classList.add('highlight');}
    });
    navTree.node().addEventListener('mouseout', function (e) {
      mouseOverElem = navTree.getContainingElement(e.target);
      if (mouseOverElem) {
        mouseOverElem.classList.remove('highlight');
        mouseOverElem = null;
      }
    });
    navTree.node().addEventListener('click', function (e) {
      let elem = navTree.getContainingElement(e.target);
      let hasChecked = false;
      if (!elem) {return;}
      //if clicked on a leaf or its checkbox
      if (elem.classList.contains('leaf-node')) {
        elem.children[0].classList.toggle('checked');
        hasChecked = true;
      }
      else { //if clicked on a folder
        if (e.target.classList.contains('checkbox')) {
          let checkboxes = elem.parentElement.getElementsByClassName('checkbox');
          if (e.target.classList.contains('checked')) {
            for (let c of checkboxes) {c.classList.remove('checked');}
          }
          else {
            hasChecked = true;
            for (let c of checkboxes) {c.classList.add('checked');}
          }
        }
        else {navTree.toggleFolder(elem);}
      }

      //if user has checked the box, check the boxes of the parents
      //which are not checked, if any
      if (hasChecked) {
        let node = elem;
        while (true) {
          node = node.parentElement;
          if (node.classList.contains('nav-tree')) {break;}
          if (!node.classList.contains('folder')) {continue;}
          node.children[0].children[0].classList.add('checked');
        }
      }
    });
    bWrapper.addEventListener('click', function (e) {
      if (e.target.name === 'apply') {
        let transforms = getSelectedTransforms();
        if (selectCallback) {selectCallback(transforms);}
      }
      else if(e.target.name === 'cancel') {cancelSelection();}
    })
  })();
}