"use strict";

function intTrap(data, startIndex, endIndex) {
  //finds the start and ending indexes
  let iStart = startIndex < 0 ? 0 : startIndex;
  let iEnd = data.length < endIndex ? data.length : endIndex;
  if (data.length < iStart  || iEnd < 0) {return null;}
  //in this case, will calculate the interval between every point
  let integral = 0;
  for (let i = iStart + 1; i < iEnd; i++) {
    integral += (data[i][0] - data[i - 1][0]) * (data[i][1] + data[i - 1][1]);
  }
  integral /= 2;
  return integral;
}

export const name = 'Teste';
export const func = function({data, extremes}) {
  //Find the extremes that belong to the range of data
  let dataExtremes = [];
  let lastSample = 1;
  let i, j;
  for (i = 0; i < extremes.length; i++) {
    let isPeak; //indicates if extreme corresponds to a peak or a trough
    let extremeX = extremes[i][0];
    if (extremeX < data[0][0]) {continue;} //ignores all peaks that come before than the data
    if (i === 0) {isPeak = extremes[0][1] > extremes[1][1];}
    else {isPeak = extremes[i][1] > extremes[i - 1][1];}
    for (j = lastSample; j < data.length; j++) {
      if (extremeX <= data[j][0]) {
        dataExtremes.push({index: lastSample = j, isPeak: isPeak});
        break;
      }
    }
    if (j === data.length) {break;}
  }

  let maxArray = [];
  let integralArray = [];
  for (i = 0; i < dataExtremes.length - 2; i++) {
    if (!dataExtremes[i].isPeak) {continue;}
    let curPeak  = dataExtremes[i].index;
    let trough   = dataExtremes[i + 1].index;
    let nextPeak = dataExtremes[i + 2].index;
    //Calculate integrals
    integralArray.push({
      descida: intTrap(data, curPeak, trough),
      subida: intTrap(data, trough, nextPeak),
      total: intTrap(data, curPeak, nextPeak)
    });
    //Calculate max values
    let maxDescida = data[curPeak][1];
    for (j = curPeak + 1; j <= trough; j++) {
      if (maxDescida < data[j][1]) {maxDescida = data[j][1];}
    }
    let maxSubida = data[trough][1];
    for (j = trough + 1; j <= nextPeak; j++) {
      if (maxSubida < data[j][1]) {maxSubida = data[j][1];}
    }
    maxArray.push({
      descida: maxDescida,
      subida: maxSubida,
      total: maxSubida > maxDescida ? maxSubida : maxDescida
    });
  }

  //Calculate averages of integral and max values
  let out = {
    max: {descida: 0, subida: 0, total: 0},
    integral: {descida: 0, subida: 0, total: 0}
  };
  let n = maxArray.length;
  for (i = 0; i < n; i++) {
    for (let key in out.max) {
      out.max[key] += maxArray[i][key];
      out.integral[key] += integralArray[i][key];
    }
  }
  for (let key in out.max) {out.max[key] /= n; out.integral[key] /= n;}
  return out;
}
export const type = 'no-plot';
export const args = [
  {name: 'extremes', type: 'data', tooltip: 'Vetor de extremos de um sinal'},
];