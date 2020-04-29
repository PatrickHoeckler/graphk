"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
//

graphK.RoutinePanel = function () {
  //Constants
  const routines = [];
  //Public Attributes
  
  //Private Properties
  var node, mode;
  var contextCallback, getStep;
  var getDataCallback, saveDataCallback;

  //Public Methods
  this.node = () => node;
  this.setModeObj = (modeObj) => mode = modeObj;
  this.newRoutine = function (name, openRenameBox = false) {
    if (!name) {name = 'new routine';}
    let rtn = [];
    let rtnBox = graphK.appendNewElement(node, 'div', 'routine-box');
    let rtnHead = graphK.appendNewElement(rtnBox, 'div', 'routine-head');
    graphK.appendNewElement(rtnBox, 'div', 'routine-sequence');
    graphK.appendNewElement(rtnHead, 'span', 'node-name').innerHTML = name;
    let rtnBut = graphK.appendNewElement(rtnHead, 'span', 'routine-button routine-exec');
    rtnBut.setAttribute('title', 'Execute Routine');
    routines.push(rtn);
    if (openRenameBox) {renameRoutine(rtnHead);}
  }
  this.addToRoutine = function (target, name, openRenameBox) {
    let id = findRoutineId(target);
    let rtn = routines[id];
    if (!rtn) {return false;}
    rtn.push(null); //push empty step to routine
    node.children[id].classList.remove('collapsed');
    let rtnSeq = node.children[id].children[1];
    let rtnStep = graphK.appendNewElement(rtnSeq, 'div', 'routine-step empty');
    graphK.appendNewElement(rtnStep, 'div', 'node-name').innerHTML = name;
    let rtnBut = graphK.appendNewElement(rtnStep, 'span', 'routine-button routine-cfg');
    rtnBut.setAttribute('title', 'Configure Step');
    if (openRenameBox) {renameRoutine(rtnStep);}
    return true;
  }
  this.removeInRoutine = removeInRoutine;
  this.renameRoutine = renameRoutine;
  this.onGetStep  = (callback) => getStep = callback;
  this.onContext  = (callback) => contextCallback = callback;
  this.onGetData  = (callback) => getDataCallback = callback;
  this.onSaveData = (callback) => saveDataCallback  = callback;

  //Private Functions
  function findRoutineId(target) {
    if (typeof(target) === 'number') {return node.children[target] ? target : null;}
    else { try {
      for (let i = 0; i < node.children.length; i++) {
        if (node.children[i].contains(target)) {return i;}
      }
      return null;
    } catch {return null;}}
  }
  function getContainingElement(target) {
    for (let curElem = target;; curElem = curElem.parentElement) {
      if (!curElem || curElem === node) {return null;}
      if (curElem.classList.contains('routine-head') ||
          curElem.classList.contains('routine-step')) {return curElem;}
    }
  }
  function renameRoutine(target) {
    let elem = getContainingElement(target);
    if (!elem) {return false;}
    if (!mode.change(graphK.mode.RENAME)) {return false;}
    let [textElem, rtnBut] = elem.children;
    textElem.style.display = rtnBut.style.display = 'none';
    let renameBox = graphK.appendNewElement(elem, 'input', 'rename');
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
      textElem.style.display = rtnBut.style.display = '';
      mode.change(graphK.mode.NORMAL);
      renameBox.remove();
      renameBox.removeEventListener('keydown', checkStopKeys);
    }
    renameBox.addEventListener('focusout', setName, {once: true});
    renameBox.addEventListener('keydown', checkStopKeys);
  }
  function executeRoutine(target) {
    let id = findRoutineId(target);
    let rtn = routines[id];
    if (!rtn.some((step) => step)) {return;}

    getDataCallback(function(data) {
      if (!data) {return;}
      let result = data;
      for (let step of rtn) {
        if (step.func) {result = step.func(result, step.args);}
        else if (step.region) {};
      }
      saveDataCallback(result);
    });
  }
  function createStepAction(rtnStep) {
    //opening a context box to let the user choose an option
    let items = [
      {name: 'Trasformation', return: 'transform'},
      {name: 'Selection', return: 'select'},
      {name: 'Clear Step', return: 'clear'}
    ]
    let {x, y} = rtnStep.children[1].getBoundingClientRect();
    let context = new graphK.Context(x, y, items, function(option) {
      context.destroy();
      let id = findRoutineId(rtnStep);
      let stepId = Array.prototype.indexOf.call(rtnStep.parentElement.children, rtnStep);
      if (option === 'clear') {
        routines[id][stepId] = null;
        rtnStep.classList.add('empty');
      }
      else {
        getStep(option, rtnStep, function(action) {
          if (!action) {return;}
          routines[id][stepId] = action;
          rtnStep.classList.remove('empty');
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
      node.children[id].remove();
    }
    else {
      let rtnSeq = node.children[id].children[1];
      let stepId = Array.prototype.indexOf.call(rtnSeq.children, elem);
      elem.remove();
      routines[id].splice(stepId, 1);
    }
    return true;
  }

  //Initialize object
  (function (){
    node = graphK.appendNewElement(null, 'div', 'routine-panel');
    node.addEventListener('mouseover', function (e) {
      if (mode.mode() === graphK.mode.SELECT) {return;}
      let elem = getContainingElement(e.target);
      if (elem) {elem.classList.add('highlight');}
    });
    node.addEventListener('mouseout', (e) => {
      let elem = getContainingElement(e.target);
      if (elem) {elem.classList.remove('highlight');}
    });
    node.addEventListener('click', function(e) {
      if (mode.mode() !== graphK.mode.NORMAL) {return;}
      let elem = getContainingElement(e.target);
      if (!elem) {return;}
      if (elem.classList.contains('routine-head')) {
        if (e.target.classList.contains('routine-exec')) {executeRoutine(elem);}
        else {elem.parentElement.classList.toggle('collapsed');}
      }
      else if (e.target.classList.contains('routine-cfg')) {createStepAction(elem);}
    });
    node.addEventListener('dblclick', function(e) {
      if (mode.mode() !== graphK.mode.DELETE) {return;}
      removeInRoutine(e.target);
    });
    node.addEventListener('contextmenu', (e) => {
      if (!contextCallback) {return};
      let detail;
      let elem = getContainingElement(e.target);
      if (!elem) {detail = 'panel';}
      else if (elem.classList.contains('routine-head')) {detail = 'head';}
      else {detail = 'step';}
      contextCallback(e, 'routine', detail);
    });
  })();
}