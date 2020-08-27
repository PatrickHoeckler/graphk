"use strict";

module.exports = {Routine};

const {RoutineStep} = require('./routineStep.js');

//This object is used to store a routine, calculate its value given an input,
//and transform it to a JSON string that can be later transformed back to a
//Routine object.
//This object is not meant for displaying the routine, the RoutineMaker object
//is in charge of that.
function Routine() {
  //Constants
  const steps = [];

  //Public Attributes
  this.name;
  this.steps;
  //Private Properties
  var name;
  //Public Methods
  //Private Functions

  //Initialize Object
  ;(function(){
    name = '';
    Object.defineProperties(this, {
      name: {
        get() {return name;},
        set(value) {if (typeof value === 'string') {name = value;}},
        enumerable: true
      },
      steps: {value: steps, enumerable: true}
    })
  }).call(this);
}

Routine.prototype = {
  constructor: Routine,
  clone: function() {
    const clone = new Routine();
    clone.name = this.name;
    for (let step of this.steps) {
      clone.addStep(step.format, step.pos[0], step.pos[1]);
    }
    for (let i = 0, nSteps = this.steps.length; i < nSteps; i++) {
      const step = this.steps[i];
      const cstep = clone.steps[i];
      for (let j = 0, nParams = step.parameters.length; j < nParams; j++) {
        const paramBase = step.parameters[j]; 
        const cparamBase = cstep.parameters[j];
        if (paramBase.connection) { //input parameter with a connection
          let stepId = this.steps.indexOf(paramBase.connection.step);
          let paramId = paramBase.connection.step.parameters
            .indexOf(paramBase.connection.paramBase);
          let cnctStep = clone.steps[stepId];
          let cnctParam = cnctStep.parameters[paramId];
          cparamBase.connection = {step: cnctStep, paramBase: cnctParam};
        }
        cparamBase.value = paramBase.value;
      }
    }
    return clone;
  },
  checkValidity: function() {
    const outStep = this.steps[0];
    const stack = [];
    const stepsUsed = [];
    const error = (function checkStepValidity(step) {
      stack.push(step);
      if (!stepsUsed.includes(step)) {stepsUsed.push(step);}
      for (let i = 0, n = step.parameters.length; i < n; i++) {
        const paramBase = step.parameters[i];
        if (paramBase.direction === 0) {continue;}
        if (!paramBase.connection) {
          if (paramBase.value !== null || paramBase.format.optional) {continue;}
          return {step, paramBase, type: 'value'};
        }
        else {
          if (stack.includes(paramBase.connection.step)) {
            return {step, paramBase, type: 'cycle'};
          }
          let error = checkStepValidity(paramBase.connection.step);
          if (error) {return error;}
        }
      }
      stack.pop();
    })(outStep);
    return {error, stepsUsed};
  },
  addStep: function(format, x, y) {
    const step = new RoutineStep(format, x, y);
    this.steps.push(step);
    return step;
  },
  removeStep: function(step) {
    let id = this.steps.indexOf(step);
    if (id === -1) {return;}
    this.steps.splice(id, 1);
    for (let rStep of this.steps) {
      for (let paramBase of rStep.parameters) {
        if (paramBase.connection && paramBase.connection.step === step) {
          paramBase.connection = null;
        }
      }
    }
  },
  toString: function() {
    const routine = {name: this.name, steps: []};
    for (let step of this.steps) {
      const stepObj = {params: []};
      for (let paramBase of step.parameters) {
        let paramObj = null;
        if (paramBase.connection) { //input parameter with a connection
          let stepId = this.steps.indexOf(paramBase.connection.step);
          let paramId = paramBase.connection.step.parameters
            .indexOf(paramBase.connection.paramBase);
          paramObj = {stepId, paramId};
        }
        else if (paramBase.value) {paramObj = {value: paramBase.value};}
        stepObj.params.push(paramObj);
      }
      if (!step.format.hash && step.format.pkg) {
        stepObj.hash = step.format.pkg.hash;
        stepObj.pkgId = step.format.pkg.value.findIndex(
          tf => tf.func === step.format.func
        );
      }
      else {stepObj.hash = step.format.hash;}
      stepObj.x = step.pos[0]; stepObj.y = step.pos[1];
      routine.steps.push(stepObj);
    }
    return JSON.stringify(routine, null, '\t');
  },
  createBase: function(ox = 600, oy = 0, ix = 0, iy = 0) {
    //Will add the steps in a order as such to always make the indexes:
    //  0  : output
    //  1  : input
    //  2+ : normal steps
    this.steps.length = 0;
    this.steps.push(new RoutineStep('output', ox, oy));
    this.steps.push(new RoutineStep('input' , ix, iy));
  },
  calculate: function(inputData) {
    const outStep = this.steps[0];
    const inStep = this.steps[1];
    inStep.parameters[0].value = inputData;
    outStep.calculateStep();
    let value = outStep.getOutput();
    inStep.parameters[0].value = null;
    this.steps.forEach(step => step.clearCalculation());
    return value;
  }
}
Routine.loadString = function(string, dictionary) {
  if (typeof string !== 'string') {throw new TypeError(
    `Expected a string for the 'string' object. Got ${typeof string}`
  );}
  const strRoutine = JSON.parse(string);
  const strSteps = strRoutine.steps;
  if (!Array.isArray(strSteps)) {return 'invalid';}
  const nSteps = strSteps.length;
  for (let i = 0; i < nSteps; i++) {
    if (strSteps[i].hash && !dictionary[strSteps[i].hash]) {return 'hash';}
  }

  const routine = new Routine();
  routine.name = strRoutine.name;
  routine.createBase(strSteps[0].x, strSteps[0].y, strSteps[1].x, strSteps[1].y);
  for (let i = 2; i < nSteps; i++) {
    let format;
    if (strSteps[i].pkgId) {
      let pkg = dictionary[strSteps[i].hash];
      format = pkg.value[strSteps[i].pkgId];
    }
    else {format = dictionary[strSteps[i].hash]}
    routine.addStep(format, strSteps[i].x, strSteps[i].y);
  }
  for (let i = 0; i < nSteps; i++) {
    const step = routine.steps[i];
    const nParams = strSteps[i].params.length;
    for (let j = 0; j < nParams; j++) {
      let param = strSteps[i].params[j];
      if (!param) {continue;}
      if (param.value !== undefined) {step.setParamValue(j, param.value);}
      else if (param.stepId !== undefined && param.paramId !== undefined) {
        let cnctStep = routine.steps[param.stepId];
        let cnctParam = cnctStep.parameters[param.paramId];
        step.parameters[j].connection = {step: cnctStep, paramBase: cnctParam};
      }
    }
  }
  return routine;
}
Routine.getErrorMsg = function(error) {
  const placeMsg = error.step.format.name ?
    `parameter '${error.paramBase.format.name}' in step '${error.step.format.name}'` :
    `'${error.paramBase.format.name}' step`;
  if (error.type === 'value') {return `Missing value for ${placeMsg}`;}
  else if (error.type === 'cycle') {return `Cycled connection in ${placeMsg}`;}
}