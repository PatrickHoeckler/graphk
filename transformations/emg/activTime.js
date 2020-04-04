"use strict";

exports.name = 'Activation time';
exports.tooltip = 'Compara o sinal a um limiar e calcula o total do tempo em que esse sinal ultrapassou o limiar';
exports.func = function(data, {lim, comparison, method}) {
  const useHigher = comparison === 'Higher';
  const useAbs = method === 'Absolute';
  if (useAbs) {lim = Math.abs(lim);}
  var exceedCount = 0; //number of times that the signal exceeds lim
  data.forEach(sample => {
    let y = useAbs ? Math.abs(sample[1]) : sample[1];
    if (useHigher === y > lim) {exceedCount++;}
  });
  if (exceedCount === data.length) {exceedCount--;}
  //scales the exceedCount by the sampling time dt to get the total activation time
  var dt = Math.abs(data[1][0] - data[0][0]);
  return exceedCount * dt;
}
exports.type = 'no-plot';
exports.args = [
  {
    name: 'lim',
    type: 'number',
    tooltip: 'Limiar de ativação, esse valor é comparado com todo o sinal.\n' + 
    'Utilizará o valor absoluto se o método "Absolute" estiver sendo usado'
  },
  {
    name: 'comparison',
    tooltip: 'Que operação será usada para comparar os valores com o limiar',
    type: 'select',
    option: [
      {name: 'Higher', tooltip: 'Considera pontos maiores que o limiar'},
      {name: 'Less or equal', tooltip: 'Considera pontos menores ou iguais ao limiar'}
    ]
  },
  {
    name: 'method',
    type: 'select',
    option: [
      {name: 'Absolute', tooltip: 'Ignora o sinal dos valores, ou seja, utiliza os valores absolutos'},
      {name: 'Value', tooltip: 'Considera o valor real dos dados, ou seja, diferencia entre positivos e negativos'}
    ]
  }
]