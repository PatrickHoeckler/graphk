"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
// - No 'selectCallback' a função retorna o 'path' do elemento selecionado ao invés dos dados.
//   Como por fora, esse 'path' é usado para obter os dados, talvez fosse mais facil passar
//   os dados diretamente.

module.exports = {TransformPanel};

const {appendNewElement} = require('../../auxiliar/auxiliar.js');
const {NavTree} = require('../../auxiliar/navTree.js');
const {Panel} = require('../../PanelManager/panel.js');
const d3 = require('d3');
const fs = require('fs');

function TransformPanel(modeObj) {
  if (modeObj === null || typeof(modeObj) !== 'object') {throw new Error(
    'Cannot create object without a reference to a Mode() object to hold ' +
    'the mode of operation of this object'
  );}
  //Constants
  const mode = modeObj;
  const filenameFormat = /^[^\\/?<>:|\"*^]{1,128}$/;
  const navTree =  new NavTree(); //navigation tree object;
  const selectedElems = [];
  //Public Attributes

  //Private Properties
  var toolbar, toolbarLevel;
  var files = [];
  var transforms;
  var mouseOverElem; //used to change highlight on change of mode
  //  callback functions
  var contextCallback;
  var callParent = () => Promise.reject(new Error('callParent not set'));
  var selectTreeElem = () => null;

  //Public Methods
  this.renameFile = renameFile;
  this.deleteFromTree = deleteFromTree;
  this.getDataFromPath = getDataFromPath;
  this.getTransformFromPath = getTransformFromPath;
  this.getDataFromTreeElement = (treeElem) => getDataFromPath(navTree.findPath(treeElem));
  this.startDataSelect = () => new Promise((resolve) => {
    //won't start if can't change mode to SELECT
    if (!mode.change(mode.SELECT)) {throw new Error(
      'Could not change to select mode'
    );}
    mode.lock();
    selectTreeElem = function(treeElem) {
      let isTopFolder = navTree.isTopFolder(treeElem);
      if (treeElem && !isTopFolder && !treeElem.classList.contains('ready')) {return;}
      selectTreeElem = () => null;
      //gets path in the tree of the element clicked
      mode.unlock();
      if (!mode.change(mode.NORMAL)) {throw new Error(
        'Could not revert back to normal mode at the end of Data Selection. Review ' + 
        'the check callbacks of the Mode object to see which one did not allow the change'
      );};
      if (treeElem === null) {return resolve({canceled: true});}
      let path = navTree.findPath(treeElem);
      let data = getDataFromPath(path);
      treeElem.classList.remove('highlight');
      return resolve({data, path, canceled: false});
    }
  });
  this.stopDataSelect = () => selectTreeElem(null);
  this.addToTree = addToTree;
  //  reads file given by path
  this.readFile = readFile;
  this.updateTransforms = function(newTransforms) {
    if (!transforms) {
      transforms = newTransforms;
      return;
    }
    //Step 1 - Recreate the file tree with new transforms
    let oldTransforms = transforms;
    transforms = newTransforms;
    navTree.clear();
    for (let k = 0; k < files.length; k++) {
      let folderDiv = navTree.addFolder({name: files[k].name, value: newTransforms.value});
      if (!files[k].value) {folderDiv.classList.add('empty');}
      else {folderDiv.draggable = true;}
    }

    //Step 2 - Create an array for the old and new structure of each file
    let oldStructure = [];
    let newStructure = [];
    for (let k = 0; k < files.length; k++) {
      //Join all old structures in oldStructure array
      oldStructure.push(files[k].structure);
      //Create one structure for each file
      newStructure.push(genTransformsStructure(newTransforms));
    }

    //Step 3 - Compare which transformation is kept in this change
    //it's value in the newStructure array
    let oldPath = [];
    let newPath = [];
    (function compareTransforms(oldTf, newTf) {
      if (!oldTf || !newTf) {return;}
      for (let i = 0; i < oldTf.length; i++) {
        //if oldTf[i] corresponds to a folder
        if (oldTf[i].value) {
          for (let j = 0; j < newTf.length; j++) {
            if (oldTf[i].name === newTf[j].name) {
              oldPath.push(i); newPath.push(j);
              compareTransforms(oldTf[i].value, newTf[j].value);
              break;
            }
          }
        }
        //if oldTf[i] corresponds to a transformation 
        else {
          for (let j = 0; j < newTf.length; j++) {
            //if newTf also contains the oldTf[i] transformation
            if (newTf[j] === oldTf[i]) {
              for (let k = 0; k < files.length; k++) {
                let oldData = oldStructure[k];
                let newData = newStructure[k];
                for (let p = 0, n = oldPath.length - 1;; p++) {
                  oldData = oldData[oldPath[p]];
                  if (p !== n) {newData = newData[newPath[p]];}
                  else {
                    newData[newPath[p]] = oldData;
                    break;
                  }
                }
              }
            }
          }
        }
      }
      oldPath.pop();
      newPath.pop();
    })(oldTransforms.value, newTransforms.value);

    //Step 4 - Update the structure for every file
    for (let k = 0; k < files.length; k++) {files[k].structure = newStructure[k];}

    //Step 5 - Change the tree elements which correspond to an already calculated
    //transformation to ready
    for (let k = 0; k < files.length; k++) {
      let fileElem = navTree.node().children[k];
      (function checkElem(contents, structure, transforms) {
        for (let i = 0; i < contents.length; i++) {
          if (contents[i].classList.contains('collapsible')) { checkElem(
            contents[i].children[1].children, structure[i], transforms[i].value
          );}
          else {
            if (structure[i] !== null) {
              if (transforms[i].type !== 'no-plot') {contents[i].draggable = true;}
              contents[i].classList.add('ready');
              if (typeof(structure[i]) === 'number') {
                contents[i].title += contents[i].title ? 
                  '\nValue calculated: ' + structure[i] : 
                  'Value calculated: '   + structure[i];
              }
            }
          }
        }
      })(fileElem.children[1].children, files[k].structure, newTransforms.value);
    }
  }
  this.onCallParent = function (
    executor = () => Promise.reject(new Error('callParent not set'))
  ) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  this.onContext = (callback) => contextCallback = callback;

  //Private Functions
  function readFile(filePath) {
    let fileName = filePath.split('\\').pop().split('/').pop();
    //reads file
    let data = [];
    let dataText = d3.csvParseRows(fs.readFileSync(filePath, 'utf8'));
    for (let i = 0; i < dataText.length; i++)
      data.push([Number(dataText[i][0]), Number(dataText[i][1])]);
    addToTree(fileName, data);
  }
  function addToTree(name = '', value, openRenameBox = false) {
    if (typeof(name) !== 'string' || !filenameFormat.test(name)) {return false;}
    let folderDiv = navTree.addFolder({name: name, value: transforms.value});
    if (!value) {
      folderDiv.classList.add('empty');
      files.push({name: name});
    }
    else {
      let structure = genTransformsStructure(transforms);
      //pushes data read and clone to files array
      files.push({name: name, value: value, structure: structure});
      folderDiv.draggable = true;
    }
    if (openRenameBox) {renameFile(folderDiv);}
    return true;
  }
  //  Rename navTree file
  function renameFile(treeElem) {
    let elem = navTree.getContainingElement(treeElem);
    if (!elem|| !navTree.isTopFolder(elem)) {return false;}
    if (!mode.change(mode.RENAME)) {return false;}
    mode.lock();
    let textElem = elem.getElementsByClassName('node-name')[0];
    let name = textElem.innerText;
    //Creates div element that will appear if the name is invalid
    let warningBox = appendNewElement(navTree.node(), 'div', 'warning')
    warningBox.style.display = 'none';  //starts invisible
    warningBox.innerHTML = 'Nome inválido para arquivo';
    textElem.style.display = 'none';
    //Creates input element
    let renameBox = appendNewElement(elem, 'input', 'rename');
    renameBox.setAttribute('type', 'text');
    renameBox.setAttribute('value', name);

    //Functions to handle input events
    function checkStopKeys(e) {
      if ((e.keyCode === 13 && filenameFormat.test(renameBox.value)) || e.keyCode === 27) {
        renameBox.blur();
      }
    }
    function checkInput() {
      if (!filenameFormat.test(renameBox.value)) {
        if (warningBox.style.display === 'none') {
          //positions warning box bellow rename box and shows it
          let bRect = renameBox.getBoundingClientRect();
          warningBox.style.left = `${bRect.left}px`;
          warningBox.style.top = `${bRect.bottom}px`;
          warningBox.style.width = `${bRect.width}px`;
          warningBox.style.display = '';
          renameBox.classList.add('warning');
        }
      }
      else if (warningBox.style.display === ''){
        warningBox.style.display = 'none';
        renameBox.classList.remove('warning');
      }
    }
    function setName() {
      if (filenameFormat.test(renameBox.value) && name !== renameBox.value) {
        name = renameBox.value;
        let file = files[navTree.findPath(elem)[0]];
        file.name = name;
      }
      mode.unlock();
      mode.change(mode.NORMAL);
      textElem.innerHTML = name;
      textElem.style.display = '';
      warningBox.remove();
      renameBox.remove();
      renameBox.removeEventListener('keydown', checkStopKeys);
      renameBox.removeEventListener('input', checkInput);
    }
    //Configuring rename box functionality
    renameBox.addEventListener('focusout', setName, {once: true});
    renameBox.addEventListener('keydown', checkStopKeys);
    renameBox.addEventListener('input', checkInput);
    renameBox.focus();
    renameBox.select();
    return true;
  }
  //  Generates a tree of arrays, each representing a folder of a
  //  set of transformations
  function genTransformsStructure(transformsObj) {
    let structure = [];
    (function recursiveGen(tfFolder, saveTo) {
      for (let tf of tfFolder) {
        //if tf is a directory (tf.value contain folder contents)
        if (tf.value) {
          let next = [];
          saveTo.push(next);
          recursiveGen(tf.value, next);
        }
        else {saveTo.push(null);}
      }
    })(transformsObj.value, structure);
    return structure;
  }
  //  Get data from file/transform given a path on the navTree
  function getTransformFromPath(path) {
    if (!Array.isArray(path)) {return null;}
    let tf = transforms;
    for (let id of path) {
      if (!tf.value || !(tf = tf.value[id])) {return null;}
    }
    return tf;
  }
  function getDataFromPath(path) {
    if (!Array.isArray(path) || !path.length) {return null;}
    if (files.length <= path[0]) {return null;}
    if (path.length === 1) {return files[path[0]];}
    let tf = transforms;
    let value = files[path[0]].structure;
    for (let i = 1; i < path.length; i++) {
      if (!tf.value || !(tf = tf.value[path[i]])) {return null;}
      value = value[path[i]];
    }
    let out = {};
    for (let key in tf) {out[key] = tf[key];}
    if (!out.value) {out.value = value;}
    return out;
  }
  function getStructureFromPath(path, ignoreLast = false) {
    if (!Array.isArray(path) || !path.length) {return null;}
    if (files.length <= path[0]) {return null;}
    let structure = files[path[0]].structure;
    let n = ignoreLast ? path.length - 1 : path.length;
    for (let i = 1; i < n; i++) {structure = structure[path[i]];}
    return structure;
  }
  //  Remove file from tree if 'elem' is file. If 'elem' represents
  //  a calculated transformation, deletes its calculated value
  function deleteFromTree(treeElem) {
    treeElem = navTree.getContainingElement(treeElem);
    if (navTree.isTopFolder(treeElem)) {
      //gets index of top folder in the tree, used to remove it from the files array
      let index = navTree.findPath(treeElem)[0];
      files.splice(index, 1);
      treeElem.parentElement.remove();
    }
    else if (treeElem.classList.contains('ready')) {
      let path = navTree.findPath(treeElem);
      let tfId = path[path.length - 1];
      let fileTf = getStructureFromPath(path, true);
      fileTf[tfId] = null;
      treeElem.classList.remove('ready', 'highlight', 'selected');
      treeElem.draggable = false;
    }
    else {return false;}

    let id = selectedElems.indexOf(treeElem);
    if (id !== -1) {selectedElems.splice(id, 1);}
    if (selectedElems.length === 0) {updateToolbarButtons(0);}
    return true;
  }
  //Listener to be executed when the mode is about to change
  function modeChange(newMode) {
    if (newMode === mode.NORMAL) {
      if (mouseOverElem) {mouseOverElem.classList.add('highlight');}
    }
    else {
      if (newMode === mode.DELETE) {
        //remove highlight from mouseover element if it can't be deleted
        if (
          mouseOverElem &&
          !navTree.isTopFolder(mouseOverElem) &&
          !mouseOverElem.classList.contains('ready')
        ) {mouseOverElem.classList.remove('highlight');}
      }
    }
  }
  function executeToolbarAction(buttonId, targetElems) { return function execute() 
  {
    if (buttonId === 0) { //If clicked on new/copy file
      if (targetElems.length) {
        let openRenameBox = targetElems.length === 1;
        for (let target of targetElems) {
          let {name, value} = getDataFromPath(navTree.findPath(target));
          addToTree(name, value, openRenameBox);
        }
      }
      else {addToTree('empty', null, true);}
    }
    else if (buttonId === 1) { //If clicked on load file
      callParent('load-file').then(({canceled, filePaths}) => {
        if (!canceled) {filePaths.forEach((path) => readFile(path));}
      });
    }
    else if (buttonId === 2) { //If clicked on save file
      for (let target of targetElems) {
        let {name, value} = getDataFromPath(navTree.findPath(target));
        callParent('save-file', {name, value});
      }
    }
    else if (buttonId === 3) { //If clicked on remove file
      while (targetElems.length) {
        let target = targetElems.pop();
        //must make this check to avoid removing an element that was contained
        //inside another element that was already removed
        if (navTree.node().contains(target)) {deleteFromTree(target);}
      }
      updateToolbarButtons(0);
    }
    //If clicked on configure transforms
    else if (buttonId === 4) {callParent('configure-transforms');}
    window.removeEventListener('mouseup', execute);
  }}
  function updateSelectedElems(elem, addToSelection) {
    elem = navTree.getContainingElement(elem);
    if (addToSelection && selectedElems.length) {
      if (!elem || selectedElems.includes(elem)) {return;}
      if (!navTree.isTopFolder(elem) && !elem.classList.contains('ready')) {return;}
      elem.classList.add('selected');
      selectedElems.push(elem);
      if (toolbarLevel !== 2 && !elem.classList.contains('empty')) {
        updateToolbarButtons(2);
      }
    }
    else {
      if (!elem) {return clearSelection();}
      if (!navTree.isTopFolder(elem) && !elem.classList.contains('ready')) {
        return clearSelection();
      }
      while (selectedElems.length > 1) {
        selectedElems.pop().classList.remove('selected');
      }
      if (selectedElems[0] !== elem) {
        if (selectedElems[0]) {selectedElems[0].classList.remove('selected');}
        else {updateToolbarButtons(elem.classList.contains('empty') ? 1 : 2);}
        elem.classList.add('selected');
        selectedElems[0] = elem;
      }
    }
  }
  function clearSelection() {
    while (selectedElems.length) {selectedElems.pop().classList.remove('selected');}
    updateToolbarButtons(0);
  }
  function updateToolbarButtons(level) {
    if (level === 0) {
      //Disables the save and remove buttons (from when there's no selection)
      for (let i of [2, 3]) {toolbar.children[i].classList.add('inactive');}
    }
    else if (level === 1) {
      //Enable remove button, but disables save button (when an empty file is selected)
      toolbar.children[2].classList.add('inactive');
      toolbar.children[3].classList.remove('inactive');
    }
    else if (level === 2) {
      //Enables save and remove buttons
      for (let i of [2, 3]) {toolbar.children[i].classList.remove('inactive');}
    }
    else {return;}
    toolbarLevel = level;
  }
  
  //Initialize object
  (function() {
    Panel.call(this, 'ARQUIVOS', [
      {className: 'icon-plus', tooltip: 'New/Copy File'},
      {className: 'icon-document', tooltip: 'Load File'},
      {className: 'icon-save'   , tooltip: 'Save File'},
      {className: 'icon-x'   , tooltip: 'Remove'},
      {className: 'icon-aqua-vitae'   , tooltip: 'Configure Transformations'},
    ]);
    toolbar = this.node().getElementsByClassName('panel-toolbar')[0];
    this.setContentClass('transform-panel');
    this.setContent(navTree.node());
    clearSelection();
    mouseOverElem = null;
    //Adding mode change and check listeners
    mode.addChangeListener(modeChange); //only can change calling for stopDataSelect
    //Adding context menu handlers
    navTree.node().addEventListener('contextmenu', (e) => {
      if (!contextCallback) {return};
      let elem = navTree.getContainingElement(e.target);
      if (!elem) {return;}

      let detail;
      if (elem.classList.contains('folder')) {
        if (elem.classList.contains('empty')) {detail = 'folder:empty';}
        else if (navTree.isTopFolder(elem)) {detail = 'folder:top';}
        else {detail = 'folder';}
      }
      else {
        if (elem.classList.contains('ready')) {detail = 'leaf:ready';}
        else if (elem.classList.contains('broken')) {detail = 'leaf:broken';}
        else {detail = 'leaf';}
      }
      contextCallback(e, 'navTree', detail);
    });
    //adding mouse hover handlers
    navTree.node().addEventListener('mouseover', (e) => {
      let elem = navTree.getContainingElement(e.target);
      if (mouseOverElem === elem) {return;}
      if (mouseOverElem) {mouseOverElem.classList.remove('highlight');}
      if (!(mouseOverElem = elem)) {return;}

      //don't highlight in rename mode
      if (mode.is(mode.RENAME)) {return;}
      //if not in normal mode - highlights only elements with data associated
      if (!mode.is(mode.NORMAL)) {
        if (
          !navTree.isTopFolder(mouseOverElem) &&
          !mouseOverElem.classList.contains('ready')
        ) {return;}
      }
      mouseOverElem.classList.add('highlight');
    });
    navTree.node().addEventListener('mouseout', (e) => {
      if (!mouseOverElem) {return;}
      mouseOverElem.classList.remove('highlight');
      mouseOverElem = null;
    });
    //adding click handler
    navTree.node().addEventListener('click', ({target, ctrlKey}) => {
      //will only toggle folder when clicking on the node-icon
      if (target.classList.contains('node-icon')) {navTree.toggleFolder(target);}
      if (mode.is(mode.NORMAL)) {updateSelectedElems(target, ctrlKey);}
    });
    //adding double click handler
    navTree.node().addEventListener('dblclick', (e) => {
      let elem = navTree.getContainingElement(e.target);
      if (!elem) {return;}

      //if in delete mode
      if (mode.is(mode.DELETE)) {deleteFromTree(elem);}
      //if in select mode
      else if (mode.is(mode.SELECT)) {selectTreeElem(elem);}
      //if in normal mode
      else if (mode.is(mode.NORMAL)){
        //if elem is not a leaf ignores the event;
        if (!elem.classList.contains('leaf')) {return;}
        //gets path in the tree of the element clicked
        let path = navTree.findPath(elem);
        //last element of path will be the id of the transform selected in
        //relation to its parent folder, will be removed from path to be used later
        let tfId = path[path.length - 1];
        let fileTf = getStructureFromPath(path, true);
        //first element from path indicates the file index, no use for finding transform
        let fileId = path.shift();
        let transform = getTransformFromPath(path);
        let argsFormat = transform.args;
        
        //if function result was already calculated and there's no argument to change
        //then there's no need to calculate again
        if (elem.classList.contains('ready') && !argsFormat) {return;}
        if (elem.classList.contains('broken')) {return;}
        
        //calls function to get arguments for the transformation (the format of these arguments are
        //given as the first parameter to the function 'argsFormat'). This function must be set as a
        //callback outside of this object.
        //The second parameter is another callback function that needs to be called when the arguments
        //are found to calculate the transformation given the just found arguments.
        callParent('arguments', {argsFormat: argsFormat}).then(({args, canceled}) => {
          if (canceled) {return;}
          let value;
          try {
            //calculates transformation value using transform function on file data
            value = transform.func(files[fileId].value, args);
          } catch (err) {
            //if there was some error executing the function, changes the tree element to alert
            //that the transformation functions has some error in its code
            elem.setAttribute('title', 'O código dessa transformação resultou em erro.\n' +
            'Cheque o console pressionando F12 para mais detalhes.');
            elem.classList.add('broken');
            throw (err);
          }
          if (value === null || value === undefined) {return;}
          fileTf[tfId] = value;
          if (typeof(value) === 'number') {
            elem.title = !transform.tooltip ? 'Value calculated: ' + value :
              transform.tooltip + '\nValue calculated: ' + value;
          }
          //sets tree element as ready to use, and enables drag on it
          elem.classList.add('ready');
          if (transform.type !== 'no-plot') {elem.draggable = true;}
        });
      }
    });
    //adding drag handler
    navTree.node().addEventListener('dragstart', (e) => {
      if (!mode.change(mode.DRAG)) {
        e.preventDefault();
        return;
      }
      
      let dragElem = e.target;
      navTree.node().classList.add('drag');
      dragElem.classList.remove('highlight');
      let data = getDataFromPath(navTree.findPath(dragElem));
      e.dataTransfer.setData('text', JSON.stringify({
        name: data.name,
        type: data.type,
        value: data.value
      }));

      //if the element being dragged is already a top folder meaning it
      //represents a file with data loaded on the program and not a transformation
      let dragTopFolder = navTree.isTopFolder(dragElem);
      
      //if the element is not a top folder, then adds extra event listener to the
      //corresponding top folder, making it possible to update its value with a
      //transformation value
      let topFolder = navTree.getTopFolder(dragElem);
      function drop(e) {
        let elem = navTree.getContainingElement(e.target);
        if (!elem) return;

        //getting and updating the data corresponding to the file
        e.preventDefault();
        let {name, value} = JSON.parse(e.dataTransfer.getData('text'));
        let path = navTree.findPath(elem);
        let file = files[path[0]];
        file.value = value;
        if (elem.classList.contains('empty')) {
          //update file name
          file.name = name;
          let textElem = elem.getElementsByClassName('node-name')[0];
          textElem.innerHTML = name;
          //update transforms, enables drag and removes the empty class
          file.structure = genTransformsStructure(transforms);
          elem.draggable = true;
          elem.classList.remove('empty');
        }
        else if (elem === topFolder) {
          //reseting branch on navTree corresponding to the topFolder
          //calling parent because topFolder is contained within a div
          let leafs = topFolder.parentElement.getElementsByClassName('leaf');
          for (let i = 0; i < leafs.length; i++) {
            deleteFromTree(leafs[i]);
          }
        }
      }
      function dragOver (e) {
        let elem = navTree.getContainingElement(e.target);
        mouseOverElem = elem;
        if (!elem || !navTree.isTopFolder(elem)) return;
        if (elem === topFolder && dragTopFolder) return;
        if (!elem.classList.contains('empty') && elem !== topFolder) return;
        elem.classList.add('highlight');
        e.preventDefault();
      }
      function dragLeave(e) {
        if (!mouseOverElem) {return;}
        mouseOverElem.classList.remove('highlight');
        mouseOverElem = null;
      }
      function dragEnd(e) {
        //remove all event listeners added
        mode.change(mode.NORMAL);
        mouseOverElem = navTree.getContainingElement(e.target);
        if (mouseOverElem) {mouseOverElem.classList.add('highlight');}
        navTree.node().removeEventListener('drop'     , drop);
        navTree.node().removeEventListener('dragover' , dragOver);
        navTree.node().removeEventListener('dragleave', dragLeave);
        navTree.node().classList.remove('drag');
      }

      //add all event listeners necessary
      //  event listeners to handle drop on topFolder, and to change
      //  its background color on dragover/dragleave
      navTree.node().addEventListener('drop'     , drop);
      navTree.node().addEventListener('dragover' , dragOver);
      navTree.node().addEventListener('dragleave', dragLeave);
      //  event listener of the end of drag, removes all added listeners
      dragElem.addEventListener ('dragend'  , dragEnd, {once: true});
    });
    
    //Adding toolbar handler
    toolbar.addEventListener('mousedown', function ({target}) {
      let buttonId = Array.prototype.indexOf.call(toolbar.children, target);
      if (buttonId === -1) {return;}
      window.addEventListener('mouseup', executeToolbarAction(buttonId, selectedElems));
    });
  }).call(this);
}

//Setting prototype so as to inherit from Panel
TransformPanel.prototype = Object.create(Panel.prototype);
Object.defineProperty(TransformPanel.prototype, 'constructor', { 
  value: TransformPanel, enumerable: false, writable: true
});