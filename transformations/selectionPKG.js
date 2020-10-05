"use strict";

export const pkgName = 'Selection';
export const pkg = [
  { //Interval
    name: 'Interval',
    tooltip: `Seleciona todos os pontos dentro do intervalo [low, high]`,
    args: [
      {
        name: 'low', type: 'number', optional: true,
        tooltip: 'Limite inferior do intervalo. Caso não seja passado um ' + 
        'valor, não será considerado um limite inferior'
      },
      {
        name: 'high', type: 'number', optional: true,
        tooltip: 'Limite superior do intervalo. Caso não seja passado um ' + 
        'valor, não será considerado um limite superior'
      },
      {
        name: 'axis', type: 'select',
        option: [{name: 'x-axis'}, {name: 'y-axis'}],
        tooltip: 'Eixo para considerar o intervalo'
      }
    ],
    func: function({data, low, high, axis}) {
      return selectDataInRange(data, low, high, axis === 'y-axis');
    }
  },
];

/**
 * Select all the points that are in the closed interval [low, high].
 * @param {Array[2][]} data - data to select
 * @param {Number} [low] - lower bound to data. If not given, there will be
 * no lower bound
 * @param {Number} [high] - higher bound to data. If not given, there will be
 * no higher bound
 * @param {Boolean} [yAxis = false] - if the selection is to be made considering
 * the interval in the y-axis
 * @return a shallow copy of the selected data
 */
function selectDataInRange(data, low, high, yAxis = false) {
  const id = 0 + yAxis;
  let selection = [];
  for (let i = 0, n = data.length; i < n; i++) {
    let value = data[i][id];
    if (high < value || value < low) {continue;}
    selection.push(data[i]);
  }
  return selection;
}