"use strict";

module.exports = {RoutinePanel};

const _routineData = Symbol('RoutinePanel.Symbol');

const {
  appendNewElement, defaultCallParent
} = require('../../auxiliar/auxiliar.js');
const {DataHandler} = require('../../auxiliar/dataHandler.js');
const {Panel} = require('../../PanelManager/panel.js');
const {RoutineMaker} = require('./routineMaker.js');
const {RoutineStep} = require('./routineStep.js');
const {Routine} = require('./routine.js');
const fs = require('fs');

function RoutinePanel(modeObj) {
  if (modeObj === null || typeof(modeObj) !== 'object') {throw new Error(
    'Cannot create object without a reference to a Mode() object to hold ' +
    'the mode of operation of this object'
  );}
  //Constants
  const mode = modeObj;
  //TODO: test changing this to a HTMLCollection, because it is a dynamic list
  //You can get the list by: pContents.getElementsByClassName('selected')
  const selectedElems = [];
  //Public Attributes
  //Private Properties
  var pContents, toolbar;
  var transforms, transformDict;
  var callParent = defaultCallParent;

  //Public Methods
  this.onCallParent = function (executor = defaultCallParent) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  this.updateTransforms = function(newTransforms, dictionary) {
    transforms = newTransforms;
    if (dictionary) {transformDict = dictionary;}
  }

  //Private Functions
  function addRoutine(name, openRenameBox = false) {
    const routine = new Routine();
    routine.name = name && typeof name === 'string' ? name : 'Routine';
    routine.createBase();
    routine.valid = false;
    let rNode = createRoutineElem(routine);
    if (openRenameBox) {renameRoutine(rNode);}
  }
  function createRoutineElem(routine) {
    let rNode = appendNewElement(pContents, 'div', 'routine-node');
    if (!routine.valid) {rNode.classList.add('invalid');}
    appendNewElement(rNode, 'span', 'node-icon');
    appendNewElement(rNode, 'span', 'node-name').innerHTML = routine.name;
    let rButton = appendNewElement(rNode, 'span', 'routine-button routine-exec');
    rButton.setAttribute('title', 'Execute Routine');
    rNode[_routineData] = routine;
    return rNode;
  }
  function getContainingElement(target) {
    for (let curElem = target;; curElem = curElem.parentElement) {
      if (!curElem || curElem === pContents) {return null;}
      if (curElem[_routineData]) {return curElem;}
    }
  }
  function renameRoutine(target) {
    const rNode = getContainingElement(target);
    if (!rNode || !mode.change(mode.RENAME)) {return false;}
    mode.lock();
    const routine = rNode[_routineData];
    const [, textElem, rButton] = rNode.children;
    textElem.style.display = rButton.style.display = 'none';
    const renameBox = appendNewElement(rNode, 'input', 'rename');
    renameBox.setAttribute('type', 'text');
    renameBox.setAttribute('value', textElem.innerText);
    renameBox.select();

    //Functions to handle input events
    function checkStopKeys(e) {
      if (e.keyCode === 13 || e.keyCode === 27) {renameBox.blur();}
    }
    function setName() {
      textElem.innerHTML = routine.name = renameBox.value;
      textElem.style.display = rButton.style.display = '';

      mode.unlock();
      mode.change(mode.NORMAL);
      renameBox.remove();
      renameBox.removeEventListener('keydown', checkStopKeys);
    }
    renameBox.addEventListener('blur', setName, {once: true});
    renameBox.addEventListener('keydown', checkStopKeys);
    return true;
  }
  function editRoutine(target) {
    const rNode = getContainingElement(target);
    if (!rNode) {return;}
    const routine = rNode[_routineData];
    callParent('full-window', {title: `Edit Routine - ${routine.name}`})
    .catch(() => {return;})
    .then(({node, stop}) => {
      RoutineMaker.editRoutine(routine, transforms, node)
      .then((newRoutine) => {
        if (newRoutine) {
          rNode[_routineData] = newRoutine;
          newRoutine.valid = !newRoutine.checkValidity().error;
          if (newRoutine.valid) {rNode.classList.remove('invalid');}
          else {rNode.classList.add('invalid');}
        }
        stop();
      });
    });
  }
  function executeRoutine(target) {
    const rNode = getContainingElement(target);
    if (!rNode) {return;}
    const routine = rNode[_routineData];
    if (!routine.valid) {return;}

    callParent('get-data').then(({dataHandler, canceled}) => {
      if (canceled) {return;}
      let value = dataHandler.isHierarchy ?
        dataHandler.getLevel(0) : dataHandler.value;
      if (dataHandler.type !== 'normal') {throw TypeError(
        `Expected a set of data of type 'normal'`
      );}
      value = routine.calculate(value);
      //calls parent to add new data to tree
      return callParent('add-data', {dataHandler: new DataHandler({
        name: routine.name, value, type: dataHandler.type
      })});
    });
  }
  function loadRoutine() {
    callParent('load-file', {filters: ['json']})
    .then(function ({canceled, filePaths}) {
      if (canceled) {return;}
      for (let path of filePaths) {
        let fileString = fs.readFileSync(path, 'utf8');
        let routine = Routine.loadString(fileString, transformDict);
        if (typeof routine === 'string') {
          if (routine === 'invalid') {
            alert(`${path}\nThis file can't be converted to a routine`);
          }
          else if (routine === 'hash') {
            alert(`${path}\nThis routine needs transformations that can't be found. ` + 
            `This may either be because the file was removed, or it was altered`);
          }
        }
        else {
          routine.valid = !routine.checkValidity().error;
          createRoutineElem(routine);
        }
      }
    });
  }
  function saveRoutine(target) {
    if (!(target = getContainingElement(target))) {return;}
    const routine = target[_routineData];
    callParent('save-json', {name: routine.name, json: routine.toString()});
  }
  function removeRoutine(target) {
    let rNode = getContainingElement(target);
    if (!rNode) {return false;}
    rNode.remove();
    let id = selectedElems.indexOf(rNode);
    if (id !== -1) {selectedElems.splice(id, 1);}
    if (selectedElems.length === 0) {updateToolbarButtons(0);}
    return true;
  }
  function executeToolbarAction(buttonId, targetElems) { return function execute() 
  {
    if (buttonId === 0) {addRoutine('Routine', true);}
    else if (buttonId === 1) {loadRoutine();}
    else if (buttonId === 2) {
      for (let target of targetElems) {saveRoutine(target);}
    }
    else if (buttonId === 3) {editRoutine(targetElems[0]);}
    else if (buttonId === 4) { 
      while (targetElems.length) {removeRoutine(targetElems.pop());}
    }
    window.removeEventListener('mouseup', execute);
  }}
  function updateSelectedElems(elem, addToSelection) {
    if (addToSelection && selectedElems.length) {
      if (!elem) {return;} //ignores clicks outside any routine
      if (selectedElems.includes(elem)) {return;}
      elem.classList.add('selected');
      selectedElems.push(elem);
      updateToolbarButtons(1);
    }
    else {
      if (!elem) {return clearSelection();}
      while (selectedElems.length > 1) {
        selectedElems.pop().classList.remove('selected');
      }
      if (selectedElems[0] !== elem) {
        if (selectedElems[0]) {selectedElems[0].classList.remove('selected');}
        else {updateToolbarButtons(2);}
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
      //Disables the save, edit and remove buttons (from when there's no selection)
      for (let i of [2, 3, 4]) {toolbar.children[i].classList.add('inactive');}
    }
    else if (level === 1) { //Enables save and remove buttons
      for (let i of [3])    {toolbar.children[i].classList.add('inactive');}
      for (let i of [2, 4]) {toolbar.children[i].classList.remove('inactive');}
    }
    else if (level === 2) { //Enables save, edit and remove buttons
      for (let i of [2, 3, 4]) {toolbar.children[i].classList.remove('inactive');}
    }
    else {return;}
  }

  //Initialize object
  (function (){
    //Inheriting from Panel Object
    Panel.call(this, 'Rotinas', [
      {className: 'icon-plus', tooltip: 'New Routine'},
      {className: 'icon-document', tooltip: 'Load Routine'},
      {className: 'icon-save', tooltip: 'Save Routine'},
      {className: 'icon-pick', tooltip: 'Edit Routine'},
      {className: 'icon-x'   , tooltip: 'Remove'},
    ]);
    toolbar = this.node().getElementsByClassName('panel-toolbar')[0];
    pContents = this.node().getElementsByClassName('panel-body')[0];
    pContents.classList.add('routine-panel');
    updateToolbarButtons(0);

    pContents.addEventListener('mouseover', function ({target}) {
      if (mode.is(mode.SELECT)) {return;}
      let elem = getContainingElement(target);
      if (elem) {elem.classList.add('highlight');}
    });
    pContents.addEventListener('mouseout', ({target}) => {
      let elem = getContainingElement(target);
      if (elem) {elem.classList.remove('highlight');}
    });
    pContents.addEventListener('click', function({target, ctrlKey}) {
      if (!mode.is(mode.NORMAL)) {return;}
      let elem = getContainingElement(target);
      if (elem && target.classList.contains('routine-exec')) {
        executeRoutine(elem);
      }
      updateSelectedElems(elem, ctrlKey);
    });
    pContents.addEventListener('dblclick', function(e) {
      if (!mode.is(mode.DELETE)) {return;}
      removeRoutine(e.target);
    });
    pContents.addEventListener('contextmenu', ({x, y, target}) => {
      let elem = getContainingElement(target);
      let type = !elem ? 'inactive' : undefined;
      callParent('context', {x, y, contextItems: [
        {name: 'New Routine', return: 'new'},
        {name: 'Save', return: 'save', type},
        {name: 'Edit', return: 'edit', type},
        {name: 'Rename', return: 'rename', type},
        {name: 'Remove', return: 'remove', type},
      ]}).then((item) => {
        if (!item) {return;}
        if (item === 'rename') {renameRoutine(target);}
        else if (item === 'new') {addRoutine('Routine', true);}
        else if (item === 'save') {saveRoutine(target);}
        else if (item === 'edit') {editRoutine(target, null, true);}
        else if (item === 'remove') {removeRoutine(target);}
      });
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
RoutinePanel.prototype = Object.create(Panel.prototype);
Object.defineProperty(RoutinePanel.prototype, 'constructor', { 
  value: RoutinePanel, enumerable: false, writable: true
});
