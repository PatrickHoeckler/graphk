"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
// - Tudo isso aqui tá uma bagunça, tirar um dia pra ajustar tudo de um jeito
//   melhor

//This is the object that handles all 
graphK.Chart = function(id = 0, _height = 150, bgColor = 'whitesmoke', axisColor = 'black') {
  //Private Properties
  //  d3 element selections
  var selection; //d3 selection of the main node
  var svg, gX, gY; //svg and axis elements
  var pathArray; //array of paths which are the lines in the chart

  //  chart attributes
  var width, height, margin; //svg size and margin properties
  var zoom; //d3.zoom object
  var xScale, xScaleZoom, yScale, xAxis, yAxis; //chart scale and axis
  var extentX, extentY; //extent of data being shown
  var line; //function to create path based on input data
  var chart = this; //reference to self, used on event handlers where 'this' does not work
  var brushX, brushEnabled, brushSelection, brushedRegion;
  var clipPath, clipRect, drawRegion;

  //Public Methods
  this.node = () => selection.node();
  this.remove = () => selection.remove();
  this.reindex= (id) => {
    clipPath.attr('id', `graphK-clippath-${id}`);
    drawRegion.attr('clip-path', `url(#graphK-clippath-${id})`);
  }
  this.setBrush = (enable) => {
    if (enable) {
      brushEnabled = true;
      selection.node().classList.add('cursor-cross');
    }
    //if enable is false, and brush was enabled before
    else if (brushEnabled) {
      brushSelection.call(brushX.clear);
      brushEnabled = false;
      selection.node().classList.remove('cursor-cross');
    }
  }
  this.clearBrush = () => brushSelection.call(brushX.clear);
  this.brushAlert = (tooltip) => {
    let brushRect = brushSelection.select('.selection');
    if (brushRect.node().childElementCount) {return;}
    let title = brushRect.append('title').html(tooltip);
    brushRect.node().classList.add('warning');
    brushX.on('start', () => {
      title.remove();
      brushRect.node().classList.remove('warning');
      brushX.on('start', null);
    });
  }
  this.getDataFromBrush = () => {
    if (pathArray.length !== 1) return null;
    let out = [];
    let data;
    //if path is a curve
    if (pathArray[0].node().tagName === 'path') {data = pathArray[0].datum();}
    else if (pathArray[0].node().tagName === 'g') {
      data = pathArray[0].selectAll('circle').data();
    }
    let minX = xScaleZoom.invert(brushedRegion[0]);
    let maxX = xScaleZoom.invert(brushedRegion[1]);
    for (let i = 0; i < data.length; i++) {
      let x = data[i][0];
      if (x < minX || maxX < x) continue;
      out.push(data[i]);
    }
    return out;
  }
  
  //  updates values based on svg element size
  this.reScale = function() {
    //svg element size
    width  = svg.node().clientWidth - margin.left - margin.right;
    height = svg.node().clientHeight - margin.top - margin.bottom;

    //translating axis to correct position
    gX.attr('transform', `translate(0,${height})`);
    //updating d3.axis and d3.scale
    xAxis.ticks(Math.ceil(width / 80));
    yAxis.ticks(Math.ceil(height / 30));
    xScale.range([0, width]);
    xScaleZoom.range(xScale.range());
    yScale.range([height, 0]);
    //updating d3.zoom
    zoom.extent([[0, 0], [width, height]])
        .translateExtent([[0, 0], [width, height]]);
    zoom.transform(svg, d3.zoomIdentity);
    //updating clip
    clipRect.attr("width", width).attr("height", height);
    //updating brush - OBS: eu tenho q fica dando append nos elemento toda hora,
    //eu acho q tem como evitar isso mas eu nao consegui ainda, TENTAR DENOVO UMA HORA DESSAS
    brushX.extent([[0, 0], [width, height]]);
    brushSelection.remove();
    brushSelection = drawRegion.append('g').attr('class', 'brush').call(brushX);
    brushSelection.select('.overlay').attr('cursor', null);
    
    if (pathArray.length) {
      gX.call(xAxis);
      gY.call(yAxis);
      for (let i = 0; i < pathArray.length; i++) {
        if (pathArray[i].node().tagName === 'path') {
          pathArray[i].attr('d', line);
        }
        else if (pathArray[i].node().tagName === 'g') {
          pathArray[i].selectAll('circle')
            .attr('cx', (d) => xScaleZoom(d[0]))
            .attr('cy', (d) => yScale(d[1]));
        }
        else if (pathArray[i].node().tagName === 'line') {
          let isY = pathArray[i].datum()[0];
          if (isY) { // (y-axis)
            pathArray[i]
                .attr('y1', (d) => yScale(d[1]))
                .attr('y2', (d) => yScale(d[1]));
          }
          else { // (x-axis)
            pathArray[i]
                .attr('x1', (d) => xScaleZoom(d[1]))
                .attr('x2', (d) => xScaleZoom(d[1]));
          }
        }
      }
    }
  }

  this.plot = function(data, color, type) {
    if (typeof(data) !== 'number' && !data.length) return;
    //adjusting extent
    let dataExtentX;
    let dataExtentY;
    if (typeof(data) === 'number') {
      dataExtentX = type === 'x-axis' ? 
        [data, data] : [undefined, undefined];
      dataExtentY = type !== 'x-axis' ?
        [data, data] : [undefined, undefined];
    }
    else {
      dataExtentX = d3.extent(data, d => d[0]);
      dataExtentY = d3.extent(data, d => d[1]);
    }
    if (!extentX) extentX = dataExtentX;
    if (!extentY) extentY = dataExtentY;
    if (extentX[0] > dataExtentX[0]) extentX[0] = dataExtentX[0];
    if (extentX[1] < dataExtentX[1]) extentX[1] = dataExtentX[1];
    if (extentY[0] > dataExtentY[0]) extentY[0] = dataExtentY[0];
    if (extentY[1] < dataExtentY[1]) extentY[1] = dataExtentY[1];

    xScale.domain(extentX);
    xScaleZoom.domain(xScale.domain());
    yScale.domain(extentY).nice();
    this.reScale();
    gX.call(xAxis);
    gY.call(yAxis);

    let path;
    color = color ? color : 'black';
    if (typeof(data) === 'number') {
      if (type === 'x-axis') data = [0, data]; //0 indicates vertical line (x-axis constant)
      else data = [1, data]; //1 indicates horizontal line (y-axis constant)
      path = drawRegion
        .append('line').datum(data)
        .attr('stroke', color)
        .style('stroke-width', 1);
      if (data[0]) { // (y-axis)
        path.attr('x1', '0').attr('x2', '100%')
            .attr('y1', (d) => yScale(d[1]))
            .attr('y2', (d) => yScale(d[1]));
      }
      else { // (x-axis)
        path.attr('y1', '0').attr('y2', '100%')
            .attr('x1', (d) => xScaleZoom(d[1]))
            .attr('x2', (d) => xScaleZoom(d[1]));
      }
    }
    else if (type === 'scatter') {
      path = drawRegion.append('g');
      path.selectAll('dot')
          .data(data)
          .enter()
        .append('circle')
          .attr('cx', (d) => xScaleZoom(d[0]))
          .attr('cy', (d) => yScale(d[1]))
          .attr('r', 3)
          .attr('fill', color);
    }
    else {
      path = drawRegion
        .append('path')
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', 1.5)
          .attr('stroke-linejoin', 'round')
          .attr('stroke-linecap' , 'round');
      path.datum(data).attr('d', line);
    }
    pathArray.push(path);
  }

  this.changeColor = function(color, where) {
    if (d3.color(color) === null) return;
    if (where === 'background') svg.style('background', color);
    else if (where === 'stroke') path.attr('stroke',  color);
    else if (where === 'axis') {
      gX.style('color', color);
      gY.style('color', color);
    }
  }

  this.clear = function() {
    extentX = undefined;
    extentY = undefined;
    pathArray = [];
    gX.selectAll('*').remove();
    gY.selectAll('*').remove();
    drawRegion.selectAll('*').remove();
  }


  //Private Functions
  //  Zoom function
  function zoomed() {
    if (!pathArray.length) return;
    if (d3.event.sourceEvent && d3.event.sourceEvent.altKey) {
      gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
      gY.call(yAxis.scale(d3.event.transform.rescaleY(yScale)));
      for (let i = 0; i < pathArray.length; i++) {
        pathArray[i]
            .attr('transform', d3.event.transform)
            .attr('stroke-width', 1.5 / d3.event.transform.k);
      }
    }
    else if (d3.event.sourceEvent) {
      gX.call(xAxis.scale(d3.event.transform.rescaleX(xScale)));
      xScaleZoom.domain(d3.event.transform.rescaleX(xScale).domain());
      //if event type is zoom with mouse wheel
      if (d3.event.sourceEvent.type === 'wheel') {
        for (let i = 0; i < pathArray.length; i++) {
          if (pathArray[i].node().tagName === 'path') {
            pathArray[i].attr('d', line);
          }
          else if (pathArray[i].node().tagName === 'g') {
            pathArray[i].selectAll('circle')
              .attr('cx', (d) => xScaleZoom(d[0]));
          }
          else if (pathArray[i].node().tagName === 'line') {
            let isY = pathArray[i].datum()[0];
            if (!isY) { // (x-axis)
              pathArray[i]
                  .attr('x1', (d) => xScaleZoom(d[1]))
                  .attr('x2', (d) => xScaleZoom(d[1]));
            }
          }
        }
      }
      //if event type is pan with mouse move
      else if (d3.event.sourceEvent.type === 'mousemove') {
        for (let i = 0; i < pathArray.length; i++) {
          if (pathArray[i].node().tagName === 'path') {
            pathArray[i].attr('d', line);
            //pathArray[i].attr("transform", `translate(${d3.event.transform.x}, 0)`);
          }
          else if (pathArray[i].node().tagName === 'g') {
            pathArray[i].selectAll('circle')
              .attr('cx', (d) => xScaleZoom(d[0]));
          }
          else if (pathArray[i].node().tagName === 'line') {
            let isY = pathArray[i].datum()[0];
            if (!isY) { // (x-axis)
              pathArray[i]
                  .attr('x1', (d) => xScaleZoom(d[1]))
                  .attr('x2', (d) => xScaleZoom(d[1]));
            }
          }
        }
      }
    }
  }
  //  Resize Function
  function handleResize(e) {
    let oldHeight = svg.node().clientHeight;
    let startY = e.y;
    let move = function (e) {
      let newHeight = oldHeight + e.y - startY;
      newHeight = newHeight < 100 ? 100 : 
                  newHeight > 500 ? 500 : 
                  newHeight;
      selection.style('height', `${newHeight}px`);
    }
    let stop = function () {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
      chart.reScale();
    }
    
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop); 
  }

  
  //Initialize object
  width = height = 0;
  margin = {top: 10, right: 10, bottom: 20, left: 40};
  pathArray = []; //initially no lines are draw
  selection = d3
    .create('div')
      .attr('class', 'chart-body')
      .style('height', _height + 'px')
  //  svg elements creation
  svg = selection
    .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .style('background', bgColor)
      .style('pointer-events', 'none')
  var group = svg.append('g')
      .attr("transform", `translate(${margin.left}, ${margin.top})`);
  gX = group.append('g')
      .style('color', axisColor);
  gY = group.append('g')
      .style('color', axisColor);
  clipPath = group.append("defs").append("svg:clipPath")
      .attr('id', `graphK-clippath-${id}`);
  clipRect = clipPath.append("svg:rect").attr("x", 0).attr("y", 0);
  drawRegion = group.append('g').attr('clip-path', `url(#graphK-clippath-${id})`);

  //  scale, axis and line function
  xScale = d3.scaleLinear();
  xScaleZoom = d3.scaleLinear();
  yScale = d3.scaleLinear();
  xAxis = d3.axisBottom(xScale);
  yAxis = d3.axisLeft(yScale);
  line = d3.line()
      .x(d => xScaleZoom(d[0]))
      .y(d => yScale(d[1]));
  //  creating zoom
  zoom = d3.zoom().scaleExtent([1, 10]).on('zoom', zoomed);
  zoom.filter(() => (d3.event.type !== 'dblclick') && (d3.event.type !== 'click'));
  svg.call(zoom);
  //  creating brush
  brushEnabled = false;
  brushX = d3.brushX()
      .extent([[0, 0], [0, height]])
      .on('end', () => {brushedRegion = d3.event.selection})
      .filter(() => {return brushEnabled && d3.event.button === 0});
  brushSelection = drawRegion.append('g').attr('class', 'brush').call(brushX);


  //appending resizer div to selection
  let resizer = selection.append('div').attr('class', 'height-resizer');
  resizer.node().addEventListener('mousedown', handleResize);

  //allowing dragover on the svg element
  svg.node().addEventListener('dragover', (e) => e.preventDefault());
}