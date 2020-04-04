"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
// - Ver talvez um jeito melhor de escolher as cores para desenhar os gráficos
//

graphK.ChartArea = function() {
  //Constants
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
    "#ff1493"  //DeepPink
  ];

  //Private Properties
  var node;
  var mode; //current mode of operation being used
  var charts; //array of graphK.chart
  var nextColor = 0;
  var contextCallback;
  var mouseOverElem;

  //Public Methods
  this.node = () => node;
  this.chartCount = () => charts.length;
  this.onContext = (callback) => contextCallback = callback;
  this.setBrush = (enable) => charts.forEach(c => c.setBrush(enable));
  this.addChart = function(height = 250) {
    if (typeof(height) !== 'number') height = 250;
    let newChart = new graphK.Chart(charts.length);
    node.appendChild(newChart.node());
    charts.push(newChart);
  }
  this.clearChart = function(chartElem) {
    let chart = charts[findChartIndex(chartElem)];
    if (!chart) {return false;}
    chart.clear();
    return true;
  }
  this.removeChart = removeChart;
  this.resize = function() {
    for (let i = 0; i < charts.length; i++) {
      charts[i].reScale();
    }
  }
  this.getDataFromBrush = (brush) => {
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
  this.getMode = () => mode;
  this.setMode = function(newMode) {
    if (newMode === mode) {return true;}
    if (!this.canSetMode(newMode)) {return false;}
    mode = newMode;
    return true;
  }
  this.canSetMode = (newMode) => newMode === graphK.mode.NORMAL || mode === graphK.mode.NORMAL;

  //Private Functions
  function removeChart(chartElem) {
    let index = findChartIndex(chartElem);
    if (index === null) {return;}
    charts[index].remove(); //remove all elements of the chart from document
    charts.splice(index, 1); //remove graphK.chart from array
    //reindexes all remaining charts, to avoid addition of chart with same index
    //NOTE: the index is used to reference the clipPath element inside the chart
    for (let i = 0; i < charts.length; i++) charts[i].reindex(i);
  }
  function getContainingChart(chartElem) {
    for (let curElem = chartElem;; curElem = curElem.parentElement) {
      if (!curElem || curElem === node) {return null;}
      if (curElem.classList.contains('chart-body')) {return curElem;}
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
  
  //Initialize object
  charts = [];
  mode = graphK.mode.NORMAL;
  node = graphK.appendNewElement(null, 'div', 'chart-area');
  this.addChart();

  //  adding event handlers
  node.addEventListener('drop', (e) => {
    e.preventDefault();
    let chart = charts[findChartIndex(e.target)];
    if (!chart) {return;}
    if (e.ctrlKey) {chart.clear();}
    let {type, value} = JSON.parse(e.dataTransfer.getData('text'));
    chart.plot(value, strokeColor[nextColor], type);
    nextColor = (nextColor + 1) % strokeColor.length;
  })
  node.addEventListener('dragover', (e) => {
    if (!mouseOverElem) {
      if (!(mouseOverElem = getContainingChart(e.target))) {return;}
      mouseOverElem.classList.add('highlight');
    }
    e.preventDefault();
  })
  node.addEventListener('dragleave', (e) => {
    if (!mouseOverElem) {return;}
    mouseOverElem.classList.remove('highlight');
    mouseOverElem = null;
  })
  node.addEventListener('mouseover', (e) => {
    if (!(mouseOverElem = getContainingChart(e.target))) {return;}
    mouseOverElem.classList.add('highlight');
  })
  node.addEventListener('mouseout', (e) => {
    if (!mouseOverElem) {return;}
    mouseOverElem.classList.remove('highlight');
    mouseOverElem = null;
  })
  node.addEventListener('dblclick', (e) => {
    if (mode !== graphK.mode.DELETE) {return;}
    removeChart(e.target); //removes chart that contains the target of the event
  })
  node.addEventListener('contextmenu', (e) => {
    if (!contextCallback || e.target === node) {return};
    let detail = e.target.classList.contains('selection') ? 'brush' : undefined;
    contextCallback(e, 'chart', detail);
  })


  this._charts = charts;
}