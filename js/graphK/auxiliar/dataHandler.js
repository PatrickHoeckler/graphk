'use strict';

module.exports = {DataHandler};

function logSearchIndex(data, xValue) {
  let index;
  let begin = 0;
  let end = data.length - 1;
  while (begin < end) {
    index = Math.ceil((end + begin) / 2);
    if (data[index][0] <= xValue) {begin = index;}
    else {end = index - 1;}
  }
  return begin;
}

function createHierarchy(data) {
  //Create first level of hierarchy, this level will have
  //all the points from the original data
  const dataHierarchy = [];
  dataHierarchy.push(data);
  if (data.length < DataHandler.MAX_ELEMENTS) {return dataHierarchy;}

  //Create all other levels of hierarchy, until the last level has
  //less elements than the MAX_ELEMENTS value.
  let reduceScale = DataHandler.WINDOW_SIZE;
  data = reduceData(data, reduceScale);
  dataHierarchy.push(data);
  //Divide scale by 2 because the next levels of the hierarchy will hold two
  //y points (ymin and ymax) for each x point
  reduceScale /= 2;
  while (DataHandler.MAX_ELEMENTS < data.length * 2) {
    data = reduceData(data, reduceScale);
    dataHierarchy.push(data);
  }
  return dataHierarchy;
}
function reduceData(data, reduceScale) {
  let reduced = [];
  let ymin, ymax, i = 0;
  const ymaxIndex = data[0][2] === undefined ? 1 : 2;
  for (let n = data.length - reduceScale; i < n; i += reduceScale) {
    ymin = data[i][1];
    ymax = data[i][ymaxIndex];
    for (let j = 1; j < reduceScale; j++) {
      ymin = Math.min(ymin, data[i + j][1]);
      ymax = Math.max(ymax, data[i + j][ymaxIndex]);
    }
    reduced.push([data[i][0], ymin, ymax]); //[x, ymin, ymax]
  }
  i = (data.length - 1) - (data.length - 1) % reduceScale;
  ymin = data[i][1];
  ymax = data[i][ymaxIndex];
  for (i++; i < data.length; i++) {
    ymin = Math.min(ymin, data[i][1]);
    ymax = Math.max(ymax, data[i][ymaxIndex]);
  }
  reduced.push([data[data.length - 1][0], ymin, ymax]); //[x, ymin, ymax]
  return reduced;
}

function DataHandler(data) {
  //Public Attributes
  Object.defineProperties(this, {
    value: {
      get: () => value,
      set() {return;}
    },
    isHierarchy: {get: () => isHierarchy,  set() {return;}}
  });
  //Private Properties
  var value, isHierarchy;
  //Public Methods
  Object.defineProperties(this, {
    setData: {value: function(data) {
      if (data.isHierarchy) {
        value = data.value;
        isHierarchy = true;
      }
      else if (
        Array.isArray(data.value) &&
        data.value.length > DataHandler.MAX_ELEMENTS
      ) {
        value = createHierarchy(data.value); isHierarchy = true
      }
      else {value = data.value; isHierarchy = false;}
      for (let key in data) {this[key] = data[key];}
    }}
  });
  //Private Functions
  
  //Initialize Object
  ;(function() {
    this.setData(data);
  }).call(this);
}


DataHandler.setParameters = function(windowSize, maxElements) {
  Object.defineProperties(DataHandler, {
    WINDOW_SIZE: {value: windowSize, configurable: true},
    MAX_ELEMENTS: {value: maxElements, configurable: true}
  })
}
DataHandler.setParameters(12, 8000);


Object.defineProperties(DataHandler.prototype, {
  constructor: {value: DataHandler, enumerable: false},
  getRange: {enumerable: false, value: function(x0, x1) {
    let data = this.isHierarchy ? this.value[0] : this.value;
    let lastX = data[data.length - 1][0];
    if (x0 < data[0][0]) {x0 = data[0][0];}
    if (x1 > lastX) {x1 = lastX;}
    
    //We must add +2 to the end value because the logSearchIndex returns a
    //rounded down value, so to not lose any points we add the +2, we may get
    //one or two extra points, but that's okay, at least we aren't missing
    //anything
    let start = logSearchIndex(data, x0);
    let end   = logSearchIndex(data, x1) + 2;
    if (this.isHierarchy && DataHandler.MAX_ELEMENTS < end - start) {
      for (let i = 1, n = this.value.length; i < n; i++) {
        data = this.value[i];
        start = logSearchIndex(data, x0);
        end   = logSearchIndex(data, x1) + 2;
        if (2 * (end - start) <= DataHandler.MAX_ELEMENTS) {break;}
      }
    }
    return data.slice(start, end);
  }},
  getRangeAtLevel: {enumerable: false, value: function (x0, x1, level) {
    if (!this.isHierarchy || !this.value[level]) {return null;}
    let data = this.value[level];
    let lastX = data[data.length - 1][0];
    if (x0 < data[0][0]) {x0 = data[0][0];}
    if (x1 > lastX) {x1 = lastX;}
    const start = logSearchIndex(data, x0);
    const end   = logSearchIndex(data, x1) + 2;
    return data.slice(start, end)
  }},
  getLevel: {enumerable: false, value: function (level) {
    return this.isHierarchy ? this.value[level] : null;
  }},
  getLastLevel: {enumerable: false, value: function () {
    return this.isHierarchy ? this.value[this.value.length - 1] : null;
  }}
});