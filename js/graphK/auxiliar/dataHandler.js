'use strict';

module.exports = {DataHandler};

function createHierarchy(data) {
  //Create first level of hierarchy, this level will have
  //all the points from the original data
  const dataHierarchy = [];
  dataHierarchy.push({data, dx: data[1][0] - data[0][0]});
  if (data.length < DataHandler.MAX_ELEMENTS) {return dataHierarchy;}

  //Create all other levels of hierarchy, until the last level has
  //less elements than the MAX_ELEMENTS value.
  let reduceScale = DataHandler.WINDOW_SIZE;
  data = reduceData(data, reduceScale);
  dataHierarchy.push({data, dx: data[1][0] - data[0][0]});
  //Divide scale by 2 because the next levels of the hierarchy will hold two
  //y points (ymin and ymax) for each x point
  reduceScale /= 2;
  while (DataHandler.MAX_ELEMENTS < data.length * 2) {
    data = reduceData(data, reduceScale);
    dataHierarchy.push({data, dx: data[1][0] - data[0][0]});
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
DataHandler.sample = [
  [0.0, 5], [0.1, 2], [0.2, 4], [0.3, 8],
  [0.4, 1], [0.5, 2], [0.6, 3], [0.7, 7],
  [0.8, 2], [0.9, 0], [1.0, 9], [1.1, 1],
  [1.2, 5], [1.3, 2], [1.4, 8], [1.5, 1],
  [1.6, 3], [1.7, 9], [1.8, 7], [1.9, 4],
  [2.0, 2], [2.1, 1], [2.2, 5], [2.3, 6],
  [2.4, 1], [2.5, 0], [2.6, 6], [2.7, 8],
  [2.8, 4], [2.9, 5], [3.0, 3], [3.1, 7]
];

Object.defineProperties(DataHandler.prototype, {
  constructor: {value: DataHandler, enumerable: false},
  getRange: {enumerable: false, value: function(x0, x1) {
    if (!this.isHierarchy) {return null;}
    //interval in a given level contains the following number of points:
    //  nPoints = (2 + Math.floor(interval / dataLevel.dx)) * 
    //    (level === 0 ? 1 : 2)
    //if nPoints < DataHandler.MAX_ELEMENTS, then the level can represent
    //the range
    const interval = x1 - x0;
    //Check if top level can represent data
    let dataLevel = this.value[0];
    let nPoints = 2 + Math.floor(interval / dataLevel.dx);
    if (DataHandler.MAX_ELEMENTS < nPoints) {
      for (let i = 1, n = this.value.length; i < n; i++) {
        dataLevel = this.value[i];
        nPoints = 4 + 2 * Math.floor(interval / dataLevel.dx);
        if (nPoints <= DataHandler.MAX_ELEMENTS) {break;}
      }
    }
    const start = Math.max(Math.floor((x0 - dataLevel.data[0][0]) / dataLevel.dx), 0);
    const end = 1 + Math.min(
      Math.ceil((x1 - dataLevel.data[0][0]) / dataLevel.dx), dataLevel.data.length
    );
    return dataLevel.data.slice(start, end)
  }},
  getRangeAtLevel: {enumerable: false, value: function (x0, x1, level) {
    let dataLevel;
    if (!this.isHierarchy || !(dataLevel = this.value[level])) {return null;}
    const start = Math.max(Math.floor((x0 - dataLevel.data[0][0]) / dataLevel.dx), 0);
    const end = 1 + Math.min(
      Math.ceil((x1 - dataLevel.data[0][0]) / dataLevel.dx), dataLevel.data.length
    );
    return dataLevel.data.slice(start, end)
  }},
  getLevel: {enumerable: false, value: function (level) {
    return this.isHierarchy ? this.value[level] : null;
  }},
  getLastLevel: {enumerable: false, value: function () {
    return this.isHierarchy ? this.value[this.value.length - 1] : null;
  }}
});