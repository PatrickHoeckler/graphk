"use strict";

module.exports = {TransformPanel};
const {defaultCallParent} = require('../../auxiliar/auxiliar.js');
const {calculateTransformSafely} = require('../../auxiliar/transformations.js');
const {NavTree} = require('../../auxiliar/navTree.js');
const {Panel} = require('../../PanelManager/panel.js');
const FileManager = require('./fileManager.js');
const {DataHandler} = require('../../auxiliar/dataHandler.js');

function TransformPanel(modeObj) {
  if (modeObj === null || typeof(modeObj) !== 'object') {throw new Error(
    'Cannot create object without a reference to a Mode() object to hold ' +
    'the mode of operation of this object'
  );}
  //Constants
  const mode = modeObj;
  const filenameFormat = /^[^\\/?<>:|\"*^]{1,128}$/;
  const navTree = new NavTree();
  const selectedElems = [];
  //Public Attributes

  //Private Properties
  var toolbar, toolbarLevel;
  var transforms;
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
  this.getDataFromTreeElement = treeElem => navTree.elemData(treeElem);
  this.startDataSelect = () => new Promise((resolve) => {
    if (!mode.change(mode.SELECT)) {throw new Error(
      'Could not change to select mode'
    );}
    mode.lock();
    selectTreeElem = function(treeElem = null) {
      let dataHandler = null;
      if (treeElem) {
        treeElem = navTree.getContainingElement(treeElem);
        dataHandler = treeElem && navTree.elemData(treeElem).dataHandler;
        if (!dataHandler) {return;}
      }
      selectTreeElem = () => null;
      mode.unlock();
      if (!mode.change(mode.NORMAL)) {throw new Error(
        'Could not revert back to normal mode at the end of Data Selection. Review ' + 
        'the check callbacks of the Mode object to see which one did not allow the change'
      );};
      if (!dataHandler) {return resolve({canceled: true});}
      treeElem.classList.remove('highlight');
      resolve({dataHandler, canceled: false});
    }
  });
  this.stopDataSelect = () => selectTreeElem(null);
  this.addToTree = addToTree;
  this.readFiles = readFiles;

  this.updateTransforms = function(newTransforms) {
    transforms = newTransforms;
    function updateBranch(branchElem, tfFolder) {
      let contents = navTree.getFolderContents(branchElem);
      let contentsTransforms = contents.map(elem => navTree.elemData(elem).transform);
      for (let i = 0, n = tfFolder.value.length; i < n; i++) {
        let index = contentsTransforms.indexOf(tfFolder.value[i]);
        if (index !== -1) {
          navTree.changeIndex(contents[index], i);
          if (!navTree.isLeaf(contents[index])) {
            updateBranch(contents[index], contentsTransforms[index]);
          }
          contents[index] = null;
        }
        else {
          navTree.addToTree(tfFolder.value[i], (content, isLeaf) => 
            isLeaf ? {transform: content, dataHandler: null} : {transform: content},
            branchElem, i
          );
        }
      }
      for (let elem of contents) {elem && navTree.remove(elem);}
    }
    let fileElems = navTree.getFolderContents(navTree.node());
    for (let elem of fileElems) {updateBranch(elem, transforms);}
  }

  //Private Functions
  function readFiles(paths) {
    for (let filePath of paths) {
      let fileData = FileManager.readFile(filePath);
      if (!fileData) {continue;}
      fileData.forEach(data => addToTree(data));
    }
  }
  function saveFile(treeElem) {
    let dataHandler = navTree.elemData(treeElem).dataHandler;
    if (!dataHandler instanceof DataHandler) {return;}
    callParent('save-file', {
      data: {
        name: dataHandler.name, type: dataHandler.type,
        value: dataHandler.isHierarchy ?
          dataHandler.getLevel(0) : dataHandler.value
    }});
  }
  function addToTree(dataHandler, openRenameBox = false) {
    if (typeof(dataHandler.name) !== 'string' || !filenameFormat.test(dataHandler.name)) {
      throw new TypeError(`The 'name' key of the 'dataHandler' object is invalid`);
    }
    let folderDiv = navTree.addToTree(
      {name: dataHandler.name, value: transforms.value},
      (content, isLeaf) => isLeaf ? 
      {transform: content, dataHandler: null} : {transform: content}
    );
    navTree.elemData(folderDiv, {dataHandler: dataHandler});
    folderDiv.draggable = !['no-plot', 'static'].includes(dataHandler.type);
    if (!dataHandler.value) {folderDiv.classList.add('empty');}
    if (openRenameBox) {renameFile(folderDiv);}
    return folderDiv;
  }
  function calculateTransform(treeElem) {
    treeElem = navTree.getContainingElement(treeElem);
    if (!navTree.isLeaf(treeElem) || treeElem.classList.contains('broken')) {return;}
    let fileData = navTree.elemData(navTree.getTopFolder(treeElem));
    let leafData = navTree.elemData(treeElem);
    callParent('arguments', {transform: leafData.transform})
    .then(args => {
      if (!args) {return;}
      args.data = fileData.dataHandler.isHierarchy ?
        fileData.dataHandler.getLevel(0) : fileData.dataHandler.value;
      let value;
      try {value = calculateTransformSafely(leafData.transform.func, args);}
      catch (err) {throw err;}
      if (value === null || value === undefined ||
        (Array.isArray(value) && !value.length)) {return;}
      leafData.dataHandler = new DataHandler({
        name: leafData.transform.name, type: leafData.transform.type, value
      });
      if (typeof(value) === 'number') {
        treeElem.title = !leafData.transform.tooltip ?
          'Value calculated: ' + dataHandler.value :
          leafData.transform.tooltip + '\nValue calculated: ' + value;
      }
      treeElem.classList.add('ready');
      if (!['no-plot', 'static'].includes(leafData.transform.type)) {
        treeElem.draggable = true;
      }
    }).catch((err) => {
      treeElem.setAttribute('title', 'O código dessa transformação resultou ' + 
      'em erro.\nCheque o console pressionando F12 para mais detalhes.');
      treeElem.classList.add('broken');
      console.error(err);
    });
  }
  function renameFile(treeElem) {
    treeElem = navTree.getContainingElement(treeElem);
    if (!treeElem || !navTree.isTopFolder(treeElem)) {return;}
    if (!mode.change(mode.RENAME)) {return;}
    mode.lock();
    navTree.openRenameBox(treeElem, filenameFormat)
    .then(name => {
      mode.unlock(); mode.change(mode.NORMAL);
      navTree.elemData(treeElem).dataHandler.name = name;
      if (selectedElems.length !== 1 || selectedElems[0] !== treeElem) {return;}
      callParent('properties', {pObjs: [{
        name: name, props: getElemProperties(treeElem),
        onChange: propertyChanged
      }]});
    });
  }
  //  Remove file from tree if 'elem' is file. If 'elem' represents
  //  a calculated transformation, deletes its calculated value
  function deleteFromTree(treeElem) {
    treeElem = navTree.getContainingElement(treeElem);
    let data = navTree.elemData(treeElem);
    let isLeaf = navTree.isLeaf(treeElem);
    if (!data.dataHandler) {return false;}
    else if (!isLeaf) {treeElem = navTree.remove(treeElem);}
    else {
      treeElem.classList.remove('ready', 'highlight', 'selected');
      data.dataHandler = null; treeElem.draggable = false;
    }
    let id = selectedElems.indexOf(treeElem);
    if (id !== -1) {
      selectedElems.splice(id, 1);
      //Must remove all selected elements that were
      //contained inside the deleted folder
      if (!isLeaf) {
        for (let i = 0; i < selectedElems.length; i++) {
          if (treeElem.contains(selectedElems[i])) {
            selectedElems.splice(i, 1);}
        }
      }
      sendPropertiesOfSelected();
      if (selectedElems.length === 0) {updateToolbarButtons(0);}
    }
    return true;
  }
  function getElemProperties(treeElem) {
    let {dataHandler, transform} = navTree.elemData(treeElem);
    if (!(dataHandler instanceof DataHandler)) {return [];}
    const props = [
      {name: 'Name', value: dataHandler.name, disabled: !!transform}
    ];
    props.push(!!transform || dataHandler.type === 'no-plot' ? {
      name: 'Type', value: dataHandler.type, type: 'text', disabled: true
    } : {
      name: 'Type', value: dataHandler.type, type: 'select',
      option: ['normal', 'scatter']
    });
    return props;
  }
  function propertyChanged({name, value}) {
    let treeElem = navTree.getContainingElement(selectedElems[0]);
    let dataHandler = navTree.elemData(treeElem).dataHandler;
    if (name === 'Name') {
      if (!filenameFormat.test(value)) {return {replace: dataHandler.name};}
      navTree.elemName(treeElem, dataHandler.name = value);
      return {rename: value};
    }
    else if (name === 'Type') {dataHandler.type = value;}
  }
  function sendPropertiesOfSelected() {
    if (selectedElems.length > 1) {
      callParent('properties', {pObjs: [{name: 'Multiple Files'}]});
    }
    else if (selectedElems.length === 1) {
      callParent('properties', {pObjs: [{
        name: navTree.elemName(selectedElems[0]), onChange: propertyChanged,
        props: getElemProperties(selectedElems[0])
      }]});
    }
    else {callParent('properties', {pObjs: []});}
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
          navTree.isLeaf(mouseOverElem) &&
          !mouseOverElem.classList.contains('ready')
        ) {mouseOverElem.classList.remove('highlight');}
      }
    }
  }

  function executeToolbarAction(buttonId, targetElems) { return function execute()
  {
    window.removeEventListener('mouseup', execute);
    if (buttonId === 0) { //If clicked on new/copy file
      if (targetElems.length) {
        let openRenameBox = targetElems.length === 1;
        for (let target of targetElems) {
          let dataHandler = navTree.elemData(target).dataHandler;
          addToTree(new DataHandler(dataHandler), openRenameBox);
        }
      }
      else {addToTree(new DataHandler({name: 'empty'}), true);}
    }
    else if (buttonId === 1) { //If clicked on load file
      callParent('load-file', {filters: ['json', 'csv', 'any']})
      .then(({canceled, filePaths}) => {
        if (!canceled) {readFiles(filePaths);}
      });
    }
    else if (buttonId === 2) { //If clicked on save file
      for (let target of targetElems) {saveFile(target);}
    }
    else if (buttonId === 3) { //If clicked on remove file
      if (!targetElems.length) {return;}
      while (targetElems.length) {
        let target = targetElems.pop();
        //must make this check to avoid removing an element that was contained
        //inside another element that was already removed
        if (navTree.node().contains(target)) {deleteFromTree(target);}
      }
      sendPropertiesOfSelected();
    }
    //If clicked on configure transforms
    else if (buttonId === 4) {callParent('configure-transforms');}
  }}
  function updateSelectedElems(elem, addToSelection) {
    elem = navTree.getContainingElement(elem);
    const invalid = !elem || 
      (!navTree.isTopFolder(elem) && !elem.classList.contains('ready'));
    if (addToSelection && selectedElems.length) {
      if (invalid || selectedElems.includes(elem)) {return;}
      elem.classList.add('selected');
      selectedElems.push(elem);
      if (toolbarLevel !== 2 && !elem.classList.contains('empty')) {
        updateToolbarButtons(2);
      }
      sendPropertiesOfSelected();
    }
    else {
      if (invalid) {return clearSelection();}
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
      let folderEmpty, isLeaf = navTree.isLeaf(elem);
      if (!isLeaf) {
        if (!navTree.elemData(elem).dataHandler) {return;}
        folderEmpty = elem.classList.contains('empty');
      }
      else if (!elem.classList.contains('ready')) {return;}
      callParent('context', {x, y, contextItems: [
        {name: 'Copy to New', return: 'copy',
         type: folderEmpty ? 'inactive' : undefined},
        {name: 'Rename', return: 'rename',
         type: isLeaf      ? 'inactive' : undefined},
        {name: 'Save',   return: 'save',
         type: folderEmpty ? 'inactive' : undefined},
        {name: 'Remove', return: 'remove'},
      ]}).then((item) => {
        if (item === 'rename') {renameFile(elem);}
        else if (item === 'remove') {deleteFromTree(elem);}
        else if (item === 'save') {saveFile(elem);}
        else if (item === 'copy') {
          addToTree(navTree.elemData(elem).DataHandler, true);}
      });
    });
    //adding mouse hover handlers
    navTree.node().addEventListener('mouseover', ({target}) => {
      let elem = navTree.getContainingElement(target);
      if (mouseOverElem === elem) {return;}
      if (mouseOverElem) {mouseOverElem.classList.remove('highlight');}
      if (!(mouseOverElem = elem)) {return;}
      let dataHandler = navTree.elemData(mouseOverElem).dataHandler;
      if (mode.is(mode.RENAME) || (!dataHandler && (
        mode.is(mode.DELETE) || mode.is(mode.SELECT)))) {return;}
      mouseOverElem.classList.add('highlight');
    });
    navTree.node().addEventListener('mouseout', () => {
      mouseOverElem && mouseOverElem.classList.remove('highlight'), mouseOverElem = null
    });
    //adding click handler
    navTree.node().addEventListener('click', ({target, ctrlKey}) => {
      if (target.classList.contains('node-icon')) {navTree.toggleFolder(target);}
      else if (mode.is(mode.NORMAL)) {updateSelectedElems(target, ctrlKey);}
    });
    //adding double click handler
    navTree.node().addEventListener('dblclick', ({target}) => {
      if (mode.is(mode.DELETE)) {deleteFromTree(target);}
      else if (mode.is(mode.SELECT)) {selectTreeElem(target);}
      else if (mode.is(mode.NORMAL)) {calculateTransform(target);}
    });
    //adding drag handler
    navTree.node().addEventListener('dragstart', (event) => {
      if (!mode.change(mode.DRAG)) {return event.preventDefault();}
      mode.lock();
      let dragElem = event.target;
      dragElem.classList.remove('highlight');
      navTree.node().classList.add('drag');
      let dataHandler = navTree.elemData(dragElem).dataHandler;
      callParent('transferData', {transferData: dataHandler});

      function drop(event) {
        callParent('transferData'); //resets transferData
        let elem = navTree.getContainingElement(event.target);
        if (!elem) return;
        event.preventDefault();
        let leafs = navTree.node().getElementsByClassName('leaf-node');
        for (let leaf of leafs) {
          navTree.elemData(leaf).dataHandler = null;
          leaf.className = 'leaf-node';
        }
        let shallowClone = new DataHandler(dataHandler);
        shallowClone.name = navTree.elemName(elem);
        navTree.elemData(elem).dataHandler = shallowClone;
        if (elem.classList.contains('empty')) {
          elem.classList.remove('empty');
          if (['no-plot', 'static'].includes(shallowClone.type)) {
            elem.draggable = true;}
        }
      }
      function dragOver (event) {
        mouseOverElem = navTree.getContainingElement(event.target);
        if (mouseOverElem === dragElem || 
          !navTree.isTopFolder(mouseOverElem)) {return;}
        mouseOverElem.classList.add('highlight');
        event.preventDefault();
      }
      function dragLeave() {
        return mouseOverElem && 
          mouseOverElem.classList.remove('highlight'), mouseOverElem = null;
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
      dragElem.addEventListener('dragend'  , dragEnd, {once: true});
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
