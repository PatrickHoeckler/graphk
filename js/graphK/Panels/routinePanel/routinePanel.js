"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

module.exports = {RoutinePanel};

const {appendNewElement, selectDataInRange} = require('../../auxiliar/auxiliar.js');
const {Context} = require('../../auxiliar/context.js');
const {Panel} = require('../../PanelManager/panel.js');

function RoutinePanel(modeObj) {
  if (modeObj === null || typeof(modeObj) !== 'object') {throw new Error(
    'Cannot create object without a reference to a Mode() object to hold ' +
    'the mode of operation of this object'
  );}
  //Constants
  const mode = modeObj;
  const routines = [];
  const selectedElems = [];
  //Public Attributes
  //Private Properties
  var pContents, toolbar;
  var contextCallback;
  var callParent = () => Promise.reject(new Error('callParent not set'));

  //Public Methods
  this.newRoutine = newRoutine;
  this.addToRoutine = addToRoutine;
  this.removeInRoutine = removeInRoutine;
  this.renameRoutine = renameRoutine;
  this.onContext  = (callback) => contextCallback = callback;
  this.onCallParent = function (
    executor = () => Promise.reject(new Error('callParent not set'))
  ) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
  callParent = executor;
  }

  //Private Functions
  function newRoutine(name, openRenameBox = false) {
    if (!name) {name = 'Routine';}
    let routine = [];
    let rElem = appendNewElement(pContents, 'div', 'routine');
    let rHead = appendNewElement(rElem, 'div', 'routine-head');
    appendNewElement(rElem, 'div', 'routine-contents');
    appendNewElement(rHead, 'span', 'node-icon');
    appendNewElement(rHead, 'span', 'node-name').innerHTML = name;
    let rButton = appendNewElement(rHead, 'span', 'routine-button routine-exec');
    rButton.setAttribute('title', 'Execute Routine');
    routines.push(routine);
    if (openRenameBox) {renameRoutine(rHead);}
  }
  function addToRoutine(target, name, openRenameBox) {
    let id = findRoutineId(target);
    let routine = routines[id];
    if (!routine) {return false;}
    routine.push(null); //push empty step to routine
    pContents.children[id].classList.remove('collapsed');
    let rContents = pContents.children[id].children[1];
    let rStep = appendNewElement(rContents, 'div', 'routine-step empty');
    appendNewElement(rStep, 'div', 'node-icon');
    appendNewElement(rStep, 'div', 'node-name').innerHTML = name;
    let rButton = appendNewElement(rStep, 'span', 'routine-button routine-cfg');
    rButton.setAttribute('title', 'Configure Step');
    if (openRenameBox) {renameRoutine(rStep);}
    return true;
  }
  function findRoutineId(target) {
    if (typeof(target) === 'number') {return pContents.children[target] ? target : null;}
    else { try {
      for (let i = 0; i < pContents.children.length; i++) {
        if (pContents.children[i].contains(target)) {return i;}
      }
      return null;
    } catch {return null;}}
  }
  function getContainingElement(target) {
    for (let curElem = target;; curElem = curElem.parentElement) {
      if (!curElem || curElem === pContents) {return null;}
      if (curElem.classList.contains('routine-head') ||
          curElem.classList.contains('routine-step')) {return curElem;}
    }
  }
  function renameRoutine(target) {
    let elem = getContainingElement(target);
    if (!elem) {return false;}
    if (!mode.change(mode.RENAME)) {return false;}
    mode.lock();
    let [,textElem, rButton] = elem.children;
    textElem.style.display = rButton.style.display = 'none';
    let renameBox = appendNewElement(elem, 'input', 'rename');
    renameBox.setAttribute('type', 'text');
    renameBox.setAttribute('value', textElem.innerText);
    renameBox.focus();
    renameBox.select();

    //Functions to handle input events
    function checkStopKeys(e) {
      if (e.keyCode === 13 || e.keyCode === 27) {renameBox.blur();}
    }
    function setName() {
      textElem.innerHTML = renameBox.value;
      textElem.style.display = rButton.style.display = '';
      mode.unlock();
      mode.change(mode.NORMAL);
      renameBox.remove();
      renameBox.removeEventListener('keydown', checkStopKeys);
    }
    renameBox.addEventListener('focusout', setName, {once: true});
    renameBox.addEventListener('keydown', checkStopKeys);
    return true;
  }
  function executeRoutine(target) {
    let id = findRoutineId(target);
    let routine = routines[id];
    if (!routine.some((step) => step)) {return;}
    //calls parent to get data via mouse selection
    callParent('get-data').then(({data, canceled}) => {
      if (canceled) {return;}
      data = data.value;
      for (let step of routine) {
        if (!step) {continue;}
        if (step.func) {data = step.func(data, step.args);}
        else if (step.range) {data = selectDataInRange(data, step.range);}
      }
      //calls parent to add new data to tree
      return callParent('add-data', {data: data, name: target.innerText});
    });
  }
  function createStepAction(rStep) {
    //opening a context box to let the user choose an option
    let items = [
      {name: 'Trasformation', return: 'transform'},
      {name: 'Range', type: 'submenu', submenu: [
        {name: 'Select from chart', return: 'select-range'},
        {name: 'Input limits', return: 'input-range'}
      ]},
      {name: 'Clear Step', return: 'clear'}
    ]
    let {x, y, right} = rStep.children[2].getBoundingClientRect();
    let context = new Context(x, y, items, function(option) {
      context.destroy();
      let id = findRoutineId(rStep);
      let stepId = Array.prototype.indexOf.call(rStep.parentElement.children, rStep);
      if (option === 'clear') {
        routines[id][stepId] = null;
        rStep.classList.add('empty');
      }
      function setStep(action, canceled) {
        if (canceled) {return;}
        routines[id][stepId] = action;
        rStep.classList.remove('empty');
      }
      if (option === 'transform') {
        callParent(option, {x: right}).then(({func, args, canceled}) => {
          setStep({func: func, args: args}, canceled);
        });
      }
      else if (option === 'select-range') {
        callParent(option)
      }
      else if (option === 'input-range') {
        callParent('arguments', {argsFormat: [
          {name: 'lower',  type: 'number', optional: true, tooltip: 'Limite inferior para o eixo x'},
          {name: 'higher', type: 'number', optional: true, tooltip: 'Limite superior para o eixo x'},
        ], windowTitle: 'Input x-axis selection range'})
        .then(({args, canceled}) => {
          if (canceled) {return;}
          if (args.lower >= args.higher) {return alert(
            'Não é possível fazer a seleção no intervalo selecionado'
          );}
          routines[id][stepId] = {range: Object.values(args)};
          rStep.classList.remove('empty');
        });
      }
    });
    context.appendTo(document.body);
  }
  function removeInRoutine(target) {
    let elem = getContainingElement(target);
    if (!elem) {return false;}
    let id = findRoutineId(elem);
    if (id === null) {return false;}
    if (elem.classList.contains('routine-head')) {
      routines.splice(id, 1);
      pContents.children[id].remove();
    }
    else {
      let rContents = pContents.children[id].children[1];
      let stepId = Array.prototype.indexOf.call(rContents.children, elem);
      elem.remove();
      routines[id].splice(stepId, 1);
    }
    id = selectedElems.indexOf(elem);
    if (id !== -1) {selectedElems.splice(id, 1);}
    if (selectedElems.length === 0) {updateToolbarButtons(0);}
    return true;
  }
  function executeToolbarAction(buttonId, targetElems) { return function execute() 
  {
    //If clicked on new routine
    if (buttonId === 0) {newRoutine('Routine', true);}
    //If clicked on new step
    else if (buttonId === 1) {
      let openRenameBox = targetElems.length === 1;
      for (let target of targetElems) {
        addToRoutine(target, 'Step', openRenameBox);
      }
    }
    else if (buttonId === 2) { //If clicked on remove
      while (targetElems.length) {
        let target = targetElems.pop();
        //must make this check to avoid removing an element that was contained
        //inside another element that was already removed
        if (pContents.contains(target)) {removeInRoutine(target);}
      }
    }
    window.removeEventListener('mouseup', execute);
  }}
  function updateSelectedElems(elem, addToSelection) {
    if (addToSelection && selectedElems.length) {
      if (!elem) {return;} //ignores clicks outside any routine
      if (selectedElems.includes(elem)) {return;}
      elem.classList.add('selected');
      selectedElems.push(elem);
    }
    else {
      //If clicked outside any routine
      if (!elem) {return clearSelection();}
      while (selectedElems.length > 1) {
        selectedElems.pop().classList.remove('selected');
      }
      if (selectedElems[0] !== elem) {
        if (selectedElems[0]) {selectedElems[0].classList.remove('selected');}
        else {updateToolbarButtons(1);}
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
      //Disables the new step and remove buttons (from when there's no selection)
      for (let i of [1, 2]) {toolbar.children[i].classList.add('inactive');}
    }
    else if (level === 1) { //Enables new step and remove buttons
      for (let i of [1, 2]) {toolbar.children[i].classList.remove('inactive');}
    }
    else {return;}
  }

  //Initialize object
  (function (){
    //Inheriting from Panel Object
    Panel.call(this, 'ROTINAS', [
      {className: 'icon-plus', tooltip: 'New Routine'},
      {className: 'icon-step', tooltip: 'New Step'},
      {className: 'icon-x'   , tooltip: 'Remove'},
    ]);
    toolbar = this.node().getElementsByClassName('panel-toolbar')[0];
    pContents = this.node().getElementsByClassName('panel-body')[0];
    pContents.classList.add('routine-panel');
    updateToolbarButtons(0);

    pContents.addEventListener('mouseover', function (e) {
      if (mode.is(mode.SELECT)) {return;}
      let elem = getContainingElement(e.target);
      if (elem) {elem.classList.add('highlight');}
    });
    pContents.addEventListener('mouseout', (e) => {
      let elem = getContainingElement(e.target);
      if (elem) {elem.classList.remove('highlight');}
    });
    pContents.addEventListener('click', function({target, ctrlKey}) {
      if (!mode.is(mode.NORMAL)) {return;}
      let elem = getContainingElement(target);
      if (elem) {
        if (elem.classList.contains('routine-head')) {
          if (target.classList.contains('routine-exec')) {executeRoutine(elem);}
          else if (target.classList.contains('node-icon')) {
            elem.parentElement.classList.toggle('collapsed');
          }
        }
        else if (target.classList.contains('routine-cfg')) {createStepAction(elem);}
      }
      updateSelectedElems(elem, ctrlKey);
    });
    pContents.addEventListener('dblclick', function(e) {
      if (!mode.is(mode.DELETE)) {return;}
      removeInRoutine(e.target);
    });
    pContents.addEventListener('contextmenu', (e) => {
      if (!contextCallback) {return};
      let detail;
      let elem = getContainingElement(e.target);
      if (!elem) {detail = 'panel';}
      else if (elem.classList.contains('routine-head')) {detail = 'head';}
      else {detail = 'step';}
      contextCallback(e, 'routine', detail);
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