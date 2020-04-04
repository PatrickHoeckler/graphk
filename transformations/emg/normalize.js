"use strict";

exports.name = 'Normalize';
exports.tooltip = 'Divide o sinal pela magnitude do valor mais distante de zero.\n'
'Ou seja, para EMG, divide o sinal pela contração máxima do músculo.';
exports.func = function(data) {
  //find the max absolute value
  let max = 0;
  data.forEach(sample => {
    let absY = Math.abs(sample[1]);
    if (absY > max) {max = absY;}
  });
  //scales the signal by the inverse of max
  return data.map((sample) => [sample[0], sample[1] / max]);
}