"use strict";

module.exports = {TransformPanel};
const {appendNewElement, defaultCallParent} = require('../../auxiliar/auxiliar.js');
const {NavTree} = require('../../auxiliar/navTree.js');
const {Panel} = require('../../PanelManager/panel.js');
const {FileManager} = require('./fileManager.js');

function TransformPanel(modeObj) {
  if (modeObj === null || typeof(modeObj) !== 'object') {throw new Error(
    'Cannot create object without a reference to a Mode() object to hold ' +
    'the mode of operation of this object'
  );}
  //Constants
  const mode = modeObj;
  const filenameFormat = /^[^\\/?<>:|\"*^]{1,128}$/;
  const navTree = new NavTree();
  const fileManager = new FileManager();
  const selectedElems = [];
  //Public Attributes

  //Private Properties
  var toolbar, toolbarLevel;
  var mouseOverElem; //used to change highlight on change of mode
  var callParent = defaultCallParent;
  var selectTreeElem = () => null;

  //Public Methods
  this.onCallParent = function (executor = defaultCallParent) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  this.renameFile = renameFile;
  this.deleteFromTree = deleteFromTree;
  this.getDataFromPath = fileManager.getDataFromPath;
  this.getTransformFromPath = fileManager.getTransformFromPath;
  this.getDataFromTreeElement = (treeElem) => {
    return fileManager.getDataFromPath(navTree.findPath(treeElem));
  }
  this.startDataSelect = () => new Promise((resolve) => {
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
      let data = fileManager.getDataFromPath(path);
      treeElem.classList.remove('highlight');
      resolve({data, path, canceled: false});
    }
  });
  this.stopDataSelect = () => selectTreeElem(null);
  this.addToTree = addToTree;
  //  reads file given by path
  this.readFiles = readFiles;

  //TODO: this updateTransforms code is similar to addToTree, see if can reuse code
  this.updateTransforms = function(newTransforms) {
    fileManager.updateTransforms(newTransforms);
    let files = fileManager.getDataFromPath();
    //Step 1 - Recreate the file tree with new transforms
    navTree.clear();
    for (let data of files) {
      let folderDiv = navTree.addFolder({name: data.name, value: newTransforms.value});
      if (!data.value) {folderDiv.classList.add('empty');}
      else if (data.type !== 'no-plot') {folderDiv.draggable = true;}
    }

    //Step 2 - Change the tree elements which correspond to an already calculated
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

  //Private Functions
  function readFiles(paths) {
    for (let filePath of paths) {
      let fileData = fileManager.readFile(filePath);
      if (!fileData) {continue;}
      fileData.forEach(data => addToTree(data));
    }
  }
  function saveFile(treeElem) {
    let data = fileManager.getDataFromPath(navTree.findPath(treeElem), true);
    if (!data.value) {return false;}
    callParent('save-file', {data});
  }
  function addToTree(data, openRenameBox = false) {
    if (typeof(data.name) !== 'string' || !filenameFormat.test(data.name)) {
      throw new TypeError(`The 'name' key of the 'data' object is invalid`);
    }
    fileManager.addFile(data);
    let transforms = fileManager.getTransformFromPath();
    let folderDiv = navTree.addFolder({name: data.name, value: transforms.value});
    if (!data.value) {folderDiv.classList.add('empty');}
    else if (data.type !== 'no-plot') {folderDiv.draggable = true;}
    if (openRenameBox) {renameFile(folderDiv);}
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
    function checkStopKeys({keyCode}) {
      if (
        keyCode === 27 ||
        (keyCode === 13 && filenameFormat.test(renameBox.value))
      ) {renameBox.blur();}
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
        fileManager.getDataFromPath(navTree.findPath(elem)).name = name;
      }
      mode.unlock();
      mode.change(mode.NORMAL);
      textElem.innerHTML = name;
      textElem.style.display = '';
      warningBox.remove(); renameBox.remove();
      renameBox.removeEventListener('keydown', checkStopKeys);
      renameBox.removeEventListener('input', checkInput);
      if (selectedElems.length === 1 && selectedElems[0] === elem) {
        callParent('properties', {pObjs: [
          {
            name: elem.innerText, props: getElemProperties(elem),
            onChange: propertyChanged
          }
        ]})
      }
    }
    //Configuring rename box functionality
    renameBox.addEventListener('focusout', setName, {once: true});
    renameBox.addEventListener('keydown', checkStopKeys);
    renameBox.addEventListener('input', checkInput);
    renameBox.focus();
    renameBox.select();
    return true;
  }
  //  Remove file from tree if 'elem' is file. If 'elem' represents
  //  a calculated transformation, deletes its calculated value
  function deleteFromTree(treeElem) {
    treeElem = navTree.getContainingElement(treeElem);
    let path = navTree.findPath(treeElem);
    if (path === null) {return false;}
    if (navTree.isTopFolder(treeElem)) {treeElem.parentElement.remove();}
    else if (treeElem.classList.contains('ready')) {
      treeElem.classList.remove('ready', 'highlight', 'selected');
      treeElem.draggable = false;
    }
    else if (treeElem.classList.contains('broken')) {
      treeElem.classList.remove('broken');
    }
    else {return false;}
    fileManager.deleteDataInPath(path);
    
    let id = selectedElems.indexOf(treeElem);
    if (id !== -1) {
      selectedElems.splice(id, 1);
      sendPropertiesOfSelected();
      if (selectedElems.length === 0) {updateToolbarButtons(0);}
    }
    return true;
  }
  function getElemProperties(treeElem) {
    const path = navTree.findPath(treeElem);
    let data = fileManager.getDataFromPath(path);
    if (data.type === 'dir') {return [];}
    const typeProp = path.length !== 1 || data.type === 'no-plot' ? {
      name: 'Type', value: data.type, type: 'text', disabled: true
    } : {
      name: 'Type', value: data.type, type: 'select',
      option: ['normal', 'scatter']
    }
    return [
      {name: 'Name', value: data.name, disabled: path.length !== 1}, typeProp
    ]
  }
  function propertyChanged({name, value}) {
    let data = fileManager.getDataFromPath(navTree.findPath(selectedElems[0]));
    if (name === 'Name') {
      let textElem = selectedElems[0].getElementsByClassName('node-name')[0];
      if (value === textElem.innerText) {return;}
      if (!filenameFormat.test(value)) {return {replace: data.name};}
      textElem.innerHTML = data.name = value;
      return {rename: value};
    }
    else if (name === 'Type') {data.type = value;}
  }
  function sendPropertiesOfSelected() {
    if (selectedElems.length > 1) {
      callParent('properties', {pObjs: [{name: 'Multiple Files'}]});
    }
    else if (selectedElems.length === 1) {
      callParent('properties', {pObjs: [{
        name: selectedElems[0].innerText, onChange: propertyChanged,
        props: getElemProperties(selectedElems[0])
      }]});
    }
    else {
      callParent('properties', {pObjs: []});
    }
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
          let data = fileManager.getDataFromPath(navTree.findPath(target));
          addToTree(data, openRenameBox);
        }
      }
      else {addToTree({name: 'empty'}, true);}
    }
    else if (buttonId === 1) { //If clicked on load file
      callParent('load-file').then(({canceled, filePaths}) => {
        if (!canceled) {readFiles(filePaths);}
      });
    }
    else if (buttonId === 2) { //If clicked on save file
      for (let target of targetElems) {saveFile(target);}
    }
    else if (buttonId === 3) { //If clicked on remove file
      while (targetElems.length) {
        let target = targetElems.pop();
        //must make this check to avoid removing an element that was contained
        //inside another element that was already removed
        if (navTree.node().contains(target)) {deleteFromTree(target);}
      }
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
      sendPropertiesOfSelected();
    }
    else {
      if (!elem) {return clearSelection();}
      if (!navTree.isTopFolder(elem) && !elem.classList.contains('ready')) {
        return clearSelection();
      }
      const updateProperties = selectedElems.length > 1 || selectedElems[0] !== elem;
      while (selectedElems.length > 1) {
        selectedElems.pop().classList.remove('selected');
      }
      if (selectedElems[0] !== elem) {
        if (selectedElems[0]) {selectedElems[0].classList.remove('selected');}
        else {updateToolbarButtons(elem.classList.contains('empty') ? 1 : 2);}
        elem.classList.add('selected');
        selectedElems[0] = elem;
      }
      if (updateProperties) {sendPropertiesOfSelected();}
    }
  }
  function clearSelection() {
    if (!selectedElems.length) {return;}
    while (selectedElems.length) {selectedElems.pop().classList.remove('selected');}
    updateToolbarButtons(0);
    sendPropertiesOfSelected();
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
    Panel.call(this, 'Arquivos', [
      {className: 'icon-plus', tooltip: 'New/Copy File'},
      {className: 'icon-document', tooltip: 'Load File'},
      {className: 'icon-save'   , tooltip: 'Save File'},
      {className: 'icon-x'   , tooltip: 'Remove'},
      {className: 'icon-aqua-vitae'   , tooltip: 'Configure Transformations'},
    ]);
    toolbar = this.node().getElementsByClassName('panel-toolbar')[0];
    this.setContentClass('transform-panel');
    this.setContent(navTree.node());
    updateToolbarButtons(0);
    mouseOverElem = null;
    mode.addChangeListener(modeChange);
    //Adding context menu handlers
    navTree.node().addEventListener('contextmenu', ({x, y, target}) => {
      let elem = navTree.getContainingElement(target);
      if (!elem) {return;}
      let folderEmpty, isLeaf;
      folderEmpty = isLeaf = false;
      if (elem.classList.contains('folder')) {
        if (elem.classList.contains('empty')) {folderEmpty = true;}
        else if (!navTree.isTopFolder(elem)) {return;}
      }
      else if (elem.classList.contains('ready')) {isLeaf = true;}
      else {return;}

      callParent('context', {x, y, contextItems: [
        {name: 'Copy to New', return: 'copy',
         type: folderEmpty ? 'inactive' : undefined},
        {name: 'Rename', return: 'rename',
         type: isLeaf      ? 'inactive' : undefined},
        {name: 'Save',   return: 'save',
         type: folderEmpty ? 'inactive' : undefined},
        {name: 'Remove', return: 'remove'},
      ]}).then((item) => {
        if (!item) {return;}
        if (item === 'rename') {renameFile(elem);}
        else if (item === 'remove') {deleteFromTree(elem);}
        else {
          let data = fileManager.getDataFromPath(navTree.findPath(elem));
          if (item === 'copy') {addToTree(data, true);}
          if (item === 'save') {
            callParent('save-file', {data: {
              name: data.name, value: data.value,
            }});
          }
        }
      });
    });
    //adding mouse hover handlers
    navTree.node().addEventListener('mouseover', ({target}) => {
      let elem = navTree.getContainingElement(target);
      if (mouseOverElem === elem) {return;}
      if (mouseOverElem) {mouseOverElem.classList.remove('highlight');}
      if (!(mouseOverElem = elem)) {return;}

      if (mode.is(mode.RENAME)) {return;}
      if (mode.is(mode.DELETE)) {
        if (
          !navTree.isTopFolder(mouseOverElem) &&
          mouseOverElem.className === 'leaf'
        ) {return;}
      }
      //if not in normal mode - highlights only elements with data associated
      if (!mode.is(mode.NORMAL)) {
        if (
          !navTree.isTopFolder(mouseOverElem) &&
          !mouseOverElem.classList.contains('ready')
        ) { 
          if (!mode.is(mode.DELETE)) {return;}
          if (!mouseOverElem.classList.contains('broken')) {return;}
        }
      }
      mouseOverElem.classList.add('highlight');
    });
    navTree.node().addEventListener('mouseout', () => {
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
    navTree.node().addEventListener('dblclick', ({target}) => {
      let elem = navTree.getContainingElement(target);
      if (!elem) {return;}
      if (mode.is(mode.DELETE)) {deleteFromTree(elem);}
      else if (mode.is(mode.SELECT)) {selectTreeElem(elem);}
      else if (mode.is(mode.NORMAL)){
        if (!elem.classList.contains('leaf')) {return;}
        fileManager.calculateTransform(navTree.findPath(elem),
          (argsFormat) => callParent('arguments', {argsFormat})
        ).then((transform) => {
          if (!transform.value) {return;}
          if (typeof(transform.value) === 'number') {
            elem.title = !transform.tooltip ? 'Value calculated: ' + transform.value :
              transform.tooltip + '\nValue calculated: ' + transform.value;
          }
          elem.classList.add('ready');
          if (transform.type !== 'no-plot') {elem.draggable = true;}
        }).catch((err) => {
          elem.setAttribute('title', 'O código dessa transformação resultou em erro.\n' +
          'Cheque o console pressionando F12 para mais detalhes.');
          elem.classList.add('broken');
          console.error(err);
        });
      }
    });
    //adding drag handler
    navTree.node().addEventListener('dragstart', (event) => {
      if (!mode.change(mode.DRAG)) {
        event.preventDefault();
        return;
      }
      mode.lock();
      let dragElem = event.target;
      navTree.node().classList.add('drag');
      dragElem.classList.remove('highlight');
      let data = fileManager.getDataFromPath(navTree.findPath(dragElem));
      event.dataTransfer.setData('text', JSON.stringify({
        name: data.name,
        type: data.type,
        value: data.value
      }));

      function drop(event) {
        let elem = navTree.getContainingElement(event.target);
        if (!elem) return;
        event.preventDefault();
        let fileId = navTree.findPath(elem)[0];
        fileManager.resetFileStructure(fileId);
        if (elem.classList.contains('empty')) {
          fileManager.setFileData(fileId, data);
          let textElem = elem.getElementsByClassName('node-name')[0];
          textElem.innerHTML = data.name;
          elem.draggable = true;
          elem.classList.remove('empty');
        }
        else {
          data.name = undefined; //to not change file name in setFileData
          fileManager.setFileData(fileId, data);
          let leafs = elem.parentElement.getElementsByClassName('leaf');
          for (let leaf of leafs) {leaf.className = 'leaf';}
        }
      }
      function dragOver (event) {
        mouseOverElem = navTree.getContainingElement(event.target);
        if (!mouseOverElem || !navTree.isTopFolder(mouseOverElem)) {return;}
        if (mouseOverElem === dragElem) {return;}
        mouseOverElem.classList.add('highlight');
        event.preventDefault();
      }
      function dragLeave() {
        if (!mouseOverElem) {return;}
        mouseOverElem.classList.remove('highlight');
        mouseOverElem = null;
      }
      function dragEnd({target}) {
        mode.unlock();
        mode.change(mode.NORMAL);
        mouseOverElem = navTree.getContainingElement(target);
        if (mouseOverElem) {mouseOverElem.classList.add('highlight');}
        navTree.node().removeEventListener('drop'     , drop);
        navTree.node().removeEventListener('dragover' , dragOver);
        navTree.node().removeEventListener('dragleave', dragLeave);
        navTree.node().classList.remove('drag');
      }
      navTree.node().addEventListener('drop'     , drop);
      navTree.node().addEventListener('dragover' , dragOver);
      navTree.node().addEventListener('dragleave', dragLeave);
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