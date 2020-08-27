"use strict";

export const pkgName = 'Sampling';
export const pkg = [
  { //DOWNSAMPLE
    name: 'Downsample',
    tooltip: `Reduz a taxa de amostragem por um fator inteiro n.` +
      'Seleciona a primeira amostra e todas as n-ésimas amostra após esta.',
    args: [
      {
        name: 'n', type: 'number', value: 2, min: 2, step: 1,
        tooltip: 'Fator inteiro de redução de amostras'
      }
    ],
    func: ({data, n}) => downsample(data, n)
  },
  { //UPSAMPLE
    name: 'Upsample',
    tooltip: 'Aumenta a taxa de amostragem por um fator inteiro n.' + 
      'Insere n - 1 zeros (no eixo y) entre cada amostra. Para o eixo x, ' +
      'interpola linearmente o valor dos pontos considerando uma diferença ' +
      'constante dt entre cada amostra nesse eixo.',
    args: [
      {
        name: 'n', type: 'number', value: 2, min: 2, step: 1,
        tooltip: 'Fator inteiro de aumento de amostras'
      },
      {
        name: 'dt', type: 'number', value: 1, min: 0, optional: true,
        tooltip: 'Intervalo entre cada amostra no eixo x. Se um valor não ' +
          'for dado, o intervalo entre as duas primeiras amostras será calculado.'
      }
    ],
    func: ({data, n, dt}) => upsample(data, n, dt)
  },
  { //ADJUST SAMPLING
    name: 'Adjust Sampling',
    tooltip: 'Aumenta/Reduz a taxa de amostragem por um fator inteiro a fim ' + 
      'de obter uma frequência de amostragem igual ou próxima a frequência ' +
      'passada como parâmetro. O fator será escolhido para que a frequência ' +
      'de amostragem seja sempre maior ou igual a frequência desejada e ' + 
      'nunca menor.',
    args: [
      {
        name: 'frequency', type: 'number', min: 0, value: 1,
        tooltip: 'Sampling frequency desired for the data'
      }
    ],
    func: function({data, frequency}) {
      const dataInterval = Math.abs(data[data.length - 1][0] - data[0][0]);
      const curSampleF = data.length / dataInterval;
      if (frequency < curSampleF) {
        return downsample(data, Math.floor(curSampleF / frequency));
      }
      else {
        return upsample(data, Math.ceil(frequency / curSampleF));
      }
    }
  }
];

/**
 * Upsamples signal by an integer factor. Puts n - 1 samples between each data
 * sample, the samples added are a pair of points [x, 0], where x is linear
 * interpolated between the data samples considering a constant interval
 * between each sample of dt.
 * @param {Array[2][]} data - Array of data samples
 * @param {Number} n - Integer factor for downsample
 * @param {Number} [dt] - Interval between the x values of each data sample.
 * If no value is given, calculates the interval between the first two samples.
 * @return an array containing the upsampled signal
 */
function upsample(data, n, dt) {
  n = Math.round(n);
  if (!dt) {dt = data[1][0] - data[0][0];}
  let out = [];
  let x;
  dt /= n;
  n--;
  for (let i = 0, len = data.length; i < len; i++) {
    out.push(data[i]);
    x = data[i][0];
    for (let j = 0; j < n; j++) {out.push([x += dt, 0]);}
  }
  return out;
}

/**
 * Downsamples signal by an integer factor. Samples the first element and
 * every nth element after that.
 * @param {Array[2][]} data - Array of data samples
 * @param {Number} n - Integer factor for downsample
 * @return an array containing the downsampled signal
 */
function downsample(data, n) {
  n = Math.round(n);
  let out = [];
  for (let i = 0, len = data.length; i < len; i += n) {out.push(data[i]);}
  return out;
}