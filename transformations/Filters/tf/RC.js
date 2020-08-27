"use strict";

export const name = 'RC';
export const tooltip = 'Filtro passa baixas RC';
export const func = function ({data, fc, dt}) {
  if (!dt) dt = Math.abs(data[1][0] - data[0][0]);
  const RC = 1 / (2 * Math.PI * fc);
  let b = [1, 1];
  let a = [1, 2 / (1 + 2 * RC / dt) - 1];
  //for a gain of 1 at 0Hz -> K = sum(a) / sum(b)
  let K = (a[0] + a[1]) / 2;
  b = b.map(d => K * d);
  return [b, a];
};
export const type = 'no-plot';
export const args = [
  {name: 'fc', type: 'number', tooltip: 'Frequência de corte'},
  {
    name: 'dt', type: 'number', optional: true, min: 0,
    tooltip: 'Intervalo de tempo entre amostras. Se um valor não for dado, ' + 
    'o intervalo entre as duas primeiras amostras será calculado.'
  }
];