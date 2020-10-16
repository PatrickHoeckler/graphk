"use strict";

module.exports = {readFile, readDSV, readJSON};
const d3 = require('d3');
const fs = require('fs');
const {extname, basename} = require('path');
const {DataHandler} = require('../../auxiliar/dataHandler.js');

function readFile(filePath) {
  let extension = extname(filePath);
  let fileName = basename(filePath, extension);
  let fileString = fs.readFileSync(filePath, 'utf8');
  if (extension === '.json') {return readJSON(fileName, fileString);}
  else {return readDSV(fileName, fileString);}
}

function readDSV(name = 'NoName', dsvString) {
  //tries to find the separator if not given
  let separator = null;
  for (let i = 0, n = Math.max(dsvString.length, 100); i < n; i++) {
    let c = dsvString.charCodeAt(i);
    if (47 < c && c <  58) {continue;} // '0'-'9'
    if (64 < c && c <  91) {continue;} // 'A'-'Z'
    if (96 < c && c < 123) {continue;} // 'a'-'z'
    if (c === 43 || c === 45 || c === 46) {continue;} //'+', '-', '.'
    separator = dsvString[i];
    break;
  }
  if (!separator) {return false;}
  //Uses separator to convert dsvString to numerical data
  let data = [];
  let stringData = d3.dsvFormat(separator).parseRows(dsvString);
  let startRow = Number(stringData[0][0]) ? 0 : 1; //ignore if first row is header
  let nCols = stringData[0].length;
  if (nCols === 2) {
    let value = [];
    for (let i = startRow, n = stringData.length; i < n; i++) {
      value.push([Number(stringData[i][0]), Number(stringData[i][1])]);
    }
    data.push(new DataHandler({name, value, type: 'normal'}));
  }
  else {
    for (let col = 0; col < nCols; col++) {
      let value = [];
      for (let i = startRow, n = stringData.length; i < n; i++) {
        value.push([i, Number(stringData[i][col])]);
      }
      if (startRow === 1) {
        data.push(new DataHandler({
          name: stringData[0][col], value, type: 'normal'
        }));
      }
      else {
        data.push(new DataHandler({
          name: name + ' - c' + (col + 1), value, type: 'normal'
        }));
      }
    }
  }
  return data;
}

function readJSON(name = 'NoName', jsonString) {
  let data = JSON.parse(jsonString);
  if (!Array.isArray(data)) {data = [data];}
  for (let i = 0, n = data.length; i < n; i++) {
    if (!data[i].type) {data[i].type = 'normal';}
    if (!data[i].name) {data[i].name = name + ' - c' + (col + 1);}
    data[i] = new DataHandler(data[i]);
  }
  return data;
}
