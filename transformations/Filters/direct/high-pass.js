"use strict";

//High-pass Filter function. Code adapted from pseudocode on:
//https://en.wikipedia.org/wiki/High-pass_filter
//Return RC high-pass filter output samples, given input samples,
//time interval dt, and time constant RC

export const name = 'High pass';
export const tooltip = 'Filtro passa altas'
export const func = function ({data, fc, n, dt}) {
  //constants
  if (dt) dt = Math.abs(data[1][0] - data[0][0]);
  const RC = 1 / (2 * Math.PI * fc);
  const alpha = RC / (RC + dt);

  //aplying filter n times
  var input, out;
  input = data;
  while (n--) {
    out = [];
    out.push([input[0][0], input[0][1]]);
    for (let i = 1; i < input.length; i++) {
      let x = input[i][0];
      let y = alpha * (out[i - 1][1] + input[i][1] - input[i - 1][1]);
      out.push([x, y]);
    }
    input = out;
  }
  return out;
};
export const args = [
  {name: 'fc', type: 'number', min: 0, value: 1, tooltip: 'Frequência de corte'},
  {
    name: 'n' , type: 'number', min: 1, value: 1, step: 1,
    tooltip: 'Número de vezes que o filtro será aplicado.'
  },
  {
    name: 'dt', type: 'number', optional: true, min: 0,
    tooltip: 'Intervalo de tempo entre amostras. Se um valor não for dado, ' + 
    'o intervalo entre as duas primeiras amostras será calculado.'
  },
];