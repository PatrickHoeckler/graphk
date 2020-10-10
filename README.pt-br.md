# GraphK
:memo: Ler em outra língua: [English](README.md), [Português](README.pt-br.md)\
:warning: *Ainda em fase de desenvolvimento, bugs podem estar presentes e funcionalidades podem ser alteradas no futuro.*

Esse programa serve para visualização e manipulação de dados no formato de conjuntos de pontos (x, y). O foco do programa é facilitar o trabalho com dados provenientes de sinais de EMG (*Eletromiografia*), entretanto qualquer com o formato correto é aceito.

Os dados carregados podem ser manipulados via [transformações](#transformações), que são arquivos que podem ser criados por qualquer um e importados automaticamente pelo programa. Já existem algumas transformações básicas que acompanham o programa, funções como: escalar/deslocar eixos, calcular média/RMS, retificação, filtros, integração e outros.

## Utilizando o programa
Para executar este programa é preciso instalar o aplicativo [Node.js](https://nodejs.org/).\
Clone/Download este repositório, abra uma interpretador de comandos (*cmd*, *shell*, ...) na pasta do repositório e digite o seguinte comando:
```sh
npm update
```
No caso de erro, cheque se o Node.js foi instalado corretamente, que o interpretador de comandos esteja focado no diretório correto e que o diretório não seja somente leitura. O comando acima precisa ser executado apenas uma vez.

Para rodar o programa, execute o seguinte comando no interpretador:
```sh
npm start
```

## Tipos de arquivo
Esse programa pode carregar/salvar arquivos de diferentes tipos, os formatos suportados até agora são:
- [csv, txt](#csv-txt)
- [JSON](#JSON)

### csv, txt
Esse tipo de arquivo deve conter o conjunto de pontos (x, y) no formato csv (*Comma Separated Values*), ou seja, uma tabela aonde as linhas e colunas são divididas por uma quebra de linha e um \<separador\> respectivamente.\
O \<separador\> normalmente é um dos seguintes caracteres: `,`, `|`, `SPACE`, `TAB`. Entretanto qualquer caractere diferente de `A-Z a-z 0-9 . - +` é aceito como separador. O separador é inferido pelo programa quando o arquivo é aberto.\
Um arquivo nesse formato deve conter:
- Uma primeira linha de cabeçalho com o nome das colunas (opcional):
```
header_1, header_2, header_3, ... , header_n
```
- Linhas com números indicando os valores dos pontos:
```
0.0, 0.0, 0.0, ... , 0.0
0.1, 0.2, 0.3, ... , 0.4
 ⋮     ⋮    ⋮           ⋮
0.5, 0.6, 0.7, ... , 0.8
```
Arquivos com apenas uma coluna serão carregados no programa com o nome dado pelo cabeçalho (nome do arquivo se cabeçalho ausente) e os números lidos serão atribuídos para o eixo y enquanto o eixo x será preenchido com inteiros a partir de 0.\
Arquivos com duas colunas são o padrão esperado, o cabeçalho é ignorado, e os valores das colunas indicarão o eixo x e y respectivamente.\
Arquivos com n colunas serão carregados como n arquivos diferentes, nomeados pelo cabeçalho (nome do arquivo seguido do número da coluna se cabeçalho ausente). Os valores das colunas serão atribuídos ao eixo y de cada uma delas, com o eixo x preenchido com inteiros a partir de 0.\
Arquivos salvos no formato csv possuem apenas duas colunas indicando os eixos x e y respectivamente, e não possuem cabeçalho.

### JSON
Esse tipo de arquivo é uma opção para salvar os dados com o intuito de serem reabertos pelo programa no futuro. Esse tipo de arquivo mantém informação adicional sobre os dados para garantir que eles sejam reabertos da mesma maneira como foram salvos, também permite salvar/carregar diferentes conjuntos de dados (não uma sequência de pontos).

## Transformações
Transformações são módulos Javascript conforme o padrão ECMAScript (por motivos de segurança, módulos Node.js não podem ser usados). O programa carrega todas as transformações dentro da pasta *transformations* automaticamente ao ser iniciado, e estas podem ser utilizadas como qualquer outra a partir daí.\
A ideia das transformações é permitir a expansão das funcionalidades do programa, assim é possível o usuário criar rotinas customizáveis e ter elas rodando normalmente no programa. Esses arquivos também podem ser compartilhados para outros usuários, funciona da mesma forma que um plugin.

Para entender como programar seus próprios arquivos de transformações, cheque o [guia](docs/pt-br/transformations.md).