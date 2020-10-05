# Criando Transformações
Transformações são arquivos Javascript dentro da pasta *transformations* que são carregados automaticamente pelo programa quando ele inicia. Elas podem ser usadas para definir rotinas personalizadas para manipular e retornar dados.\
Todos os arquivos de transformações devem ser módulos ECMAScript. Não há suporte para arquivos Node.js por [motivos de segurança](#medidas-de-segurança).

O programa usa as chaves definidas dentro do arquivo de transformação para fazer uma interface com o usuário. A [referência](#referência) completa das chaves será mostrada a seguir, depois neste documento você poderá encontrar um [exemplo](#exemplo-simples) simples.

## Referência
Existem duas maneitas de criar um arquivo de transformação. O arquivo pode representar uma [única transformação](#criando-única-transformação), ou representar um [pacote](#criando-um-pacote) contendo múltiplas transformações.

### Criando Única Transformação
Uma transformação é simplesmente um objeto com chaves que definem suas propriedades. Para exportar essas chaves, você pode fazer uma por vez como mostrado abaixo:
```javascript
//export const nomeChave = valorChave;
export const name = 'exemplo';
export const type = 'normal';
export const func = function() {return;}
```

Ou você pode também criar um único objeto e desestruturá-lo em um único export.
```javascript
const transformObject = {
  //nomeChave: valorChave
  name: 'exemplo',
  type: 'normal',
  func: function() {return;}
}
export {name, type, func} = transformObject
```

A referência completa de chaves para uma transformação é dada abaixo:
+ `name` String - O nome da transformação que é mostrado ao usuário dentro do programa.
+ `tooltip` String (Opcional) - Descrição para aparecer quando o usuário mover o mouse sobre a transformação no programa.
+ `type` String (Opcional) - O tipo de dado produzido pela transformação. Valor padrão `normal`. Valores possível são:
  + `normal` - Reflete o tipo do dado de entrada.
  + `scatter` - Produz uma sequência de pontos que devem ser plotados como pontos separados ao invés de conectados.
  + `x-axis` - Um valor numérico que pode ser plotado verticalmente no eixo x.
  + `y-axis` - Um valor numérico que pode ser plotado horizontalmente no eixo y.
  + `no-plot` - Um valor resultante que não pode ser plotado.
  + `static` - Essa transformação não recebe nenhum dado como argumento, ou seja, seu valor de saída depende somento nos argumentos dados pela chave `args`. O resultado pode ser qualquer coisa, sendo assim não pode ser plotado. O argumento `argObj` da função `func` não irá conter uma chave nomeada `'data'` para este tipo de transformação.
+ `func` Function - A função que implementa a transformação. Deve retornar um valor como resultado da transformação. Se retornar `null`, será considerado que a função falhou para calcular o valor. A função é chamada com `func(argObj)`.
  + `argObj` Object - Um único objeto onde as chaves são dadas por `keyname` no array `args`, essas chaves armazenam o valor do argumento correspondente. O objeto terá também outra chave nomeada `'data'`  que armazena o valor dos dados aos quais a transformação foi aplicada (a chave `'data'` não é presente se a transformação é do tipo `static`).
+ `args` Object[] (Opcional) - Um array onde cada elemento é um objeto definindo um argumento da transformação, as chaves do objeto de um argumento são dadas abaixo.
  + `name` String - O nome para o argumento que é mostrado ao usuário dentro do programa. Deve ser diferente de `'data'`.
  + `keyname` String (Opcional) - O nome para identificar esse argumento no objeto `argObj` passado para `func` quando a transformação é chamada. Deve ser diferente de `'data'`. Valor padrão é o mesmo que o da chave `name`.
  + `tooltip` String (Opcional) - Descrição para ser mostrada quando o usuário mover o mouse sobre o argumento no programa.
  + `type` String (Opcional) - Define o tipo de argumento e como ele pode ser selecionado pelo usuário. Valor padrão `number`.
    + `number` - Argumento é um *Number*. Cria um campo para entrada de valores numéricos. 
    + `select` - Argumento é uma *String*. Cria um menu *drop-down* com opções dadas pela chave `option`.
    + `checkbox` - Argumento é *Boolean*. Cria uma caixa de verificação para definir o valor.
    + `data` - Argumento pode ser qualquer coisa. Cria um botão que quando clicado, permite ao usuário selecionar algum outro dado.
  + `option` Object[] (Opcional) - Afeta apenas argumentos de tipo `select` e deve ser definido se esse for o caso. Um array de objetos definindo as opções para o menu *drop-down*.
    + `name` String - Define o nome da opção mostrada ao usuário, é também o valor do argumento se a opção for selecionada.
    + `tooltip` String (Opcional) - Descrição para mostrar quando o usuário mover o mouse sobre a opção.
  + `optional` Boolean (Opcional) - Indica se o argumento pode ser deixado em branco.
  + `value` any (Opcional) - Valor inicial para o argumento, deve concordar com o tipo de argumento dado pela chave `type`.
  + `max` Number (Opcional) - Afeta apenas argumentos do tipo `number`. Define o valor máximo permitido para o número.
  + `min` Number (Opcional) - Afeta apenas argumentos do tipo `number`. Define o valor mínimo permitido para o número.
  + `step` Number (Opcional) - Afeta apenas argumentos do tipo `number`. Define o valor de intervalo permitido para o número.
+ `checkArgs` Function (Opcional) - Função chamada com `checkArgs(argsValue)` quando o usuário confirma os valores dados aos argumentos. Se essa função não retornar nada os argumentos são aceitos, senão essa função deve retornar uma *String* com uma mensagem para ser mostrada ao usuário para ele corrigir os valores.
  + `argsValue` any[] - Array com os valores para os argumentos, na mesma ordem dada pela chave `args`.

### Criando um Pacote
O processo para criar um pacote é muito similar àquele de criar uma única transformação. Só é preciso exportar duas chaves para descrever o pacote.
+ `pkgName` String - O nome do pacote para ser mostrado ao usuário.
+ `pkg` Object[] - Um array onde cada elemento é um objeto definindo uma única transformação. Os objetos seguem o mesmo [padrão](#criando-única-transformação) usado para descrever uma única transformação.

Como um exemplo, aqui estão os *exports* necessários para definir um simples pacote contendo apenas duas transformações.
```javascript
export const pkgName = 'Exemplo';
export const pkg = [
  //Transformacao 1
  {
    name: 'Transform1',
    func: function() {return;}
  },

  //Transformacao 2
  {
    name: 'Transform2',
    func: function() {return;}
  }
];
```

## Exemplo Simples
Nesse exemplo é mostrado como criar uma transformação para escalar um dos eixos por um dado valor. Para esta transformação, é desejado definir as seguintes chaves:
+ `name` - Escalar Eixos
+ `tooltip` - Escala um eixo por um dado valor.
+ `type` - reflete o tipo do dado que será escalado (`'normal'`).
+ `args` - argumentos para a função (eixo, escala)
+ `func` - função para escalar o dado.

Para as três primeiras chaves podemos exportá-las dessa maneira:
```js
export const name = 'Escalar Eixos';
export const tooltip = 'Escala um eixo por um dado valor';
export const type = 'normal'; // pode ser omitido (valor padrão)
```

Para a chave `args`, é preciso definir um array contendo dois elementos, um para cada argumento. Os argumentos terão um nome (`name`), um nome de chave (`keyvalue`), e um `tooltip` para descrever o argumento para o usuário.\
Além disso, o argumento para o eixo será um menu *drop-down*, que pode ser expandido para permitir o usuário escolher a opção desejada. E o valor de escala deve ser um número.
```javascript
export args = [
  {
    name: 'Eixo', //nome que aparecera ao usuario
    keyname: 'axis', //nome da chave/variavel
    tooltip: 'Eixo pra ser escalado',
    type: 'select', //menu de drop-down
    option: [ //opcoes para o menu drop-down
      'eixo-x',
      'eixo-y',
      'ambos'
    ]
  },
  {
    name: 'escala',
    /*keyname é opcional, se não for dado, seu valor será o mesmo que o dado pela chave name*/
    //keyname: 'scale',
    tooltip: 'Valor para escalar eixo',
    type: 'number', //pode ser omitido (valor padrão)
    value: 2 //valor inicial (opcional)
    //min: 0,  //valor minimo (opcional)
    //max: 10  //valor maximo (opcional)
  }
]
```

Tudo que resta agora é implementar a função para escalar os dados.\
Lembrando que a chave `func` define a função que recebe um único argumento, um objeto cujas chaves são dadas pelo `keyname` dos argumentos (ou `name`, se `keyname` não for presente), e uma chave extra `data` para os dados que a função deve manipular.
```javascript
//Uma implementação simples dessa função
export func = function({data, axis, escala}) {
  const out = []; //Não modificar o array de dados original
  const n = data.length;
  const xAxis = axis !== 'eixo-y'; //'eixo-x' || 'ambos'
  const yAxis = axis !== 'eixo-x'; //'eixo-y' || 'ambos'
  for (let i = 0; i < n; i++) {
    //data é um array de Array(2) contendo [x, y] de uma amostra
    let [x, y] = data[i];
    if (xAxis) {x = escala * x;}
    if (yAxis) {y = escala * y;}
    out.push(x, y);
  }
  return out;
}
```
Isso é o suficiente para criar essa transformação. Para carregá-la dentro do programa, só é preciso combinar os três blocos de código acima em um único arquivo .js e colocá-lo dentro da pasta *transformations*.

## Medidas de Segurança
Já que arquivos de transformação contém código arbitrário que pode ser criado por indivíduos maliciosos, existem restrições sobre o que esse código pode executar.\
Primeiro, todos os arquivos devem ser módulos de acordo com o padrão ECMAScript, nenhum módulo do Node.js pode ser importado ou exportado. Isso serve para proteger o usuário contra as poderosas API's encontradas nesses módulos (ex: acessar e modificar os arquivos do usuário).

Além disso, existem outras funções que não podem ser usadas. Se qualquer uma destas for chamada quando uma transformação for executada, então o usuário será alertado do risco, e qualquer mudanças feitas serão descartadas. As seguintes funções tem uso bloqueado dentro de transformações:
+ Qualquer função para manipular a DOM
+ `setTimeout`
+ `clearTimeout` 
+ `setInterval` 
+ `clearInterval` 
+ `alert` 