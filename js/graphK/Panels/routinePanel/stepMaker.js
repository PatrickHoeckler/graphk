"use strict";

module.exports = {StepMaker}

const {RoutineStep} = require('./routineStep.js');
const {mouseOverHighlight, countDecimals} = require('../../auxiliar/auxiliar.js')
const d3 = require('d3');

const _stepData = Symbol('StepMaker.stepData');
const _paramData = Symbol('StepMaker.paramData');

function StepMaker(routineStep, backGroupSel, frontGroupSel) {
  //Constants
  const step = routineStep;
  const stepSel = d3.create('svg:g');
  const backGroup = backGroupSel;
  const frontGroup = frontGroupSel;
  //Public Attributes
  this.step;
  this.stepSel;
  this.backGroup;
  this.frontGroup;
  //Private Properties

  //Public Methods
  this.remove = function() {
    for (let i = 0, n = stepSel.node().children.length; i < n; i++) {
      const paramData = stepSel.node().children[i][_paramData];
      if (!paramData) {continue;}
      if (paramData.connection) { //input parameter with a connection
        let pConnect = paramData.connection.paramConnected;
        let id = pConnect.connections.findIndex(c => c.paramConnected === paramData);
        pConnect.connections.splice(id, 1)[0].lineGroup.remove();
        paramData.connection = null;
      }
      else if (paramData.connections) { //output parameter with connections
        for (let {paramConnected} of paramData.connections) {
          paramConnected.connection.lineGroup.remove();
          paramConnected.connection = null;
        }
        paramData.connections.length = 0;
      }
    }
    stepSel.select('*').remove();
    stepSel.remove();
  }
  function handleMouseOver(event) {
    if (event.buttons !== 0) {return;} //if holding any mouse buttons
    const paramData = StepMaker.getParamData(event.target);
    if (paramData && paramData.plugCircle === event.target) {
      mouseOverHighlight(event.target);
    }
  }
  function handleMouseDown(event) {
    if (event.button !== 0) {return;}
    const paramData = StepMaker.getParamData(event.target);
    if (paramData) {
      if (paramData.plugCircle === event.target)   {startConnection(event);}
      else if (paramData.base.format.type === 'number') {adjustNumberParameter(event);}
      else if (paramData.base.format.type === 'data'  ) {moveStep(event);}
      else if (paramData.base.format.type === 'select') {inputSelectParameter(event);}
    }
    else {moveStep(event);}
  }
  function handleDblClick(event) {
    if (event.button !== 0) {return;}
    const paramData = StepMaker.getParamData(event.target);
    if (paramData) {
      if (paramData.base.format.type === 'number') {inputNumberParameter(event);}
    }
  }
  function createStepElements(elementData) {
    stepSel.attr('class', 'routine-step')
        .style('transform', `translate(${step.pos[0]}px, ${step.pos[1]}px)`);
    stepSel.node()[_stepData] = elementData;
    stepSel.node().addEventListener('mousedown', handleMouseDown);
    stepSel.node().addEventListener('mouseover', handleMouseOver);
    stepSel.node().addEventListener('dblclick' , handleDblClick );
    const noTitle = typeof step.format === 'string';
    const nParams = step.parameters.length;
    const height = noTitle ? 40 : (nParams + 2) * 20;
    let stepBox = stepSel.append('svg:g').attr('class', 'routine-step-box');
    stepBox.append('svg:rect').attr('width', 200).attr('height', height)
        .style('pointer-events', 'all');
    
    let y = -10;
    if (!noTitle) {
      y += 20;
      stepBox.append('svg:text').attr('x', 100).attr('y', 15)
        .html(step.format.name);
    }
    for (let i = 0; i < nParams; i++) {
      stepSel.append(() => createParameter(step.parameters[i], y += 20).node());
    }
  }
  //Initialize Object
  ;(function () {
    if (!(backGroupSel instanceof d3.selection) ||
      !(frontGroupSel instanceof d3.selection)) {throw new TypeError(
      `Expected a instance of d3.selection for the 'backGroupSel' and ` +
      `'frontGroupSel' arguments`
    );}
    if (!(routineStep instanceof RoutineStep)) {throw new TypeError(
      `Expected a instance of RoutineStep for the 'routineStep' argument`
    );}
    createStepElements(this);
    Object.defineProperties(this, {
      step: {value: step},
      selection: {value: stepSel},
      backGroup: {value: backGroup},
      frontGroup: {value: frontGroup}
    });
  }).call(this);
}

StepMaker.prototype = {
  constructor: StepMaker,
  moveInFront: function() {
    this.selection.node().parentElement.appendChild(this.selection.node());
  },
  moveTo: function(x, y) {
    this.step.pos[0] = x;
    this.step.pos[1] = y;
    this.selection.style('transform',
      `translate(${x}px,${y}px)`);
    this.forEachParam(function(paramData) {
      if (paramData.connection) { //input parameter with a connection
        let line = paramData.connection.lineGroup.select('line');
        line.attr('x2', x)
            .attr('y2', y + paramData.dy + 10);
      }
      else if (paramData.connections) { //output parameter with connections
        for (let connection of paramData.connections) {
          let line = connection.lineGroup.select('line');
          line.attr('x1', x + 200)
              .attr('y1', y + paramData.dy + 10);
        }
      }
    });
  },
  forEachParam: function(callback) {
    const nodeChildren = this.selection.node().children;
    const nChildren = nodeChildren.length;
    //starts i from 1 because the first child is always the stepBox element
    //and not a parameter
    for (let i = 1; i < nChildren; i++) {
      const paramData = nodeChildren[i][_paramData];
      if (paramData) {callback(paramData);}
    }
  },
  findParam: function(paramBase) {
    const nodeChildren = this.selection.node().children;
    const nChildren = nodeChildren.length;
    for (let i = 1; i < nChildren; i++) {
      const paramData = nodeChildren[i][_paramData];
      if (paramData.base === paramBase) {return paramData;}
    }
    return null;
  },
  connectWithParam: function(thisParam, targetParam, lineGroup) {
    const targetStepM = StepMaker.getStepMakerFromElem(targetParam.container);
    const thisStepM = StepMaker.getStepMakerFromElem(thisParam.container);
    if (
      !targetStepM ||
      targetStepM === this || thisStepM !== this ||
      targetParam.base.direction === thisParam.base.direction ||
      targetParam.base.format.type !== thisParam.base.format.type ||
      targetParam.connection || thisParam.connection
    ) {return;}
    let line;
    if (!lineGroup) {
      lineGroup = d3.create('svg:g');
      line = lineGroup.append('svg:line');
    }
    else {line = lineGroup.select('line');}

    const [inStepM, inParam, outStepM, outParam] = thisParam.base.direction === 1 ?
      [thisStepM, thisParam, targetStepM, targetParam] :
      [targetStepM, targetParam, thisStepM, thisParam];
    inParam.base.connection = {step: outStepM.step, paramBase: outParam.base};
    inParam.connection = {paramConnected: outParam, lineGroup};
    outParam.connections.push({paramConnected: inParam, lineGroup});
    line.attr('x1', +outParam.plugCircle.style.cx + outStepM.step.pos[0])
        .attr('y1', +outParam.plugCircle.style.cy + outStepM.step.pos[1] + outParam.dy)
        .attr('x2',  +inParam.plugCircle.style.cx +  inStepM.step.pos[0])
        .attr('y2',  +inParam.plugCircle.style.cy +  inStepM.step.pos[1] +  inParam.dy);
    inStepM.backGroup.append(() => lineGroup.node());
  }
}
StepMaker.getParamData = function(elem) {
  while (elem && !elem[_paramData]) {elem = elem.parentElement;}
  return elem ? elem[_paramData] : null;
}
StepMaker.getStepMakerFromElem = function(elem) {
  while (elem && !elem[_stepData]) {elem = elem.parentElement;}
  return elem ? elem[_stepData] : null;
}
StepMaker.getContainingSVG = function(elem) {
  while (elem && elem.tagName !== 'svg') {elem = elem.parentElement;}
  return elem;
}

function createParameter(paramBase, dy = 0) {
  const format = paramBase.format;
  const paramGroup = d3.create('svg:g').attr('class', 'step-parameter')
      .style('transform', `translate(0px, ${dy}px)`);
  const paramData = paramGroup.node()[_paramData] = {
    base: paramBase, container: paramGroup.node(), dy
  };
  const boxGroup = paramGroup.append('svg:g')
      .style('pointer-events', 'all').attr('class', 'parameter-box');
  if (format.tooltip) {boxGroup.append('svg:title').html(format.tooltip);}
  boxGroup.append('svg:rect')
      .attr('width', 180).attr('height', 18).attr('y', 1).attr('x', 10);
  //====================
  if (format.type === 'data') {
    paramGroup.classed('parameter-data', true);
    boxGroup.append('svg:text').attr('x', 100).attr('y', 15)
        .style('text-anchor', 'middle').html(format.name);
  }
  else {
    if (format.type === 'number') {
      paramGroup.classed('parameter-number', true);
    }
    else if (format.type === 'select') {
      paramGroup.classed('parameter-select', true);
    }
    boxGroup.append('svg:text').attr('x', 15).attr('y', 15)
      .style('text-anchor', 'start').html(format.name);
    paramData.valueElem = boxGroup.append('svg:text')
      .attr('x', 180).attr('y', 15).style('text-anchor', 'end')
      .html(paramData.base.value).node();
  }
  //====================
  if (format.type !== 'select' && 
    (paramData.base.direction === 0 || paramData.base.direction === 1)
  ) {
    let plugGroup = paramGroup.append('svg:g').attr('class', 'step-plug')
      .style('pointer-events', 'all');
    let snapBox = plugGroup.append('svg:rect').style('height', 20);
    let circle = plugGroup.append('svg:circle').style('cy', 10);
    paramData.plugCircle = circle.node();
    paramData.plugGroup = plugGroup.node();
    if (paramData.base.direction === 0) {
      snapBox.style('transform', 'translateX(200px)');
      circle.style('cx', 200);
      paramData.connections = [];
    }
    else {paramData.connection = null;}
  }
  return paramGroup;
}

function adjustNumberParameter({target, x}) {
  const paramData = StepMaker.getParamData(target);
  const pf = paramData.base.format;
  const x0 = x;
  const step = pf.step ? pf.step : pf.min && pf.max ?
    1 / Math.pow(10, countDecimals(pf.max - pf.min)) : 0.1;
  const mouseStrength = 0.02;
  const decimals = countDecimals(step);
  const v0 = paramData.base.value ? 
    Number(paramData.base.value.toFixed(decimals)) : 0;
  function move({x}) {
    paramData.base.value = v0 + step * Math.floor(mouseStrength * (x - x0));
    if (paramData.base.value < pf.min) {paramData.base.value = pf.min;}
    else if (paramData.base.value > pf.max) {paramData.base.value = pf.max;}
    paramData.valueElem.innerHTML = paramData.base.value.toFixed(decimals);
  }
  function stop() {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', stop);
  }
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', stop);
}

function inputNumberParameter({target}) {
  const paramData = StepMaker.getParamData(target);
  const boxGroup = d3.select(paramData.container).select('.parameter-box');
  //this if is necessary for this function to not execute twice
  if (!boxGroup.node()) {return;}
  const pf = paramData.base.format;
  const boxRect = boxGroup.select('rect');
  const foreign = d3.create('svg:foreignObject')
      .attr('x', boxRect.attr('x')).attr('width', boxRect.attr('width'))
      .attr('y', boxRect.attr('y')).attr('height', boxRect.attr('height'))
      .style('pointer-events', 'all');
  const input = foreign.append('xhtml:input')
      .attr('class', 'parameter-input-number').attr('type', 'number')
      .attr('value', paramData.valueElem.innerHTML);
  input.attr('min', pf.min);
  input.attr('max', pf.max);
  input.attr('step', pf.step ? pf.step : 'any');
  if (!pf.optional) {input.attr('required', true);}
  function checkKey({key}) {
    if (key === 'Escape' ||
      (key === 'Enter' && input.node().reportValidity())
    ) {input.node().blur();}
  }
  function stop() {
    if (input.node().checkValidity()) {
      paramData.base.value = input.node().value === '' ? null :
        Number(input.node().value);
      paramData.valueElem.innerHTML = paramData.base.value !== null ? 
        paramData.base.value : '';
    }
    foreign.node().replaceWith(boxGroup.node());
    input.node().removeEventListener('blur', stop);
    input.node().removeEventListener('keyup', checkKey);
  }
  input.node().addEventListener('blur', stop);
  input.node().addEventListener('keyup', checkKey);
  StepMaker.getStepMakerFromElem(paramData.container).moveInFront();
  boxGroup.node().replaceWith(foreign.node());
  input.node().select();
}

function inputSelectParameter({target}) {
  const paramData = StepMaker.getParamData(target);
  const boxGroup = d3.select(paramData.container).select('.parameter-box');
  //this if is necessary for this function to not execute twice
  if (!paramData.container[_paramData]) {return;}
  paramData.container[_paramData] = null; //will reset to paramData later
  const boxRect = boxGroup.select('rect');
  const optionsGroup = d3.create('svg:g')
      .attr('class', 'parameter-input-select')
      .style('transform', paramData.container.style.transform);
  //the attribution bellow will allow the mouse handlers to know this
  //element corresponds to a parameter
  optionsGroup.node()[_paramData] = paramData;
  const x = Number(boxRect.attr('x')), y = Number(boxRect.attr('y'));
  const width = Number(boxRect.attr('width'));
  const height = Number(boxRect.attr('height')) + 2 * y;
  const textY = height - y - 3;
  let groupY = -height;
  for (let {name, tooltip} of paramData.base.format.option) {
    let group = optionsGroup.append('svg:g')
        .style('transform', `translate(${x}px, ${groupY += height}px)`);
    if (tooltip) {group.append('svg:title').html(tooltip);}
    group.append('svg:rect')
        .attr('width', width).attr('height', height)
        .style('pointer-events', 'all');
    group.append('svg:text').style('text-anchor', 'middle')
        .attr('x', width / 2).attr('y', textY).html(name);
  }
  function stop({target}) {
    if (Date.now() - t0 < 300) {return;}
    if (optionsGroup.node().contains(target)) {
      paramData.base.value = target.nextSibling.innerHTML;
      paramData.valueElem.innerHTML = paramData.base.value;
    }
    optionsGroup.remove();
    paramData.container[_paramData] = paramData;
    svg.removeEventListener('mouseup', stop);
  }
  const thisStepM = StepMaker.getStepMakerFromElem(paramData.container);
  const svg = StepMaker.getContainingSVG(thisStepM.selection.node());
  thisStepM.moveInFront();
  thisStepM.selection.append(() => optionsGroup.node());
  svg.addEventListener('mouseup', stop);
  const t0 = Date.now();
}

function moveStep({target, offsetX, offsetY}) {
  const stepMaker = StepMaker.getStepMakerFromElem(target);
  const svg = StepMaker.getContainingSVG(target);
  if (!stepMaker || !svg) {return;}
  const [x0, y0] = d3.zoomTransform(svg).invert([offsetX, offsetY]);
  const [tx, ty] =  stepMaker.step.pos;
  stepMaker.moveInFront();
  stepMaker.selection.node().classList.add('highlight');
  //===================
  function move({offsetX, offsetY}) {
    const [x1, y1] = d3.zoomTransform(svg).invert([offsetX, offsetY]);
    stepMaker.moveTo(tx + x1 - x0, ty + y1 - y0);
  }
  function stop() {
    stepMaker.selection.node().classList.remove('highlight');
    svg.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', stop);
  }
  svg.addEventListener('mousemove', move);
  window.addEventListener('mouseup', stop);
}

function startConnection({target, offsetX, offsetY}) {
  const thisStepM = StepMaker.getStepMakerFromElem(target);
  const thisParam = StepMaker.getParamData(target);
  const svg = StepMaker.getContainingSVG(target);
  if (!thisStepM || !thisParam || !svg) {return;}
  //In making a connection a user will click a plugCircle and drag a line to
  //make a connection to another plugCircle. In this action there will be an
  //anchorStepM that will hold still the end of the line in the anchorParam
  //plugCircle. In most cases the anchorStepM will be the same as the step
  //clicked by the user (const thisStepM). But in the case of trying to call
  //startConnection on an already connected input plug, then we will want to
  //disconnect this plug and move the connection somewhere else instead of
  //adding another connection, so in this case the anchorStepM will be the
  //step that was connected to the parameter clicked.
  //Since only input steps have the 'connection' key, we only need to check
  //for it to choose the anchor.
  const anchorParam = thisParam.connection ?
    thisParam.connection.paramConnected : thisParam ;
  const anchorStepM = anchorParam === thisParam ? thisStepM : 
    StepMaker.getStepMakerFromElem(anchorParam.plugGroup);
  //When the step is moved in the moveStep function, it will move the whole
  //step block and will also move the lines connected to it. It will use the
  //paramData of the parameters to get the line element and move it, but it
  //must know if it should move the line by its x1 and y1 positions or by the
  //x2 and y2 positions. Instead of trying to calculate which position should
  //be changed, we can just set a default in this function that creates the
  //line in the first place. So we define that: parameters that are of output
  //direction will be connected to the line x1 and y1, parametes of input
  //direction will connect to the x2 and y2.
  const [anchorPos, freePos] = anchorParam.base.direction === 1 ? 
    [['x2', 'y2'], ['x1', 'y1']] : [['x1', 'y1'], ['x2', 'y2']];
  const [mX, mY] = d3.zoomTransform(svg).invert([offsetX, offsetY]);
  let lineGroup, line;    
  if (anchorStepM !== thisStepM) {
    lineGroup = thisParam.connection.lineGroup.remove();
    thisStepM.frontGroup.append(() => lineGroup.node());
    line = lineGroup.select('line');
    thisParam.connection = null;
    thisParam.base.connection = null;
    let id = anchorParam.connections.findIndex(c => c.paramConnected === thisParam);
    anchorParam.connections.splice(id, 1);
  }
  else {
    const style = anchorParam.plugCircle.style;
    lineGroup = thisStepM.frontGroup.append('svg:g');
    line = lineGroup.append('svg:line')
      .attr(anchorPos[0], +style.cx + anchorStepM.step.pos[0])
      .attr(anchorPos[1], +style.cy + anchorStepM.step.pos[1] + anchorParam.dy);
  }
  line.attr(freePos[0], mX).attr(freePos[1], mY);
  //=======================
  function getTargetParam(targetStepM, targetElem) {
    let targetParam;
    if (
      targetStepM && targetStepM !== anchorStepM &&
      (targetParam = StepMaker.getParamData(targetElem)) &&
      targetParam.base.direction !== anchorParam.base.direction &&
      targetParam.base.format.type === anchorParam.base.format.type &&
      !targetParam.connection
    ) {return targetParam;}
    return null;
  }
  function move({target, offsetX, offsetY}) {
    let targetStepM = StepMaker.getStepMakerFromElem(target);
    let targetParam = getTargetParam(targetStepM, target);
    let mX, mY;
    if (targetParam) {
      const style = targetParam.plugCircle.style;
      mX = +style.cx + targetStepM.step.pos[0];
      mY = +style.cy + targetStepM.step.pos[1] + targetParam.dy;
    }
    else {[mX, mY] = d3.zoomTransform(svg).invert([offsetX, offsetY]);}
    line.attr(freePos[0], mX).attr(freePos[1], mY);
  }
  //=======================
  function stop({target}) {
    let targetStepM = StepMaker.getStepMakerFromElem(target);
    let targetParam = getTargetParam(targetStepM, target);
    lineGroup.remove();
    if (targetParam) {
      anchorStepM.connectWithParam(anchorParam, targetParam, lineGroup);
    }
    svg.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', stop);
  }
  svg.addEventListener('mousemove', move);
  window.addEventListener('mouseup', stop);
}