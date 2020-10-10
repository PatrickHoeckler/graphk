# Creating Transformations
Transformations are Javascript files inside the *transformations* folder that are loaded automatically by the program when it starts. They can be used to define custom routines to manipulate and return data.\
All transformation files must be ECMAScript modules. There is no support for Node.js files for [security reasons](#security-measures).

The program use the keys defined inside a transformation file to interface with the user. The complete [reference](#reference) of keys will be shown next, later in this document you can find a simple [example](#simple-example).

## Reference
There are two options when creating a transformation file. The file can represent a [single transformation](#creating-a-single-transformation), or represent a [package](#creating-a-package) containing multiple transformations.

### Creating a Single Transformation
A transformation is simply an object with keys that define it's properties. To export these keys, you can do it one at a time like shown bellow:
```javascript
//export const keyName = keyValue;
export const name = 'example';
export const type = 'normal';
export const func = function() {return;}
```

Or you can also create a single object and destructure it in a single export.
```javascript
const transformObject = {
  //keyName: keyValue
  name: 'example',
  type: 'normal',
  func: function() {return;}
}
export {name, type, func} = transformObject
```

The complete reference of keys for a transformation is given bellow:
+ `name` String - The name of the transformation that is shown to the user inside the program.
+ `func` Function - The function that implements the transformation ([see details](#more-on-the-func-key)). The function is called with `func(argObj)`.
  + `argObj` Object - A single object where the keys are given by the `keyname` in the `args` array, and hold the value of the corresponding argument. The object will also have another key named `'data'` that holds the value for the data which the transformation was aplied (the `'data'` key is not present if the transformation has type `static`).
+ `tooltip` String (Optional) - Description to appear when user hovers over the transformation in the program.
+ `type` String (Optional) - The type of result produced by the transformation. Default is `normal`. Possible values are:
  + `normal` - Produces a sequence of points to be  plotted in a connected curve.
  + `scatter` - Produces a sequence of points to be  plotted scattered instead of connected.
  + `x-axis` - A number value that can be plotted as a vertical line on the x axis.
  + `y-axis` - A number value that can be plotted as a horizontal line on the y axis.
  + `no-plot` - A resulting value that should not be plotted. (Supports multiple outputs)
  + `static` - This transformation does not take any data as argument, that is, it's output depends only on the arguments given by the `args` key. The result can be anything, therefore it cannot be plotted. The `argObj` argument for `func` will not contain a key named `'data'` for this type of transformation. (Supports multiple outputs)
+ `input` String (Optional) - The type of value expected as the input to the transformation function, that is, the value that will be in the `data` key of the `argObj` given to `func`. Default is `points`. Possible values are:
  + `points` - An array of samples of (x, y) points, this samples are two element arrays. That is `[[x0, y0], [x1, y1], ..., [xn, yn]]`.
  + `number` - A single numbered value.
  + `any` - Any type of data.
+ `outputs` (Object | Object[]) (Optional) - Specify single or multiple outputs. Can only have multiple outputs if transformation `type` supports it. Default is an object with `name` set to `Output`, and `type` set to the expected output type for the transformation (`points` if the transformation can output multiple types). The valid keys are:
  + `name` String (Optional) - Name of the output. Default is `Output` if single, and `Output-{id}` if multiple outputs.
  + `type` String (Optional) - The type of the value at the output. Only affects arguments supporting multiple output types. Default is `points`. Possible values are:
    + `points` - See `input` key above.
    + `number` - See `input` key above.
    + `any` - See `input` key above.
+ `args` (Object | Object[]) (Optional) - Specify single or multiple arguments to the transformation. The valid keys are:
  + `name` String - The name for the argument that is shown to the user inside the program. Must be different from `'data'`.
  + `keyname` String (Optional) - The name to identify this argument in the `argObj` given to `func` when the transformation is called. Must be different from `'data'`. Defaults to the value of the `name` key.
  + `tooltip` String (Optional) - Description to show when user hovers over the argument in the program. 
  + `type` String (Optional) - Defines the type of argument and how it can be selected by the user. Default is `number`.
    + `number` - Argument is a Number. Creates a field for number input.
    + `select` - Argument is a String. Creates a drop-down menu with options given by the `option` key.
    + `checkbox` - Argument is a Boolean. Creates a checkbox to set the argument.
    + `data` - Argument can be anything. Creates a button that when clicked, allows the user to select some other data.
  + `option` (Object | Object[]) (Optional) - Only affects arguments of type `select` and must be defined if that is the case. Specify the options for the drop-down menu. The valid keys are:
    + `name` String - Defines the name of the option shown to the user, it is also the value of the argument if the option is selected.
    + `tooltip` String (Optional) - Description to show when the user hovers over the option.
  + `optional` Boolean (Optional) - Indicates wheter or not the argument can be left empty. Default is `false`.
  + `max` Number (Optional) - Only affects arguments of type `number`. Defines the maximum value allowed for the number. If ommited, no maximum value will be considered.
  + `min` Number (Optional) - Only affects arguments of type `number`. Defines the minimum value allowed for the number.  If ommited, no minimum value will be considered.
  + `step` Number (Optional) - Only affects arguments of type `number`. Defines the granularity allowed for the number. If ommited, no step value will be considered.
  + `value` any (Optional) - Initial value for the argument, must agree with the argument type given by the `type` key. Must also follow the restrictions bellow:
    + If `type` is `number`, must be in the interval given by `min` and `max`.
    + If `type` is `select`, must be one of the values for the drop-down menu given by the `option` key.
+ `checkArgs` Function (Optional) - Function called with `checkArgs(argsValue)` when the user confirms the values given to the arguments. If this function returns nothing the arguments are accepted, else this function must return a String with a message to be shown to the user as a prompt to correct the values.
  + `argsValue` any[] - Array with the values for the arguments, in the same order as given by the `args` key.

### Creating a Package
The process to create a package is very similar from that of creating a single transformation. It is only needed to export two keys to describe the package.
+ `name` String - The name of the package to be shown to the user. This is the same key used to name a single transformation.
+ `pkg` Object[] - An array where each element is an object defining a single transformation. The objects follow the same [pattern](#creating-a-single-transformation) used to describe a single transformation.

As an example, here are the exports needed to define a simple package containing only two transformations.
```javascript
export const name = 'Example';
export const pkg = [
  //Transformation 1
  {
    name: 'Transform1',
    func: function() {return;}
  },

  //Transformation 2
  {
    name: 'Transform2',
    func: function() {return;}
  }
];
```

### More on the `func` key
All other keys are used to describe how to display and interface with the transformation, the `func` key is what holds the actual function to implement it.

#### Function Arguments
As described in the [reference](#creating-a-single-transformation) above, this function will be called with `func(argObj)`, where `argObj` is an object that holds the keys representing the arguments for the transformation and an extra `data` key to hold the input data (the `data` key will only be absent for transformations of type `static`, since they don't have inputs besides the arguments).\
Suppose you want to implement a transformation that takes two arguments, a constant number to be used in some way, and a string to set some option. You could export this arguments as such:
```javascript
export const args = [
  {name: 'Constant', type: 'number', keyname: 'alpha'},
  {
    name: 'Use option', type: 'select', keyname: 'opt',
    option: [
      {name: 'Option A'},
      {name: 'Option B'},
      {name: 'Option C'}
    ]
  }
]
```

Supose now that the transformation is of type `normal` (that means the `argObj` will include a `data` key). You could export the function as such:
```javascript
// Using the keys indirectly through the argObj
export const func = function(argObj) {
  const data = argObj.data;
  const alpha = argObj.alpha;
  if (argObj.opt === 'Option A') {
    //...do some stuff...
  }
  //...do other stuff...
}

// Destructuring the argObj inside the function
export const func = function(argObj) {
  const {data, alpha, opt} = argObj;
  if (opt === 'Option A') {
    //...do some stuff...
  }
  //...do other stuff...
}

// Destructuring directly in the function declaration
export const func = function({data, alpha, opt}) {
  if (opt === 'Option A') {
    //...do some stuff...
  }
  //...do other stuff...
}
```

Any of the three methods above will work and depend mostly on programmer preference.\
Notice how in the cases above we called the arguments using the name given by their `keyname` keys. If we hadn't set one, we would need to use the name given by the `name` key.

:warning: *You should not modify the values of the `data` key since it is not a copy of the original, modifying this value will also change the original and cause loss of data.*

#### Return Value
The function must return a value as the result of the transformation. If it returns `null`, then it will be considered that the function failed to calculate it's result.\
It is important that the returned value be in accord with the type of value given by the key `type`, or the key `outputs` for the cases where it applies. If you have multiple outputs, then you should return them in a sequence as an array. For example:
```javascript
export const type = 'no-plot';
export const outputs = [
  {name: 'Output A', type: 'points'},
  {name: 'Output B', type: 'number'},
  {name: 'Output C', type: 'any'}
]

export const func = function(argObj) {
  //...do some stuff...

  return [
    [[0, 0], [1, 2], [2, 4]], //Output A
    42,                       //Output B
    'I am the third output'   //Output C
  ]
}
```

## Simple Example
In this example it is shown how to create a transformation to scale one of the axis by some given ammount. For this transformation we want to set the following keys:
+ `name` - Scale Axis
+ `tooltip` - Scale a given axis by a given ammount
+ `type` - reflects the type of data given (`'normal'`)
+ `args` - arguments to the function (axis, ammount)
+ `func` - function to scale data.

For the first three keys we can export them as follows:
```js
export const name = 'Scale Axis';
export const tooltip = 'Scale a given axis by a given ammount';
export const type = 'normal'; // can be ommited (default value)
```

For the `args` key, we need to define an array containing two elements, one for each argument. The arguments will have a `name` that will be shown to the final user, a variable name (`keyvalue`), and a `tooltip` to describe the argument to the user.\
Besides that, the argument for the axis will be a drop-down menu, that can be expanded to allow the user to select the desired option. And the ammount to scale must be a number.
```javascript
export args = [
  {
    name: 'Axis', //name to appear to the user
    keyname: 'axis', //variable name
    tooltip: 'The axis to apply scaling',
    type: 'select', //drop-down argument
    option: [ //options for the drop-down
      'x-axis',
      'y-axis',
      'both'
    ]
  },
  {
    name: 'ammount',
    /*The keyname is optional, if not given, it's value will be the same as given by the name key*/
    //keyname: 'scale',
    tooltip: 'Scale ammount',
    type: 'number', //can be ommited (default value)
    value: 2 //initial value (optional)
    //min: 0,  //minimun value (optional)
    //max: 10  //maximum value (optional)
  }
]
```

All that remains now is to implement the function to scale the data.\
Remember that the `func` key defines a function that receives a single argument, an object whose keys are given by the `keyname` of the arguments (or the `name`, if `keyname` is absent), and an extra key `data` for the data given to the function.
```javascript
//A simple implementation of this function
export func = function({data, axis, ammount}) {
  const out = []; //Don't modify the original data array
  const n = data.length;
  const xAxis = axis !== 'y-axis'; //'x-axis' || 'both'
  const yAxis = axis !== 'x-axis'; //'y-axis' || 'both'
  for (let i = 0; i < n; i++) {
    //data is an array of Array(2) containing [x, y] of one sample
    let [x, y] = data[i];
    if (xAxis) {x = ammount * x;}
    if (yAxis) {y = ammount * y;}
    out.push(x, y);
  }
  return out;
}
``` 
This is enough to create this transformation. To have it loaded inside the program, all is needed is to combine the three blocks of code above into a single .js file and place it inside the *transformations* folder.

## Security Measures
Since transformation files contain arbitrary code that can be created by malicious individuals, there are restrictions on what this code can execute.\
First, all files must be ECMAScript modules according to the standard, no Node.js modules can be imported or exported. This is to protect the user against the powerful API's found in node modules (e.g. acessing and modifying the user files).

Besides that, there are other functions that also cannot be used. If any of these is called when the transformation is run, then the user will be warned of the potential risk, and any changes made will be discarded. The following functions are blocked for use inside transformations:
+ Any function to manipulate the DOM
+ `setTimeout`
+ `clearTimeout`
+ `setInterval`
+ `clearInterval`
+ `alert`