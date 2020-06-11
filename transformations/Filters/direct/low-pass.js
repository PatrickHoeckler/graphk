"use strict";

//Low-pass Filter function. Code adapted from pseudocode on:
//https://en.wikipedia.org/wiki/Low-pass_filter
//Return RC low-pass filter output samples, given input samples,
//time interval dt, and time constant RC

export const name = 'Low pass';
export const tooltip = 'Filtro passa baixas'
export const func = function (data, {fc, n, dt, method}) {
  //constants
  if (n === undefined) n = 1;
  if (dt === undefined) dt = Math.abs(data[1][0] - data[0][0]);
  const _2way = method === '2-way';
  const RC = 1 / (2 * Math.PI * fc);
  const alpha = dt / (RC + dt);

  //applying filter n times
  var input, out;
  input = data;
  while (n--) {
    for (let k = 0; k < 2; k++) {
      out = [];
      out.push([input[0][0], alpha * input[0][1]]);
      for (let i = 1; i < input.length; i++) {
        let x = input[i][0];
        let y = alpha * input[i][1] + (1 - alpha) * out[i - 1][1];
        out.push([x, y]);
      }
      if (_2way) input = out.reverse();
      else {input = out; break;}
    }
  }
  return out;
};

export const args = [
  {name: 'fc', type: 'number', tooltip: 'Frequência de corte'},
  {name: 'n' , type: 'number', optional: true, tooltip: 'Número de vezes que o filtro será aplicado. Valor padrão: 1'},
  {
    name: 'dt',
    type: 'number',
    optional: true,
    tooltip: 'Intervalo de tempo entre amostras. Se um valor não for dado, ' + 
    'o intervalo entre as duas primeiras amostras será calculado.'
  },
  {
    name: 'method',
    type: 'select',
    option: [
      {name: '2-way', tooltip: 'Aplica filtro, inverte o resultado, aplica o filtro e inverte novamente'},
      {name: 'normal', tooltip: 'Filtro passa-baixas convencional, similar a um filtro de circuito RC'}
    ],
    tooltip: 'Método que o filtro será aplicado'
  }
];