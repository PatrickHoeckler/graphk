"use strict";

module.exports = {RoutineStep};

//This object is used to store a routine step and its connections with other
//steps. It can also use this connections to calculate the step output using
//the connections (or a defined value) for inputs.
//This object is not meant for displaying the routine step, the RoutineMaker
//object uses the stepMaker object to handle this task. However, since this
//is intended to be converted to a string and reinterpreted as a RoutineStep
//at a later date, this object also will hold the x and y position of the
//step element created in the StepMaker object. This way the StepMaker can
//recreate the routineStep as it was when it was saved.
function RoutineStep(stepFormat, x = 0, y = 0) {
  //Constants
  const format = stepFormat;
  const parameters = [];
  const pos = [];
  //Public Attributes
  this.parameters;
  this.format;
  this.pos;
  //Private Properties
  var calculated;
  //Public Methods
  this.calculateStep = function() {
    if (calculated) {return;}
    calculated = true;
    if (typeof format === 'string') {
      if (format === 'output') {
        if (parameters[0].connection) {
          if (!parameters[0].connection.paramBase.value) {
            parameters[0].connection.step.calculateStep();
          }
          parameters[0].value = parameters[0].connection.paramBase.value;
        }
        else {parameters[0].value = null;}
      }
      return;
    }

    let args = {};
    let value, keyname;
    for (let i = 0, n = parameters.length; i < n; i++) {
      if (parameters[i].direction !== 1) {break;}
      keyname = parameters[i].format.keyname ?
        parameters[i].format.keyname : parameters[i].format.name;
      if (parameters[i].value !== null) {value = parameters[i].value;}
      else if (parameters[i].connection) {
        if (!parameters[i].connection.paramBase.value) {
          parameters[i].connection.step.calculateStep();
        }
        value = parameters[i].connection.paramBase.value;
      }
      else {continue;}
      if (value === null) {continue;}
      args[keyname] = value;
    }

    value = format.func(args);
    //TODO: future support
    //This if is here for the same reason behind the future support described
    //in the Initialize Object section of this document.
    if (false && format.outputs) {
      for (let i = parameters.length - 1; i >= 0; i--) {
        if (parameters[i].direction !== 0) {break;}
        keyname = parameters[i].format.keyname ?
          parameters[i].format.keyname : parameters[i].format.name;
        parameters[i].value = value[keyname];
      }
    }
    else {parameters[parameters.length - 1].value = value;}
  }
  this.clearCalculation = function() {
    if (!calculated) {return;}
    calculated = false;
    if (format === 'output') {parameters[0].value = null; return;}
    for (let i = parameters.length - 1; i >= 0; i--) {
      if (parameters[i].direction !== 0) {break;}
      parameters[i].value = null;
    }
  }
  //Private Functions

  //Initialize Object
  ;(function () {
    if (typeof stepFormat === 'string' &&
      stepFormat !== 'input' && stepFormat !== 'output'
    ) {throw new TypeError(`Invalid string given to 'stepFormat' argument`);}
    if (typeof x !== 'number' || typeof y !== 'number') {throw new TypeError(
      `Expected number type for 'x' and 'y' arguments`
    );}
    calculated = false;
    pos[0] = x; pos[1] = y;
    if (typeof format === 'string') {
      parameters.push(format === 'input' ? 
        {format: {name: 'Input' , type: 'data'}, direction: 0, value: null} : 
        {format: {name: 'Output', type: 'data'}, direction: 1, value: null});
    }
    else {
      if (format.type !== 'no-plot') {
        parameters.push({
          format: {name: 'Data', type: 'data', keyname: 'data'},
          direction: 1, value: null
        });
      }
      if (format.args) {
        for (let i = 0, n = format.args.length; i < n; i++) {
          let paramBase = {format: format.args[i], direction: 1};
          paramBase.value = resolveStartValue(paramBase.format);
          parameters.push(paramBase);
        }
      }
      //TODO: future support
      //This if does nothing at the moment given that the current supported
      //format does not include an 'outputs' key. But I put it here because in
      //future updates it would be good to have a step with multiple outputs.
      //So this would handle the correct push to the parameters array, and help
      //me remember what is the overral logic of handling a new 'outputs' key.
      //But still there's probably other parts in this object or the stepMaker
      //object that can't handle a key like this properly. So for the moment
      //this if should never enter in effect.
      if (false && format.outputs) {
        for (let i = 0, n = format.outputs.length; i < n; i++) {
          parameters.push({format: format.outputs[i], direction: 0});
        }
      }
      parameters.push({
        format: {name: 'Output', type: 'data'}, direction: 0, value: null
      });
    }

    Object.defineProperties(this, {
      parameters: {value: parameters, writable: false, enumerable: true},
      format: {value: format, writable: false, enumerable: true},
      pos: {value: pos, writable: false, enumerable: true},
    });
  }).call(this);
}

RoutineStep.prototype = {
  constructor: RoutineStep,
  setParamValue: function(index, value) {
    const paramBase = this.parameters[index];
    const pf = paramBase.format;
    if (pf.type === 'number') {
      if (typeof value !== 'number' || 
        pf.max < value || value < pf.min
      ) {return false;}
      paramBase.value = value;
      return true;
    }
    else if (pf.type === 'select') {
      if (!pf.option.some(({name}) => name === value)) {return false;}
      paramBase.value = value;
      return true;
    }
    return false;
  },
  getOutput: function() {
    if (typeof this.format === 'string') {
      return this.parameters[0].value;
    }
    //TODO: future support
    //This if is here for the same reason behind the future support described
    //in the Initialize Object section of this document.
    if (false && this.format.outputs) {
      let value = {};
      for (let i = this.parameters.length - 1; i >= 0; i--) {
        if (this.parameters[i].direction !== 0) {break;}
        let keyname = this.parameters[i].format.keyname ?
          this.parameters[i].format.keyname : this.parameters[i].format.name;
        value[keyname] = this.parameters[i].value;
      }
    }
    else {return this.parameters[this.parameters.length - 1].value;}
  }
}

function resolveStartValue(paramFormat) {
  if (paramFormat.type === 'number') {
    return paramFormat.value ? paramFormat.value : 
      paramFormat.optional ? null :
      paramFormat.min ? paramFormat.min :
      paramFormat.max ? paramFormat.max : 0;
  }
  else if (paramFormat.type === 'select') {
    return paramFormat.value ? paramFormat.value : paramFormat.option[0].name;
  }
  return null;
}