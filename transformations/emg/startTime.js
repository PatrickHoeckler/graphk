"use strict";

export const name = 'Start time';
export const func = function({data, noise, k, t0, method}) {
  if (!Array.isArray(noise)) {return null;}
  const useSD = method === 'Standard Deviation';
  //calculates the noise mean
  let mean = noise.reduce((acc, d) => acc + d[1], 0) / noise.length;
  //limit of difference between data and mean, returns the first point
  //that exceeds this limit
  let lim;
  if (useSD) { //calculates the limit based on the standard deviation
    //calculates the noise standard deviation (sd)
    let sd = noise.reduce((acc, d) => {
      let t = d[1] - mean;
      return acc + t * t;
    }, 0) / noise.length;
    sd = Math.sqrt(sd);
    lim  = k * sd;
  }
  else {lim = k;} //the limit will be k units away from the mean
  
  let i0; //starting index of data
  //if a starting time was given, calculates the first index that contains
  //a point in a time greater than t0
  if (t0) {
    i0 = data.findIndex((d) => d[0] > t0);
    if (i0 === -1) {return null;}
  }
  else {i0 = 0;} //will start at the first (no point will be ignored)
  //return the first point on data which exceeds the limit with the noise average
  for (let i = i0; i < data.length; i++) {
    let dif = Math.abs(mean - data[i][1]);
    if (dif > lim) {return data[i][0];}
  }
  return null;
}
export const type = 'x-axis';
export const tooltip = 'A partir de um sinal de ruído,';
export const args = [
  {name: 'noise', type: 'data', tooltip: 'Curva de ruído'},
  {
    name: 'k', type: 'number', value: 3, min: 0,
    tooltip: 'Valor usado para calcular o desvio máximo - ' +
      'é usado diferente dependendo do método utilizado.'
  },
  {
    name: 't0', type: 'number', optional: true,
    tooltip: 'Considerar apenas pontos a partir do tempo t0. ' +
      'Checa todos os pontos caso nenhum valor seja passado'
  },
  {
    name: 'method', type: 'select',
    option: [
      {name: 'Standard Deviation', tooltip: 'Calcula o desvio padrão do ' + 
        'ruído e retorna o primeiro ponto com um desvio k vezes maior'},
      {name: 'Average', tooltip: 'Calcula a média do ruído e retorna o ' +
        'primeiro ponto que está a uma distância k da média'}
    ],
    tooltip: 'Método para detectar o início'
  }
]