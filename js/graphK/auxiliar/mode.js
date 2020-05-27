'use strict';

function Mode(startMode) {
  //Public Methods
  this.value = () => mode;
  this.is = (value) => mode === value;
  this.lock = () => locked = true;
  this.unlock = () => locked = false;
  this.change = function (newMode) {
    if (!check(newMode)) {return false};
    changeCallbacks.forEach(callback => callback(newMode));
    mode = newMode;
    return true;
  }
  this.check = check;
  this.addChangeListener = (callback) => changeCallbacks.push(callback);
  this.addCheckListener  = (callback) => checkCallbacks.push(callback);
  this.removeChangeListener = (callback) => {
    let index = changeCallbacks.indexOf(callback);
    if (index !== -1) {changeCallbacks.splice(index, 1);}
  }
  this.removeCheckListener = (callback) => {
    let index = checkCallbacks.indexOf(callback);
    if (index !== -1) {checkCallbacks.splice(index, 1);}
  }

  //Private Functions
  function check(newMode) {
    if (locked) {return false;}
    return mode === newMode || checkCallbacks.every(check => check(newMode));
  }

  //Private properties
  var mode, locked;
  var checkCallbacks, changeCallbacks;

  //Initialize Object
  mode = startMode;
  locked = false;
  checkCallbacks = [];
  changeCallbacks = [];
}

Mode.prototype.NORMAL = 0;
Mode.prototype.SELECT = 1;
Mode.prototype.RENAME = 2;
Mode.prototype.DELETE = 3;
Mode.prototype.BRUSH  = 4;
Mode.prototype.DRAG   = 5;
Mode.prototype.isMode = function(mode) {
  if (typeof(mode) !== 'number' || !Number.isInteger(mode)) {return false;}
  return Mode.prototype.NORMAL <= mode && mode <= Mode.prototype.DRAG;
}

module.exports = {Mode};
