"use strict";

module.exports = {Chart};

const {appendNewElement} = require('../../auxiliar/auxiliar.js');
const d3 = require('d3');
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
  const zoom = d3.zoom();
  const brushX = d3.brushX();

  //Private Properties
  var xDomainEmpty, yDomainEmpty;
  var isEmpty;

  //Public Methods
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
    if (enable) {brushX.filter(zoom.filter());}
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
    //can't call xScaleZoom.invert() because this scale does not consider
    //the translation part of the zoom. Must create a new tempScale based
    //on the current zoomTransform being aplied
    const tempScale = d3.zoomTransform(svg.node()).rescaleX(xScaleData);
    const [x0, x1] = d3.brushSelection(gBrush.node())
      .map(d => tempScale.invert(d));
    const out = {interval: [x0, x1], brushed: []};
    for (let plot of plotArray) {
      const data = plot.type === 'normal' ? plot.sel.datum() :
        plot.type === 'scatter' ? plot.sel.selectAll('circle').data() :
        null;
      if (!data) {continue;}
      const brushedData = [];
      for (let point of data) {
        if (x0 < point[0] && point[0] < x1) {brushedData.push(point);}
      }
      if (brushedData.length > 1) {out.brushed.push(brushedData);}
    }
    return out;
  }
  this.plot = function(data, color, type) {
    if (typeof data === 'number') {
      if (type === 'x-axis') {data = [[data, null]];}
      else {data = [[null, data]]; type = 'y-axis';}
    }
    if (updateScaleDomain(data)) {
      gxAxis.call(xAxis); gyAxis.call(yAxis);
      replotAll();
    }
    //Creating Plot elements
    const options = {data, color, size: type === 'scatter' ? 3 : 1.5};
    var plotSel;
    if (type === 'normal')       {plotSel = linePlot(null, options);}
    else if (type === 'scatter') {plotSel = scatterPlot(null, options);}
    else if (type === 'x-axis')  {plotSel = constantPlot(null, options);}
    else if (type === 'y-axis')  {plotSel = constantPlot(null, options);}
    else {throw new Error(`'${type}' is not a valid value for the type argument`);}
    gPlot.append(() => plotSel.node());
    plotArray.push({sel: plotSel, type});
    isEmpty = false;
  }
  this.clear = function() {
    plotArray.length = 0;
    xScaleData.domain([0, 1]); yScaleData.domain([0, 1]);
    xScaleZoom.domain([0, 1]); yScaleZoom.domain([0, 1]);
    zoom.transform(svg, d3.zoomIdentity);
    xAxis.scale(xScaleData); yAxis.scale(yScaleData);
    gxAxis.selectAll('*').remove(); gyAxis.selectAll('*').remove();
    gPlot.selectAll('*').remove();
    gPlot.attr('transform', null);
    gBrush.call(brushX.clear);
    isEmpty = true;
  }
  this.getChartProperties = function () {
    const pObjs = [];
    pObjs.push({
      name: 'Chart', props: [
        {name: 'Axis Color', type: 'color', value: gxAxis.style('color')},
        {name: 'Background', type: 'color', value: svg.style('background')},
        {name: 'Axis', type: 'button', value: 'Rescale to fit'}
      ],
      onInput: function({name, value}) {
        if (name === 'Background') {svg.style('background', value);}
        else if (name === 'Axis') {
          gxAxis.call(xAxis); gyAxis.call(yAxis);
          replotAll();
        }
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
          }
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
          if (updateScaleDomain(data)) {replotAll();}
          constantPlot(plot.sel, {data});
        }
      }
      pObjs.push(propObj);
    }
    return pObjs;
  }

  //Private Functions
  function replotAll() {
    for (let plot of plotArray) {
      if (plot.type === 'normal') {linePlot(plot.sel);}
      else if (plot.type === 'scatter') {scatterPlot(plot.sel);}
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
    zoom.extent(extent).translateExtent(extent);
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
        plotSel = linePlot(null, {
          data: plot.sel.selectAll('*').data(),
          color: plot.sel.attr('fill'),
          size: plot.sel.select('*').attr('r')
        });
      }
      else if (value === 'scatter') { //normal => scatter
        plotSel = scatterPlot(null, {
          data: plot.sel.datum(),
          color: plot.sel.attr('stroke'),
          size: plot.sel.attr('stroke-width')
        });
      }
      else if (value === 'x-axis' || value === 'y-axis') {
        plotSel = constantPlot(null, {
          data: [plot.sel.datum().reverse()],
          color: plot.sel.attr('stroke'),
          stroke: plot.sel.attr('stroke-width')
        });
      }
      else {throw new Error(`Invalid 'Type' property given: ${value}`);}
      plot.sel.node().replaceWith(plotSel.node());
      plotArray[objId - 1] = {sel: plotSel, type: value};
    }
    else if (name === 'Color') {
      plot.sel.attr(plot.type === 'scatter' ? 'fill' : 'stroke', value);
    }
    else if (name === 'Size') {
      if (plot.type !== 'scatter') {plot.sel.attr('stroke-width', value);}
      else {plot.sel.selectAll('*').attr('r', value);}
    }
  }
  function updateScaleDomain(data) {
    //TODO: quando eu uso o painel de propriedades pra mover uma constante
    //pra fora do domínio e volto essa constante pra um valor menor, então
    //o domínio nao é atualizado automaticamente.

    //Updating scale domain given the new set of data
    var dataExtentX, dataExtentY;
    var domainX, domainY;
    dataExtentX = d3.extent(data, d => d[0]);
    dataExtentY = d3.extent(data, d => d[1]);
    if (plotArray.length) {
      //This if is to adjust the scale correctly in case the only plots
      //created until now give a domain where its max and min values are
      //the same. This can happen if a user plots a curve where all the
      //values in an axis are the same, or more likely, plots a constant
      //value (a line ploted via the constantPlot() function)
      if (xDomainEmpty || yDomainEmpty) {
        let plotData;
        domainX = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
        domainY = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
        for (let plot of plotArray) {
          if (plot.type === 'normal') {plotData = plot.sel.datum();}
          else if (plot.type === 'scatter') {
            plotData = plot.sel.selectAll('*').data();
          }
          else {plotData = plot.sel.data();}
          const plotExtentX = d3.extent(plotData, d => d[0]);
          const plotExtentY = d3.extent(plotData, d => d[1]);
          updateDomains(domainX, domainY, plotExtentX, plotExtentY);
        }

      }
      else {domainX = xScaleData.domain(); domainY = yScaleData.domain();}
      updateDomains(domainX, domainY, dataExtentX, dataExtentY);
    }
    else {domainX = dataExtentX; domainY = dataExtentY;}
    if (xDomainEmpty = (domainX[0] === domainX[1])) {
      domainX[0] -=0.5; domainX[1] +=0.5;
    }
    if (yDomainEmpty = (domainY[0] === domainY[1])) {
      domainY[0] -=0.5; domainY[1] +=0.5;
    }
    
    var oldDomainX = xScaleData.domain(), oldDomainY = yScaleData.domain();
    if (domainX[0] < oldDomainX[0] || oldDomainX[1] < domainX[1] ||
        domainY[0] < oldDomainY[0] || oldDomainY[1] < domainY[1]
    ) {
      xScaleData.domain(domainX); yScaleData.domain(domainY).nice();
      const zoomT = d3.zoomTransform(svg.node());
      xScaleZoom.domain(zoomT.rescaleX(xScaleData).domain());
      yScaleZoom.domain(yScaleData.domain());
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
  function linePlot(plotSel, options) {
    if (!plotSel) {plotSel = d3.create('svg:path').attr('fill', 'none');}
    if (options) {
      if (options.data ) {plotSel.datum(options.data);}
      if (options.color) {plotSel.attr('stroke', options.color)}
      if (options.size ) {plotSel.attr('stroke-width', options.size);} 
    }
    plotSel.attr('d', line);
    return plotSel;
  }
  function scatterPlot(plotSel, options) {
    if (!plotSel) {plotSel = d3.create('svg:g');}
    if (options) {
      if (options.data) {
        plotSel.selectAll('*').data(options.data)
          .enter().append('svg:circle');
      }
      if (options.color) {plotSel.attr('fill', options.color);}
      if (options.size) {plotSel.selectAll('*').attr('r', options.size);}
    }
    plotSel.selectAll('*')
        .attr('cx', d => xScaleZoom(d[0]))
        .attr('cy', d => yScaleZoom(d[1]))
    return plotSel;
  }
  function constantPlot(plotSel, options) {
    if (!plotSel) {plotSel = d3.create('svg:line');}
    if (options) {
      if (options.data) {
        plotSel.data(options.data);
        if (options.data[0][0] === null) {
          plotSel.attr('x1', '0%').attr('x2', '100%');
        }
        else {plotSel.attr('y1', '0%').attr('y2', '100%');}
      }
      if (options.color) {plotSel.attr('stroke', options.color);}
      if (options.size) {plotSel.attr('stroke-width', options.size);}
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
    //TODO: achar um jeito de fazer zooms independentes nos eixos x e y
    if (!d3.event.sourceEvent) {return;}
    const scaledMargin = (d3.event.transform.k - 1) * margin.left;
    if (d3.event.sourceEvent.type === 'wheel') { //Zoom
      //Only adjust zoom scale without considering the translation
      const tempx = d3.event.transform.x;
      d3.event.transform.x = -scaledMargin;
      xScaleZoom.domain(d3.event.transform.rescaleX(xScaleData).domain());
      d3.event.transform.x = tempx;
      replotAll();
    }
    //Applies translation separately from the xScaleZoom because then, on pan
    //only events, there's no need to recalculate every single point on every
    //curve, just needs to change the 'transform' attribute from gPlot 
    gxAxis.call(xAxis.scale(d3.event.transform.rescaleX(xScaleData)));
    const translate = `translate(${d3.event.transform.x + scaledMargin},0)`;
    gPlot.attr('transform', translate);
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
    line.x(d => xScaleZoom(d[0])).y(d => yScaleZoom(d[1]));
    brushX.extent([[0, 0], [1, 1]]); gBrush.call(brushX);
    zoom.scaleExtent([1, Infinity]).on('zoom', zoomed);
    zoom.filter(() => !isEmpty && !d3.event.button && !d3.event.ctrlKey);
    brushX.filter(zoom.filter());
    svg.call(zoom);
    this.reindex(id);
    this.setBrush(false);
  }).call(this);
}