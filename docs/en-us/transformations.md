# Creating Transformations
Transformations are Javascript files inside the *transformations* folder that are loaded automatically by the program when it starts. They can be used to define custom routines to manipulate and return data.\
All transformation files must be ECMAScript modules. There is no support for Node.js files for [security reasons](#security-measures).

The program use the keys defined inside a transformation file to interface with the user. The complete [reference](#reference) of keys will be shown next, later in this document you can find a simple [example](#simple-example).

## Reference
There are two options when creating a transformation file. The file can represent a [single transformation](#creating-a-single-transformation), or represent a [package](#creating-a-package) containing multiple transformation.

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
+ `tooltip` String (Optional) - Description to appear when user hovers over the transformation in the program.
+ `type` String (Optional) - The type of data produced by the transformation. Default is `normal`. Possible values are:
  + `normal` - Reflects the type from the input data.
  + `scatter` - Produces a sequence of points to be  plotted scattered instead of connected.
  + `x-axis` - A number value that can be plotted as a vertical line on the x axis.
  + `y-axis` - A number value that can be plotted as a horizontal line on the y axis.
  + `no-plot` - A resulting value that cannot be plotted.
  + `static` - This transformation does not take any data as argument, that is, it's output depends only on the arguments given by the `args` key. The result can be anything, therefore it cannot be plotted. The `argObj` argument for `func` will not contain a key named `'data'` for this type of transformation.
+ `func` Function - The function that implements the transformation. Must return a value as the result of the transformation. If returns `null`, it will be considered that the function failed to calculate the value. The function is called with `func(argObj)`.
  + `argObj` Object - A single object where the keys are given by the `keyname` in the `args` array, and hold the value of the corresponding argument. The object will also have another key named `'data'` that holds the value for the data which the transformation was aplied (the `'data'` key is not present if the transformation has type `static`).
+ `args` Object[] (Optional) - An array where each element is an object defining one argument of the transformation, the keys for the object argument are given bellow.
  + `name` String - The name for the argument that is shown to the user inside the program. Must be different from `'data'`.
  + `keyname` String (Optional) - The name to identify this argument in the `argObj` given to `func` when the transformation is called. Must be different from `'data'`. Defaults to the value of the `name` key.
  + `tooltip` String (Optional) - Description to show when user hovers over the argument in the program. 
  + `type` String (Optional) - Defines the type of argument and how it can be selected by the user. Default is `number`.
    + `number` - Argument is a Number. Creates a field for number input.
    + `select` - Argument is a String. Creates a drop-down menu with options given by the `option` key.
    + `checkbox` - Argument is a Boolean. Creates a checkbox to set the argument.
    + `data` - Argument can be anything. Creates a button that when clicked, allows the user to select some other data.
  + `option` Object[] (Optional) - Only affects arguments of type `select` and must be defined if that is the case. An array of objects defining the options for the drop-down menu.
    + `name` String - Defines the name of the option shown to the user, it is also the value of the argument if the option is selected.
    + `tooltip` String (Optional) - Description to show when the user hovers over the option.
  + `optional` Boolean (Optional) - Indicates wheter or not the argument can be left empty.
  + `value` any (Optional) - Initial value for the argument, must agree with the argument type given by the `type` key.
  + `max` Number (Optional) - Only affects arguments of type `number`. Defines the maximum value allowed for the number.
  + `min` Number (Optional) - Only affects arguments of type `number`. Defines the minimum value allowed for the number.
  + `step` Number (Optional) - Only affects arguments of type `number`. Defines the interval allowed for the number.
+ `checkArgs` Function (Optional) - Function called with `checkArgs(argsValue)` when the user confirms the values given to the arguments. If this function returns nothing the arguments are accepted, else this function must return a String with a message to be shown to the user as a prompt to correct the values.
  + `argsValue` any[] - Array with the values for the arguments, in the same order as given by the `args` key.

### Creating a Package
The process to create a package is very similar from that of creating a single transformation. It is only needed to export two keys to describe the package.
+ `pkgName` String - The name of the package to be shown to the user.
+ `pkg` Object[] - An array where each element is an object defining a single transformation. The objects follow the same [pattern](#creating-a-single-transformation) used to describe a single transformation.

As an example, here are the exports needed to define a simple package containing only two transformations.
```javascript
export const pkgName = 'Example';
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