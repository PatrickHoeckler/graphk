"use strict";

export const name = 'Peaks';
export const func = function (data, {minX, minY, d}) {
  if (minX === undefined) minX = 0;
  if (minY === undefined) minY = 0;
  if (d === undefined) d = 1;
  var out = [];
  let lastPeak = [];
  let lastDY;
  let curDY;
  for (let i = d; i < data.length - d; i++) {
    lastDY = data[i][1] - data[i - d][1];
    curDY = data[i + d][1] - data[i][1];
    //checks if lastDY and curDY have the same sign, which means
    //a change in slope, meaning that the current point is a peak
    //NOTE: This comparison considers 0 as a positive number
    if ((lastDY >= 0) !== (curDY >= 0)) {
      if (data[i][0] - lastPeak[0] < minX) continue;
      if (Math.abs(data[i][1] - lastPeak[1]) < minY) continue;
      lastPeak = data[i];
      out.push(lastPeak);
    }
    lastDY = curDY;
  }
  return out;
};
export const type = 'scatter';
export const tooltip = `Encontra os extremos locais do conjunto de dados`;
export const args = [
  {name: 'minX', type: 'number', optional: true, tooltip: 'Distância mínima entre 2 pontos no eixo x. Valor padrão: 0'},
  {name: 'minY', type: 'number', optional: true, tooltip: 'Distância mínima entre 2 pontos no eixo y. Valor padrão: 0'},
]