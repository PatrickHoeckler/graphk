"use strict";

export const name = 'Linear';
export const pkg = [
  //FINDMAX
  {
    name: 'FindMax',
    func: ({data}) => data.reduce((max, sample) => sample[1] > max ? sample[1] : max, data[0][1]),
    tooltip: `Encontra o valor máximo do sinal`,
  },

  //AMPLIFY
  {
    name: 'Amplify',
    func: ({data, gain}) => data.map((sample) => [sample[0], gain * sample[1]]),
    tooltip: `Amplifica o sinal por um valor constante`,
    args: [
      {
        name: 'gain', type: 'number', value: 1,
        tooltip: 'Ganho usado na amplificação'
      }
    ]
  },

  //AVERAGE
  {
    name: 'Average',
    func: ({data}) => data.reduce((acc, d) => acc + d[1], 0) / data.length,
    tooltip: 'Calcula o valor médio do sinal'
  },

  //RMS
  {
    name: 'RMS',
    func: function({data}) {
      let n = data.length;
      return Math.sqrt(data.reduce((acum, d) => acum + (d[1] * d[1]) / n, 0));
    },
    tooltip: 'Calcula o valor RMS do sinal'
  },

  //OFFSET
  {
    name: 'Offset',
    func: function({data, offset}) {
      if (offset === undefined) {
        offset = (-1) * data.reduce((acc, d) => acc + d[1], 0) / data.length;
      }
      return data.map((sample) => [sample[0], sample[1] + offset]);
    },
    tooltip: `Desloca os valores no eixo y para que a média desses valores seja igual a um valor de centro`,
    args: [
      {
        name: 'offset', type: 'number', optional: true,
        tooltip: 'Deslocamento no eixo y dos valores. Se um valor não for passado,\n' + 
        'será calculado um offset de modo a centralizar a média do sinal em y = 0'
      }
    ]
  },

  //RECTIFY
  {
    name: 'Rectify',
    func: ({data}) => data.map(
      (sample) => [sample[0], sample[1] < 0 ? -sample[1] : sample[1]]
    ),
    tooltip: `Retifica o sinal, ou seja, retorna o valor absoluto do sinal`
  },

  //SHIFT
  {
    name: 'Shift',
    func: ({data, shift}) => data.map((sample) => [sample[0] + shift, sample[1]]),
    tooltip: `Desloca os valores no eixo x por um valor escolhido`,
    args: [
      {
        name: 'shift', type: 'number', value: 0,
        tooltip: 'Valor que será somado ao eixo x'
      }
    ]
  },

  //STRETCH
  {
    name: 'Stretch',
    func: ({data, stretch}) => data.map((sample) => [stretch * sample[0], sample[1]]),
    tooltip: `Multiplica os valores do eixo x por uma constante`,
    args: [
      {
        name: 'stretch', type: 'number', value: 1,
        tooltip: 'Constante que multiplicará os valores do eixo x'}
    ]
  },

  //INTTRAP
  {
    name: 'IntTrap',
    type: 'no-plot',
    tooltip: `Calcula a integral definida dentro de um intervalo do sinal utilizando o método do trapézio`,
    args: [
      {
        name: 't0', optional: true, type: 'number',
        tooltip: 'Início do intervalo de integração. Valor padrão: primeiro ponto do sinal'
      },
      {
        name: 't1', optional: true, type: 'number',
        tooltip: 'Fim do intervalo de integração. Valor padrão: último ponto do sinal'
      },
      {
        name: 'dt', optional: true, type: 'number', min: 0,
        tooltip: 'Intervalo entre amostras.\n' + 
        'Se for passado o valor 0, será calculado o intervalo para cada um dos pontos. ' +
        'Utilize isso apenas se a frequência de amostragem não for constante.\n' +
        'Se nenhum valor for passado, será usado o intervalo entre os dois primeiros pontos. ' +
        'Este deve funcionar na maioria dos casos. É mais rápido e serve quando a frequência de amostragem é constante.'
      }
    ],
    func: function({data, t0, t1, dt}) {
      //finds the start and ending indexes
      let iStart = 0;
      let iEnd = data.length;
      if (t0 !== undefined) {
        for (let i = 0; i < data.length; i++) {
          if (t0 <= data[i][0]) {iStart = i; break;}
        }
      }
      if (t1 !== undefined) {
        for (let i = iStart; i < data.length; i++) {
          if (t1 <= data[i][0]) {iEnd = i; break;}
        }
      }
      //in this case, will calculate the interval between every point
      let integral = 0;
      if (dt === 0) {
        for (let i = iStart + 1; i < iEnd; i++) {
          integral += (data[i][0] - data[i - 1][0]) * (data[i][1] + data[i - 1][1]);
        }
      }
      //in this case, will use the same value of dt for all calculations
      else {
        if (dt === undefined) {dt = Math.abs(data[1][0] - data[0][0]);}
        for (let i = iStart + 1; i < iEnd; i++) {
          integral += dt * (data[i][1] + data[i - 1][1]);
        }
      }
      integral /= 2;
      return integral;
    }
  }
];