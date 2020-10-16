"use strict";

module.exports = {Chart};

const {appendNewElement, defaultCallParent} = require('../../auxiliar/auxiliar.js');
const d3 = require('d3');
const {DataHandler} = require('../../auxiliar/dataHandler.js');
function Chart(id = 0, height = 150) {
  //Constants
  const margin = {top: 10, right: 10, bottom: 20, left: 40};
  //  HTMLelements and d3 selections
  const node = appendNewElement(null, 'div', 'chart-container');
  const svg = d3.create('svg:svg');
  const gPlot  = svg.append('svg:g').append('svg:g');
  const gxAxis = svg.append('svg:g');
  const gyAxis = svg.append('svg:g');
  const gBrush = svg.append('svg:g');
  const clipRect = svg.append('svg:defs')
    .append("svg:clipPath").append('svg:rect');

  //  D3 axis and scales
  const xScaleData = d3.scaleLinear();
  const xScaleZoom = d3.scaleLinear();
  const yScaleData = d3.scaleLinear();
  const yScaleZoom = d3.scaleLinear();
  const xAxis = d3.axisBottom();
  const yAxis = d3.axisLeft();
  //  Drawing variables
  const plotArray = [];
  const line = d3.line();
  const area = d3.area();
  const brushX = d3.brushX();
  const zoomX  = d3.zoom();
  const zoomY  = d3.zoom();


  //Private Properties
  var isEmpty;
  var callParent = defaultCallParent;

  //Public Methods
  this.onCallParent = function(executor = defaultCallParent) {
    if (typeof(executor) !== 'function') { throw new TypeError(
      `Expected a function for the 'executor' argument. Got type ${typeof(executor)}`
    );}
    callParent = executor;
  }
  this.reScale = reScale;
  this.node = () => node;
  this.remove = () => node.remove();
  this.appendTo = (elem) => {
    node.style.visibility = 'hidden';
    elem.appendChild(node);
    reScale();
    node.style.visibility = '';
  }
  this.reindex= (id) => {
    svg.select('clipPath')
        .attr('id', `graphK-clippath-${id}`);
    d3.select(gPlot.node().parentElement)
        .attr('clip-path', `url(#graphK-clippath-${id})`);
  }
  this.setBrush = (enable) => {
    gBrush.selectAll('*').style('cursor', enable ? null : 'unset');
    if (enable) {brushX.filter(() => !isEmpty && !d3.event.button);}
    else {
      gBrush.call(brushX.clear);
      brushX.filter(() => false);
    }
  }
  this.clearBrush = () => gBrush.call(brushX.clear);
  this.brushAlert = (tooltip) => {
    gBrush.select('.selection').classed('warning', true)
      .append('title').html(tooltip);
    brushX.on('start', () => {
      gBrush.select('.selection').classed('warning', false)
        .selectAll('*').remove();
      brushX.on('start', null);
    });
  }
  this.getDataFromBrush = () => {
    const [x0, x1] = d3.brushSelection(gBrush.node()).map(xScaleZoom.invert);
    const out = {interval: [x0, x1], brushed: []};
    for (let {dataHandler} of plotArray) {
      if (dataHandler.type !== 'normal' && dataHandler.type !== 'scatter') {return;}
      const data = !dataHandler.isHierarchy ?
        dataHandler.value : dataHandler.getRangeAtLevel(x0, x1, 0);
      if (!data) {continue;}
      const brushedData = [];
      for (let point of data) {
        if (x0 < point[0] && point[0] < x1) {brushedData.push(point);}
      }
      if (brushedData.length > 1) {out.brushed.push(brushedData);}
    }
    return out;
  }
  this.plot = function(dataHandler, color) {
    let data = dataHandler.value;
    if (typeof data === 'number') {
      if (dataHandler.type === 'x-axis') {data = [[data, null]];}
      else {
        data = [[null, data]];
        dataHandler.type = 'y-axis';
      }
    }
    else if (dataHandler.isHierarchy) {data = dataHandler.getLastLevel().data;}
    if (updateScaleDomain(data)) {
      gxAxis.call(xAxis); gyAxis.call(yAxis);
      replotAll();
    }
    //Creating Plot elements
    const options = {color, size: dataHandler.type === 'scatter' ? 3 : 1};
    var plotSel;
    if (dataHandler.type === 'x-axis' || dataHandler.type === 'y-axis') {
      plotSel = constantPlot(null, data, options);
    }
    else if (dataHandler.type === 'normal') {
      if (dataHandler.isHierarchy) {
        data = dataHandler.getRange(...xScaleZoom.domain());
      }
      plotSel = linePlot(null, data, options);
    }
    else if (dataHandler.type === 'scatter') {
      if (dataHandler.isHierarchy) {data = dataHandler.getLevel(0).data;}
      plotSel = scatterPlot(null, data, options);
    }
    else {throw new Error(
      `'${dataHandler.type}' is not a valid value for the data type`
    );}
    gPlot.append(() => plotSel.node());
    //must copy the dataHandler object because the original can be changed
    //from the outside
    dataHandler = new DataHandler(dataHandler);
    plotArray.push({sel: plotSel, dataHandler, type: dataHandler.type});
    isEmpty = false;
  }
  this.clear = clear;
  this.getChartProperties = function () {
    const pObjs = [];
    pObjs.push({
      name: 'Chart', props: [
        {name: 'Axis Color', type: 'color', value: gxAxis.style('color')},
        {name: 'Background', type: 'color', value: svg.style('background')},
      ],
      onInput: function({name, value}) {
        if (name === 'Background') {svg.style('background', value);}
        else {gxAxis.style('color', value); gyAxis.style('color', value);}
      }
    });
    for (let i = 0, n = plotArray.length; i < n; i++) {
      const plot = plotArray[i];
      const isScatter = plot.type === 'scatter';
      const propObj = {
        name: `Plot ${i + 1}`, onInput: propertyChanged,
        props: [
          {name: 'Type', type: 'select', value: plot.type},
          {
            name: 'Size', type: 'range', min: 0.5, max: 8, step: 0.1,
            value: isScatter ? plot.sel.select('circle').attr('r') :
              plot.sel.attr('stroke-width')
          },
          {
            name: 'Color', type: 'color',
            value: plot.sel.attr(isScatter ? 'fill' : 'stroke'),
          },
          {name: 'Remove', type: 'button'}
        ]
      };
      if (plot.type === 'normal' || plot.type === 'scatter') {
        propObj.props[0].option = ['normal', 'scatter'];        
      }
      else {
        propObj.props[0].option = ['x-axis', 'y-axis'];
        propObj.props.unshift({
          name: 'Value', type: 'number',
          value: plot.sel.datum()[plot.type === 'x-axis' ? 0 : 1]
        });
        propObj.onChange = function({name, value, objId}) {
          const plot = plotArray[objId - 1];
          if (name !== 'Value') {return;}
          value = Number.parseFloat(value);
          let data = plot.type === 'x-axis' ? [[value, null]] : [[null, value]];
          plot.sel.datum(null);
          if (updateScaleDomain() + updateScaleDomain(data)) {
            plot.sel.data(data);
            gxAxis.call(xAxis); gyAxis.call(yAxis); replotAll();
          }
          else {constantPlot(plot.sel, data);}
        }
      }
      pObjs.push(propObj);
    }
    return pObjs;
  }

  //Private Functions
  function clear() {
    plotArray.length = 0;
    updateScaleDomain();
    zoomX.transform(svg, d3.zoomIdentity);
    zoomY.transform(gBrush, d3.zoomIdentity);
    gxAxis.selectAll('*').remove(); gyAxis.selectAll('*').remove();
    gPlot.selectAll('*').remove();
    gPlot.attr('transform', null);
    gBrush.call(brushX.clear);
    isEmpty = true;
  }
  function replotAll() {
    for (let plot of plotArray) {
      if (plot.type === 'normal') {
        if (plot.dataHandler.isHierarchy) {
          let data = plot.dataHandler.getRange(...xScaleZoom.domain());
          if (data.length) {linePlot(plot.sel, data);}
        }
        else {linePlot(plot.sel);}
      }
      else if (plot.type === 'scatter') {
        if (plot.dataHandler.isHierarchy) {
          let data = plot.dataHandler.getRange(...xScaleZoom.domain());
          if (data.length) {scatterPlot(plot.sel, data);}
        }
        else {scatterPlot(plot.sel);}
      }
      else {constantPlot(plot.sel);}
    }
  }
  function reScale() {
    const width  = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    if (!width || !height) {return;}
    const extent = [
      [margin.left, margin.top], //(x0, y0)
      [width - margin.right, height - margin.bottom] //(x1, y1)
    ];
    xAxis.ticks(Math.ceil(width / 60));
    yAxis.ticks(Math.ceil(height / 30));
    gxAxis.attr('transform', `translate(0,${extent[1][1]})`);
    xScaleData.range([extent[0][0], extent[1][0]]);
    yScaleData.range([extent[1][1], extent[0][1]]);
    xScaleZoom.range(xScaleData.range());
    yScaleZoom.range(yScaleData.range());
    clipRect
      .attr('width', extent[1][0] - extent[0][0])
      .attr('height', extent[1][1] - extent[0][1]);
    zoomX.extent(extent).translateExtent(extent);
    zoomY.extent(extent).translateExtent(extent);
    brushX.extent(extent); gBrush.call(brushX);
    gBrush.call(brushX.move, d3.brushSelection(gBrush.node()));

    if (plotArray.length) {
      gxAxis.call(xAxis); gyAxis.call(yAxis); replotAll();
    }
  }
  function propertyChanged({name, value, objId}) {
    const plot = plotArray[objId - 1];
    if (name === 'Type') {
      let plotSel;
      if (value === 'normal') { //scatter => normal
        let data = !plot.dataHandler.isHierarchy ? plot.dataHandler.value : 
          plot.dataHandler.getRange(...xScaleZoom.domain());
        plotSel = linePlot(null, data, {
          color: plot.sel.attr('fill'),
          size: plot.sel.select('*').attr('r')
        });
      }
      else if (value === 'scatter') { //normal => scatter
        let data = !plot.dataHandler.isHierarchy ? plot.dataHandler.value :
          plot.dataHandler.getRange(...xScaleZoom.domain());
        plotSel = scatterPlot(null, data, {
          color: plot.sel.attr('stroke'),
          size: plot.sel.attr('stroke-width')
        });
      }
      else if (value === 'x-axis' || value === 'y-axis') {
        plotSel = constantPlot(null, [plot.sel.datum().reverse()], {
          color: plot.sel.attr('stroke'),
          size: plot.sel.attr('stroke-width')
        });
      }
      else {throw new Error(`Invalid 'Type' property given: ${value}`);}
      plot.sel.node().replaceWith(plotSel.node());
      Object.assign(plot, {sel: plotSel, type: value});
    }
    else if (name === 'Color') {
      if (plot.type === 'scatter') {
        plot.sel.attr('fill', value);
      }
      else {
        if (plot.sel.attr('fill') !== 'none') {plot.sel.attr('fill', value);}
        plot.sel.attr('stroke', value);
      }
    }
    else if (name === 'Size') {
      if (plot.type !== 'scatter') {plot.sel.attr('stroke-width', value);}
      else {plot.sel.selectAll('*').attr('r', value);}
    }
    else if (name === 'Remove') {
      plot.sel.remove();
      plotArray.splice(objId - 1, 1);
      if (!plotArray.length) {clear();}
      else if (updateScaleDomain()) {replotAll();}
      callParent('properties', {elem: node});
    }
  }
  function updateScaleDomain(data) {
    let dataExtentX, dataExtentY;
    let domainX = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    let domainY = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    let emptyArgument = true;
    if (data) {
      emptyArgument = false;
      dataExtentX = d3.extent(data, d => d[0]);
      dataExtentY = data[0][2] === undefined ? d3.extent(data, d => d[1]) :
        [d3.extent(data, d => d[1])[0], d3.extent(data, d => d[2])[1]];
      updateDomains(domainX, domainY, dataExtentX, dataExtentY);
    }
    for (let plot of plotArray) {
      if (plot.type === 'normal' || plot.type === 'scatter') {
        data = plot.dataHandler.isHierarchy ? 
          plot.dataHandler.getLastLevel().data :
          plot.dataHandler.value;
      }
      else {data = plot.sel.data();}
      if (!data[0]) {continue;}
      dataExtentX = d3.extent(data, d => d[0]);
      dataExtentY = data[0][2] === undefined ? d3.extent(data, d => d[1]) :
        [d3.extent(data, d => d[1])[0], d3.extent(data, d => d[2])[1]];
      updateDomains(domainX, domainY, dataExtentX, dataExtentY);
    }
    if (domainX[0] === domainX[1]) {domainX[0] -=0.5; domainX[1] +=0.5;}
    if (domainY[0] === domainY[1]) {domainY[0] -=0.5; domainY[1] +=0.5;}
    
    var oldDomainX = xScaleData.domain(), oldDomainY = yScaleData.domain();
    if (
      emptyArgument || !plotArray.length ||
      domainX[0] < oldDomainX[0] || oldDomainX[1] < domainX[1] ||
      domainY[0] < oldDomainY[0] || oldDomainY[1] < domainY[1]
    ) {
      xScaleData.domain(domainX ? domainX : [0, 1]);
      yScaleData.domain(domainY ? domainY : [0, 1]).nice();
      const zoomTx = d3.zoomTransform(svg.node());
      const zoomTy = d3.zoomTransform(gBrush.node());
      xScaleZoom.domain(zoomTx.rescaleX(xScaleData).domain());
      yScaleZoom.domain(zoomTy.rescaleX(yScaleData).domain());
      return true;
    }
    return false;
  }
  function updateDomains(domainX, domainY, extentX, extentY) {
    if (extentX[0] < domainX[0]) {domainX[0] = extentX[0];}
    if (extentX[1] > domainX[1]) {domainX[1] = extentX[1];}
    if (extentY[0] < domainY[0]) {domainY[0] = extentY[0];}
    if (extentY[1] > domainY[1]) {domainY[1] = extentY[1];}
  }
  function linePlot(plotSel, data, options) {
    if (!plotSel) {
      plotSel = d3.create('svg:path').attr('stroke-linejoin', 'round');
    }
    if (data) {plotSel.datum(data);}
    if (options) {
      plotSel.attr('stroke', options.color);
      plotSel.attr('stroke-width', options.size);
    }
    //if a sample of data has 3 points, means that it's an area chart
    if (plotSel.datum()[0][2]) {
      plotSel.attr('d', area).attr('fill', plotSel.attr('stroke'));
    }
    else {plotSel.attr('d', line).attr('fill', 'none');}
    return plotSel;
  }
  function scatterPlot(plotSel, data, options) {
    if (!plotSel) {plotSel = d3.create('svg:g');}
    if (data) {
      plotSel.selectAll('*').data(data).join('svg:circle')
        .attr('r', plotSel.select('*').attr('r'));
    }
    if (options) {
      if (options.color) {plotSel.attr('fill', options.color);}
      if (options.size) {plotSel.selectAll('*').attr('r', options.size);}
    }
    plotSel.selectAll('*')
        .attr('cx', d => xScaleZoom(d[0]))
        .attr('cy', d => yScaleZoom(d[1]));
    return plotSel;
  }
  function constantPlot(plotSel, data, options) {
    if (!plotSel) {plotSel = d3.create('svg:line');}
    if (options) { 
      if (options.color) {plotSel.attr('stroke', options.color);}
      if (options.size) {plotSel.attr('stroke-width', options.size);}
    }
    if (data) {
      plotSel.data(data);
      if (data[0][0] === null) {
        plotSel.attr('x1', '0%').attr('x2', '100%');
      }
      else {plotSel.attr('y1', '0%').attr('y2', '100%');}
    }
    if (plotSel.data()[0][0] === null) {
      plotSel
          .attr('y1', d => yScaleZoom(d[1]))
          .attr('y2', d => yScaleZoom(d[1]));
    }
    else {
      plotSel
          .attr('x1', d => xScaleZoom(d[0]))
          .attr('x2', d => xScaleZoom(d[0]));
    }
    return plotSel;
  }
  function zoomed() {
    if (!d3.event.sourceEvent) {return;}
    if (d3.event.sourceEvent.ctrlKey) {
      yScaleZoom.domain(d3.event.transform.rescaleY(yScaleData).domain());
      gyAxis.call(yAxis);
    }
    else {
      xScaleZoom.domain(d3.event.transform.rescaleX(xScaleData).domain());
      gxAxis.call(xAxis);
    }
    replotAll();
  }
  function handleResize({y}) {
    const y0 = y;
    const height = Number.parseInt(node.style.height);
    function move({y}) {
      const newHeight = height + y - y0;
      if (newHeight < 100 || newHeight > 500) {return;}
      node.style.height = `${newHeight}px`;
    }
    function stop() {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      document.body.style.cursor = oldCursor;
      reScale();
    }
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    const oldCursor = document.body.style.cursor;
    document.body.style.cursor = 'ns-resize';
  }


  //Initialize object
  ;(function() {
    //Manipulating DOM
    isEmpty = true;
    node.style.height = `${height}px`;
    svg.attr('class', 'chart').style('background', 'whitesmoke');
    gxAxis.style('color', 'black'); gyAxis.style('color', 'black');
    gyAxis.attr('transform', `translate(${margin.left},0)`);
    clipRect.attr("x", margin.left).attr("y", margin.top);
    node.appendChild(svg.node());
    svg.node().addEventListener('dragover', event => event.preventDefault());
    appendNewElement(node, 'div', 'ns-resize')
      .addEventListener('mousedown', handleResize);

    //Configuring d3 functions
    xAxis.scale(xScaleZoom); yAxis.scale(yScaleZoom);
    line.x(d => xScaleZoom(d[0]))
        .y(d => yScaleZoom(d[1]));
    area.x(d => xScaleZoom(d[0]))
        .y0(d => yScaleZoom(d[1]))
        .y1(d => yScaleZoom(d[2]));
    brushX.extent([[0, 0], [1, 1]]); gBrush.call(brushX);
    brushX.filter(() => !isEmpty && !d3.event.button);

    zoomX.scaleExtent([1, Infinity]).on('zoom', zoomed);
    zoomX.filter(() => !isEmpty && !d3.event.button && !d3.event.ctrlKey);
    zoomY.scaleExtent([0.1, Infinity]).on('zoom', zoomed);
    zoomY.filter(() => !isEmpty && !d3.event.button &&  d3.event.ctrlKey);
    //We can't call two zoom functions on the same element, so we must call one
    //for the svg and other for the gBrush. The gBrush is a good choice because
    //it is the only element that receives pointer events. So to the user, zooming
    //in either direction is the same
    svg.call(zoomX);
    gBrush.call(zoomY);
    this.reindex(id);
    this.setBrush(false);
  }).call(this);
}