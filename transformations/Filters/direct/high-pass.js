"use strict";

//High-pass Filter function. Code adapted from pseudocode on:
//https://en.wikipedia.org/wiki/High-pass_filter
//Return RC high-pass filter output samples, given input samples,
//time interval dt, and time constant RC

exports.name = 'High pass';
exports.tooltip = 'Filtro passa altas'
exports.func = function (data, {fc, n, dt}) {
  //constants
  if (n === undefined) n = 1;
  if (dt === undefined) dt = Math.abs(data[1][0] - data[0][0]);
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
exports.args = [
  {name: 'fc', type: 'number', tooltip: 'Frequência de corte'},
  {name: 'n' , type: 'number', optional: true, tooltip: 'Número de vezes que o filtro será aplicado. Valor padrão: 1'},
  {name: 'dt', type: 'number', optional: true, tooltip: 'Intervalo de tempo entre amostras. Se um valor não for dado, o intervalo entre as duas primeiras amostras será calculado.'}
];