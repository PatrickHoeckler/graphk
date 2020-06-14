"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
// - Ver talvez um jeito melhor de escolher as cores para desenhar os gráficos
//

module.exports = {ChartPanel};

const {defaultCallParent} = require('../../auxiliar/auxiliar.js');
const {Panel} = require('../../PanelManager/panel.js');
const {Chart} = require('./chart.js');
const strokeColor = [
  //Color Code | Color name
  "#1e90ff",  //DodgerBlue
  "#ffa500",  //Orange
  "#663399",  //RebeccaPurple
  "#ffd700",  //Gold
  "#a52a2a",  //Brown
  "#7cfc00",  //LawnGreen
  "#da70d6",  //Orchid
  "#d2691e",  //Chocolate
  "#ff1493"   //DeepPink
];

function ChartPanel(modeObj) {
  if (modeObj === null || typeof(modeObj) !== 'object') {throw new Error(
    'Cannot create object without a reference to a Mode() object to hold ' +
    'the mode of operation of this object'
  );}
  //Constants
  const mode = modeObj;
  const charts = []; //array of Chart
  const selectedElems = [];
  
  //Private Properties
  var toolbar, pContents;
  var toolbarLevel;
  var nextColor = 0;
  var mouseOverElem;
  var callParent = defaultCallParent;

  //Public Methods
  this.onCallParent = function (executor = defaultCallParent) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  this.chartCount = () => charts.length;
  this.setBrush = (enable) => charts.forEach(c => c.setBrush(enable));
  this.addChart = addChart;
  this.clearChart = clearChart;
  this.removeChart = removeChart;
  this.resize = () => charts.forEach(c => c.reScale());

  //Private Functions
  function addChart(height = 250) {
    if (typeof(height) !== 'number') {height = 250;}
    else if (height < 100) {height = 100;}
    else if (height > 500) {height = 500;}
    let newChart = new Chart(charts.length);
    pContents.appendChild(newChart.node());
    charts.push(newChart);
    if (toolbarLevel === 0) {updateToolbarButtons(1);}
  }
  function clearChart(chartElem) {
    let chart = charts[findChartIndex(chartElem)];
    if (!chart) {return false;}
    chart.clear();
    return true;
  }
  function removeChart(chartElem) {
    let index = findChartIndex(chartElem);
    if (index === null) {return;}
    chartElem = charts[index].node();
    charts[index].remove(); //remove all elements of the chart from document
    charts.splice(index, 1); //remove Chart from array
    //reindexes all remaining charts, to avoid addition of chart with same index
    //NOTE: the index is used to reference the clipPath element inside the chart
    for (let i = 0; i < charts.length; i++) charts[i].reindex(i);

    //removes chartElem from selectedElems if present, also update toolbar
    index = selectedElems.indexOf(chartElem);
    if (index !== -1) {selectedElems.splice(index, 1);}
    if (selectedElems.length === 0) {
      updateToolbarButtons(pContents.children.length ? 1 : 0);
    }
  }
  function findChartIndex(chartElem) {
    try {
      for (let i = 0; i < charts.length; i++) {
        if (charts[i].node().contains(chartElem)) {return i;}
      }
    } catch (err) {return null;}
    return null;
  }
  function getContainingChart(chartElem) {
    for (let curElem = chartElem;; curElem = curElem.parentElement) {
      if (!curElem || curElem === pContents) {return null;}
      if (curElem.classList.contains('chart-body')) {return curElem;}
    }
  }
  function getDataFromBrush (brush) {
    //finds the chart which contains the brush targeted
    let targetChart = null;
    for (let i = 0; i < charts.length; i++) {
      if (charts[i].node().contains(brush)) {
        targetChart = charts[i];
        break;
      }
    }
    if (!targetChart) {return null;}
    
    //clears all brushes except the targeted one
    charts.forEach(c => {if (c !== targetChart) {c.clearBrush(false)}});
    //gets targeted brush data, sends a warning if data returned is incomplete
    let brushData = targetChart.getDataFromBrush();
    if (brushData && brushData.length > 1) {return brushData;}
    if (brushData === null) {
      targetChart.brushAlert('Só é possível fazer a seleçao quando existe apenas uma curva plotada');
    }
    else if (brushData.length === 1) {
      targetChart.brushAlert('Seleção não capturou pelo menos 2 pontos');
    }
    return null;
  }
  function executeToolbarAction(buttonId, targetElems) { return function execute() 
  {
    if (buttonId === 0) {addChart();}
    else if (buttonId === 1) {
      let enable = !toolbar.children[buttonId].classList.contains('pressed');
      toolbar.children[buttonId].classList.toggle('pressed');
      charts.forEach(c => c.setBrush(enable));
    }
    else if (buttonId === 2) {
      for (let target of targetElems) {clearChart(target);}
    }
    else if (buttonId === 3) {
      while (targetElems.length) {removeChart(targetElems.pop());}
    }
    window.removeEventListener('mouseup', execute);
  }}
  function updateSelectedElems(elem, addToSelection) {
    if (addToSelection && selectedElems.length) {
      if (!elem) {return;} //ignores clicks outside any chart
      if (selectedElems.includes(elem)) {return;}
      elem.classList.add('selected');
      selectedElems.push(elem);
    }
    else {
      //If clicked outside any chart
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
    updateToolbarButtons(pContents.children.length ? 1 : 0);
  }
  function updateToolbarButtons(level) {
    if (level === 0) {
      //Disables the select, clear and remove buttons (from when there's no chart)
      for (let i of [1, 2, 3]) {toolbar.children[i].classList.add('inactive');}
    }
    else if (level === 1) {
      //Enable select button, but disables clear and remove buttons (when there's no selection)
      toolbar.children[1].classList.remove('inactive');
      toolbar.children[2].classList.add('inactive');
      toolbar.children[3].classList.add('inactive');
    }
    else if (level === 2) { //Enables select, clear and remove buttons
      for (let i of [1, 2, 3]) {toolbar.children[i].classList.remove('inactive');}
    }
    else {return;}
    toolbarLevel = level;
  }

  //Initialize object
  (function() {
    //Inheriting from Panel Object
    Panel.call(this, 'Gráficos', [
      {className: 'icon-plus', tooltip: 'New Chart'},
      {className: 'icon-square-corners', tooltip: 'Select Region'},
      {className: 'icon-diameter', tooltip: 'Clear Chart'},
      {className: 'icon-x'   , tooltip: 'Remove Chart'},
    ]);
    toolbar = this.node().getElementsByClassName('panel-toolbar')[0];
    pContents = this.node().getElementsByClassName('panel-body')[0];
    pContents.classList.add('chart-panel');
    updateToolbarButtons(0);
    this.addChart();

    //Adding event handlers
    pContents.addEventListener('drop', (e) => {
      e.preventDefault();
      let chart = charts[findChartIndex(e.target)];
      if (!chart) {return;}
      if (e.ctrlKey) {chart.clear();}
      let {type, value} = JSON.parse(e.dataTransfer.getData('text'));
      chart.plot(value, strokeColor[nextColor], type);
      nextColor = (nextColor + 1) % strokeColor.length;
    });
    pContents.addEventListener('dragover', (e) => {
      if (!mouseOverElem) {
        if (!(mouseOverElem = getContainingChart(e.target))) {return;}
        mouseOverElem.classList.add('highlight');
      }
      e.preventDefault();
    });
    pContents.addEventListener('dragleave', (e) => {
      if (!mouseOverElem) {return;}
      mouseOverElem.classList.remove('highlight');
      mouseOverElem = null;
    });
    pContents.addEventListener('mouseover', (e) => {
      if (!(mouseOverElem = getContainingChart(e.target))) {return;}
      mouseOverElem.classList.add('highlight');
    });
    pContents.addEventListener('mouseout', (e) => {
      if (!mouseOverElem) {return;}
      mouseOverElem.classList.remove('highlight');
      mouseOverElem = null;
    });
    pContents.addEventListener('click', ({target, ctrlKey}) => {
      if (!mode.is(mode.NORMAL)) {return;}
      updateSelectedElems(getContainingChart(target), ctrlKey);
    });
    pContents.addEventListener('dblclick', (e) => {
      if (!mode.is(mode.DELETE)) {return;}
      removeChart(e.target); //removes chart that contains the target of the event
    });
    pContents.addEventListener('contextmenu', ({target, x, y}) => {
      if (target === pContents) {return};
      let isBrush = target.classList.contains('selection');
      callParent('context', {x, y, contextItems: [
        {name: 'Select Region', return: 'select',
         type: isBrush ? undefined : 'inactive'},
        {name: 'Save Image', return: 'capture'},
        {type: 'separator'},
        {name: 'Remove', return: 'remove'},
        {name: 'Clear', return: 'clear'}
      ]}).then((item) => {
        if (!item) {return;}
        if (item === 'select') {
          let value = getDataFromBrush(target);
          if (value) {callParent('add-data', {data: {
            name: 'Selection', value
          }});}
        }
        else if (item === 'capture') {
          target = getContainingChart(target).children[0];
          callParent(item, {target});}
        else if (item === 'remove') {removeChart(target);}
        else if (item === 'clear') {clearChart(target);}
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
ChartPanel.prototype = Object.create(Panel.prototype);
Object.defineProperty(ChartPanel.prototype, 'constructor', { 
  value: ChartPanel, enumerable: false, writable: true
});