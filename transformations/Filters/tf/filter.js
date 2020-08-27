"use strict";

export const name = 'Filter';
export const func = function({data, coefficients, n, method}) {
  if (!Array.isArray(coefficients)) {return null;}
  //Part 1: adjust the coefficients so that a and b are both arrays of same length
  let [b, a] = coefficients;
  if (typeof(a) === 'number') {
    //creates a vector with the same length as b where all values are equal
    //to 0, except the first value, which assumes the current value of a.
    //In other words: a = [a, 0, 0 ... 0]; fill with zeros until a.length === b.length
    a = Array(b.length).fill(a, 0, 1).fill(0, 1);
  }
  else if (a.length !== b.length) {
    //append the shorter vector with 0's so a.length === b.length
    let d = Math.abs(a.length - b.length);
    if (a.length < b.length) {a.concat(Array(d).fill(0));}
    else {b.concat(Array(d).fill(0));}
  }
  let size = a.length; //this value is the filter order + 1

  //Part 2: Normalizes the coeficients so that a[0] === 1
  if (a[0] !== 1) {
    if (a[0] === 0) return null;
    b = b.map(d => d / a[0]);
    a = a.map(d => d / a[0]);
  }

  //Part 3: apply filter with direct form II transposed implementation
  //for more information:
  //  https://www.mathworks.com/help/matlab/ref/filter.html
  //  http://matlab.izmiran.ru/help/techdoc/ref/filter.html
  const _2way = method === '2-way'; //if normal or 2-way method is used
  let input = data; //array containing the values of
  let out = []; //output array
  let y; //current sample value
  while (n--) { //repeats n times
    for (let k = 0; k < 2; k++) { //repeats twice if using 2-way method
      out = [];
      //Apply transfer function to first n points, can't use all last n
      //points because it would be accessing inexisting negative indexes.
      //So, considers missing points as 0's (the values are ignored)
      for (let i = 0; i < size; i++) {
        y = b[0] * input[i][1];
        for (let j = 1; j <= i; j++) {
          y += b[j] * input[i - j][1] - a[j] * out[i - j][1];
        }
        out.push([input[i][0], y]);
      }
      //Apply transfer function to rest of points, uses all last n points
      for (let i = size; i < input.length; i++) {
        y = b[0] * input[i][1];
        for (let j = 1; j < size; j++) {
          y += b[j] * input[i - j][1] - a[j] * out[i - j][1];
        }
        out.push([input[i][0], y]);
      }
      //repeats on reversed input if using method 2-way, breaks loop otherwise
      if (_2way) input = out.reverse();
      else {input = out; break;}
    }
  }
  return out;
}
export const tooltip = `Aplica um filtro com função de transferência dado pelos coeficientes do numerador e denominador. ` + 
'É implementado da forma direct form II transposed, similar a função filter no MATLAB';
export const args = [
  {
    name: 'coefficients', type: 'data',
    tooltip: 'Vetor dos coeficientes do numerador e denominador da função de transferência'
  },
  {
    name: 'n' , type: 'number', min: 1, value: 1, step: 1,
    tooltip: 'Número de vezes que o filtro será aplicado.'
  },
  {
    name: 'method', type: 'select',
    option: [
      {name: 'normal', tooltip: 'Filtro convencional. Aplica a função transferência no conjunto de entrada'},
      {name: '2-way', tooltip: 'Aplica a função transferência, inverte o resultado, aplica novamente e inverte o resultado'}
    ],
    tooltip: 'Método que o filtro será aplicado'
  }
];