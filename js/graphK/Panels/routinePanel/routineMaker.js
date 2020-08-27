"use strict";

module.exports = {RoutineMaker};

const {
  appendNewElement, createResizeHandler, createButtonWrapper
} = require('../../auxiliar/auxiliar.js');
const {Routine} = require('./routine.js');
const {RoutineStep} = require('./routineStep.js');
const {StepMaker} = require('./stepMaker.js');
const {NavTree} = require('../../auxiliar/navTree.js');
const d3 = require('d3');

/**
 * This constructor creates all the HTMLElements and event listeners necessary
 * to display a Routine object and allow for editing it, this means: adding;
 * removing; and connecting RoutineSteps.
 * @constructor
 * @param {Routine} startRoutine 
 * @param {Array} routineSteps 
 */
function RoutineMaker(startRoutine, routineSteps) {
  //Constants
  const node = appendNewElement(null, 'div', 'routine-maker');
  const svg = d3.create('svg:svg');
  const gridPattern1 = d3.create('svg:pattern');
  const gridPattern2 = d3.create('svg:pattern');
  const designRegion = d3.create('svg:g');
  const backGroup = d3.create('svg:g');
  const stepGroup = d3.create('svg:g');
  const frontGroup = d3.create('svg:g');
  
  const navTree = new NavTree();
  const routine = startRoutine.clone();
  const zoom = d3.zoom();
  //Private Properties
  var confirmCallback = () => null;
  //Public Methods
  this.node = () => node;
  this.onConfirm = function(callback) {
    if (typeof callback !== 'function') {throw new TypeError(
      `Expected function for argument 'callback'. Got ${typeof callback}`
    );}
    confirmCallback = callback;
  }
  this.setRoutineSteps = function(routineSteps) {
    navTree.clear();
    for (let step of routineSteps) {navTree.addToTree(step);}
  }
  //Private Functions
  function createGrid() {
    const id1 = 'routineMakerGrid1';
    const id2 = 'routineMakerGrid2';
    if ([id1, id2].some(id => document.getElementById(id))) {throw new Error(
      `Could not create RoutineMaker grid because of elems with same id in ` + 
      `the document. `
    );}
    let group = svg.append('svg:g').style('pointer-events', 'none');
    let defs = group.append('svg:defs');
    gridPattern1.attr('id', id1).attr('width', 20).attr('height', 20)
        .attr('patternUnits', 'userSpaceOnUse')
        .style('stroke-width', 0.5);
    gridPattern2.attr('id', id2).attr('width', 100).attr('height', 100)
        .attr('patternUnits', 'userSpaceOnUse')
        .style('stroke-width', 0.5);
    gridPattern1.append('svg:path').attr('d', 'M20,0L0,0L0,20');
    gridPattern2.append('svg:rect').attr('width', 100).attr('height', 100)
        .attr('fill', `url(#${id1})`);
    group.append('svg:rect').attr('width', '100%').attr('height', '100%')
        .attr('fill', `url(#${id2})`);
    defs.append(() => gridPattern1.node());
    defs.append(() => gridPattern2.node());
  }
  function zoomed() {
    const strokeWidth = 1 / (1 + d3.event.transform.k);
    gridPattern2.style('stroke-width', strokeWidth)
        .attr('patternTransform', d3.event.transform.toString());
    gridPattern1.style('stroke-width', strokeWidth);
    designRegion.attr('transform', d3.event.transform.toString());
  }
  function buildRoutine() {
    const nSteps = routine.steps.length;
    const stepMakers = [];
    for (let i = 0; i < nSteps; i++) {
      let stepMaker = new StepMaker(routine.steps[i], backGroup, frontGroup);
      stepGroup.append(() => stepMaker.selection.node());
      stepMakers.push(stepMaker);
      if (i > 1) {
        stepMaker.selection.node()
          .addEventListener('mousedown', handleMouseDown);
      }
    }
    for (let i = 0; i < nSteps; i++) {
      stepMakers[i].forEachParam(function(paramData) {
        if (!paramData.base.connection) {return;}
        const connectedStep = paramData.base.connection.step;
        const connectedBase = paramData.base.connection.paramBase;
        let targetStepM, targetParam;
        if (
          !(targetStepM = stepMakers.find(sm => sm.step === connectedStep)) ||
          !(targetParam = targetStepM.findParam(connectedBase))
        ) {return;}
        stepMakers[i].connectWithParam(paramData, targetParam);
      });
    }
  }
  function addStep(format, x = 0, y = 0) {
    const step = routine.addStep(format, x, y);
    const stepMaker = new StepMaker(step, backGroup, frontGroup);
    let stepElem = stepMaker.selection.node();
    stepGroup.append(() => stepElem);
    if (typeof format === 'string') {return;}
    stepElem.addEventListener('mousedown', handleMouseDown);
  }
  function handleMouseDown({currentTarget, button}) {
    if (button === 1) {removeStep(currentTarget);}
  }
  function removeStep(stepElem) {
    let targetStepM = StepMaker.getStepMakerFromElem(stepElem);
    if (!targetStepM) {return;}
    routine.removeStep(targetStepM.step);
    targetStepM.remove();
  }

  //Initialize Object
  ;(function () {
    let container, resizer, control;
    (function manipulateDOM() {
      //  Control region
      navTree.node().classList.add('highlightable');
      container = appendNewElement(node, 'div', 'row-container');
      control = appendNewElement(container, 'div', 'routine-control');
      resizer = appendNewElement(container, 'div', 'ew-resize');
      container.style.width = '150px';
      let treeWrapper = appendNewElement(control, 'div', 'tree-wrapper');
      treeWrapper.appendChild(navTree.node());
      let buttonWrapper = createButtonWrapper(['Confirm', 'Cancel'],
        button => confirmCallback(button === 'Confirm' ? routine : null));
      control.appendChild(buttonWrapper);

      //  Design Region
      svg.attr('class', 'routine-design');
      node.appendChild(svg.node());
      createGrid();
      svg.append(() => designRegion.style('pointer-events', 'none').node());
      designRegion.append(() => backGroup.attr('class', 'connect-group').node());
      designRegion.append(() => stepGroup.node());
      designRegion.append(() => frontGroup.attr('class', 'connect-group').node());
      buildRoutine();
      this.setRoutineSteps(routineSteps);
    }).call(this);

    svg.call(zoom);
    zoom.scaleExtent([0.2, 4]).on('zoom', zoomed);
    zoom.filter(() => 
      d3.event.target === svg.node() &&
      (d3.event.button === 0 || d3.event.type === 'wheel')
    );

    (function createEventListeners() {
      resizer.addEventListener('mousedown',
        createResizeHandler('ew', container, {min: 100, max: 500}));
      navTree.node().addEventListener('click', ({target}) => {
        navTree.toggleFolder(target);
      });
      navTree.node().addEventListener('dblclick', ({target}) => {
        let data = navTree.elemData(target);
        if (data) {addStep(data);}
      });
      control.addEventListener('mouseup', ({button}) => {
        if (button !== 1) {return;}
        let {error, stepsUsed} = routine.checkValidity();
        if (error) {console.warn(Routine.getErrorMsg(error));}
        else {
          let result = routine.calculate('inputData->');
          console.log('result: ' + result);
          //console.log(routine.toString());
        }
      });
    }).call(this);
  }).call(this);
}

/**
 * Creates a RoutineMaker object to edit the routine parameter given the
 * routineSteps and appends the RoutineMaker node to the appendToElem
 * HTMLElement paramenter. It returns a promise that will resolve with the
 * edited routine when the confirm routine button inside the RoutineMaker
 * is clicked.
 * @param {Routine} routine - Routine oject to be represented and edited
 * @param {Array} routineSteps - An array of steps that can be added to the
 * routine.
 * @param {HTMLElement} appendToElem - HTMLElement to append the RoutineMaker
 * element.
 * @returns {Promise} Promise will resolve with the edited Routine when the
 * RoutineMaker calls its confirmCallback, i.e. when the confirm button is
 * clicked by the user.
 */
RoutineMaker.editRoutine = function(routine, routineSteps, appendToElem) {
return new Promise((resolve) => {
  const routineMaker = new RoutineMaker(routine, routineSteps);
  routineMaker.onConfirm(function(routine) {
    if (routine === null) {return resolve(null);}
    let {error, stepsUsed} = routine.checkValidity();
    if (error) {
      alert(Routine.getErrorMsg(error));
      return;
    }
    if (stepsUsed.length !== routine.steps.length) {
      alert('There are unused steps in this routine');
    }
    resolve(routine);
  });
  appendToElem.appendChild(routineMaker.node());
});}

RoutineMaker.transformsToSteps = function transformsToSteps(transforms) {
  const steps = [];
  for (let tf of transforms.value) {
    var step = Object.assign({}, tf);
    if (tf.value) { //corresponds to a folder
      step.value = transformsToSteps(tf);
    }
    else {step.data = step;}
    steps.push(step);
  }
  return steps;
}