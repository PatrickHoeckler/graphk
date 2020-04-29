"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

graphK.TransformSelector = function () {
  //Constants
  const navTree =  new graphK.NavTree(); //navigation tree object;
  const node = graphK.appendNewElement(null, 'div', 'transform-selector');

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
    let folders = navTree.node().getElementsByClassName('collapsible');
    for (let f of folders) {f.classList.add('collapsed');}
    if (mouseOverElem) {mouseOverElem.style.backgroundColor = '';}
  }
  this.updateTransforms = function(_transforms) {
    transforms = _transforms;
    navTree.clear();
    checkedElems = [];
    for (let f of _transforms.value) {navTree.addFolder(f);}
    let folders = navTree.node().getElementsByClassName('folder');
    let leafs = navTree.node().getElementsByClassName('leaf');
    for (let node of folders) {
      let checkbox = graphK.appendNewElement(null, 'span', 'checkbox checked');
      node.insertBefore(checkbox, node.children[0]);
      checkedElems.push(checkbox);
    }
    for (let node of leafs) {
      let checkbox = graphK.appendNewElement(null, 'span', 'checkbox checked');
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
        if (elem.classList.contains('collapsible')) {
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
  transforms = null;
  selectCallback = null;
  graphK.appendNewElement(node, 'div', 'tree-wrapper').appendChild(navTree.node());
  let bWrapper = graphK.appendNewElement(node, 'div', 'button-wrapper');
  let apply = graphK.appendNewElement(bWrapper, 'button');
  let cancel = graphK.appendNewElement(bWrapper, 'button');
  apply.innerHTML = 'Apply';
  cancel.innerHTML = 'Cancel'
  apply.setAttribute('name', 'apply');
  cancel.setAttribute('name', 'cancel');

  navTree.node().addEventListener('mouseover', function (e) {
    mouseOverElem = navTree.getContainingElement(e.target);
    if (mouseOverElem) {mouseOverElem.style.backgroundColor = 'rgb(70,70,70)';}
  });
  navTree.node().addEventListener('mouseout', function (e) {
    mouseOverElem = navTree.getContainingElement(e.target);
    if (mouseOverElem) {mouseOverElem.style.backgroundColor = '';}
  });
  navTree.node().addEventListener('click', function (e) {
    let elem = navTree.getContainingElement(e.target);
    let hasChecked = false;
    if (!elem) {return;}
    //if clicked on a leaf or its checkbox
    if (elem.classList.contains('leaf')) {
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
        if (node.classList.contains('file-tree')) {break;}
        if (!node.classList.contains('collapsible')) {continue;}
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
}