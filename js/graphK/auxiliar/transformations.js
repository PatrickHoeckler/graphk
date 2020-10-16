"use strict";

module.exports = {makeTransform, makeTransformDir};

//The parseProperties function uses this structure to check for erros and fill
//default values in a transformation object. This is a very easy way to add new
//keys and subkeys to the documentation and have it be checked automatically.
//To add a new key you can add an object representing it that can have the
//following keys:
// - key: the name of the key
// - keyname: new name for the key in the parsed object (being used only to
//   rename the `pkg` to `value` key.)
// - stopParse - used to stop parse if the key is present in the object being
//   parsed, it will stop even if the key showed an error, it only needs to be
//   present in the parsed object. (again, only used by the `pkg` key).
// - onSetValue - called when the value is set on the parsed object, called with
//   onSetValue(parsed), giving the parsed object (also used only by the `pkg`,
//   it is used to set the type of object as 'pkg').
// - type: the type of the value of the key. If undefined, won't check type.
// - optional: if the key is optional
// - validValues: an array of valid values, the key cannot hold values different
//   than these. If undefined, all values of right type are valid.
// - invalidValues: an array of invalid values, the key cannot hold values equal
//   to these. If undefined, then no value is invalid.
// - defaultValue: a value to be given as default. Can also be a function that
//   returns the default value. This function will receive three arguments, the
//   first is the object of already parsed keys, the second is the object that
//   is being parsed, and third is the index of the object being parsed inside
//   of a parent object, may be -1 if the object has no other siblings (this is,
//   for example, the index of the argument inside the `args` array, you can name
//   stuff based on this number, check the defaultValue for the `name` key inside
///  the `outputs` key).
// - condition: a function that receives the same three arguments as that described
//   in the defaultValue. If this condition returns true, the key is ignored and
//   the defaultValue (if present) is added to the parsed object (this is good
//   for when, for example, you don't want to add min, max and step keys to values
//   of type !== 'number'). If returns a object, then the condition detected an
//   error and the object will be added to the array of errors. If returns false,
//   then no problem was found and the key will not be ignored.
// - elements: for keys holding (Object | Object[]), this key will hold an array
//   of objects defining the features of the subkeys in the same way as defined
//   the keys, that is, an object with keys {key, type, optional, validValues,
//   invalidValues, defaultValue, condition, elements}.
//
const structure = [
  {key: 'name', type: 'string', optional: false, invalidValues: ['']},
  {
    key: 'pkg', keyname: 'value', type: 'object', optional: true, stopParse: true,
    //elements: structure  //can't do this from here, will do after declaration
    onSetValue: (parsed) => {parsed['type'] = 'pkg';}
  },
  {key: 'func', type: 'function', optional: false},
  {key: 'tooltip', type: 'string', optional: true},
  {key: 'checkArgs', type: 'function', optional: true},
  {
    key: 'type', type: 'string', optional: true, defaultValue: 'normal',
    validValues: ['normal', 'scatter', 'x-axis', 'y-axis', 'no-plot', 'static']
  },
  {
    key: 'input', type: 'string', optional: true, defaultValue: 'points',
    validValues: ['points', 'number', 'any']
  },
  {
    key: 'outputs', type: 'object', optional: true,
    condition: (parsed, properties) => {
      let prop = properties.outputs;
      if (typeof prop !== 'object' || !parsed.type ||
        ['no-plot', 'static'].includes(parsed.type)) {return false;}
      if (Array.isArray(prop)) {
        if (!prop.length || typeof prop[0] !== 'object') {return false;}
        else if (prop.length > 1) {return {key: 'outputs', type: 'length'};}
        prop = prop[0];
      }
      prop.type = ['x-axis', 'y-axis'].includes(parsed.type) ?
        'number' : 'points';
    },
    defaultValue: (parsed) => ({name: 'Output', type:
      ['x-axis', 'y-axis'].includes(parsed.type) ? 'number' : 'points'
    }),
    elements: [
      {
        key: 'name', type: 'string', optional: true, invalidValues: [''],
        defaultValue: (_, __, id) => id === -1 ? 'Output' : `Output-${id}`
      },
      {
        key: 'type', type: 'string', optional: true, defaultValue: 'points',
        validValues: ['points', 'number', 'any']
      }
    ],
  },
  {
    key: 'args', type: 'object', optional: true,
    elements: [
      {key: 'name', type: 'string', optional: false, invalidValues: ['', 'data']},
      {
        key: 'keyname', type: 'string', optional: true, invalidValues: ['', 'data'],
        defaultValue: (parsed) => parsed['name']
      },
      {key: 'tooltip', type: 'string', optional: true},

      {
        key: 'type', type: 'string', optional: true, defaultValue: 'number',
        validValues: ['number', 'select', 'checkbox', 'data']
      },

      {
        key: 'option', type: 'object', optional: true,
        condition: (parsed, properties) => {
          if (parsed.type !== 'select') {return true;}
          else if (properties.option) {return false;}
          return {key:'option', type: 'undefined'};
        },
        elements: [
          {key: 'name', type: 'string', optional: false, invalidValues: ['']},
          {key: 'tooltip', type: 'string', optional: true},
        ],
      },

      {
        key: 'optional', type: 'boolean', optional: true,
        condition: (parsed, {optional}) => {
          return (parsed.type !== 'number' && parsed.type !== 'data') || 
            (typeof optional === 'boolean' && !optional);
        }
      },
      {
        key: 'max' , type: 'number', optional: true,
        condition: (parsed) => parsed.type !== 'number'
      },
      {
        key: 'min' , type: 'number', optional: true,
        condition: (parsed) => parsed.type !== 'number'
      },
      {
        key: 'step' , type: 'number', optional: true,
        condition: (parsed) => parsed.type !== 'number'
      },

      {
        key: 'value', optional: true,
        condition: (parsed, properties) => {
          const value = properties.value;
          const type = parsed.type;
          if (value === undefined || !type || type === 'data' ||
            (type === 'checkbox' && typeof value === 'boolean')
          ) {return;}
          else if (type === 'number'   && typeof value === 'number' ) {
            if (parsed.max < value || value < parsed.min) {
              return {key: 'value', type: 'value'};
            } return;
          }
          else if(type === 'select'   && typeof value === 'string' ) {
            if (parsed.option && parsed.option.some(opt => value === opt.name)) {
              return;
            }
            return {key: 'value', type: 'value'};
          }
          return {key: 'value', type: typeof value};
        }
      }
    ]
  }
]
structure[1].elements = structure; //adding self reference to pkg elements

/**
 * Parses a transformation object to check for invalid keys and fill the
 * default values. Check the documentation for full details on the keys and
 * their values.
 * @param {object} properties - an object containing the keys of declaring
 * a transformation file.
 * @param {object[]} structure - the structure of the accepted keys.
 * @param {number} [index] - index of the subkey inside another key, for
 * example, the index of the argument inside `args` key.
 * @returns {(object | object[] | null)} If all keys were valid, returns the
 * parsed object. If there errors in the keys, returns an array of objects
 * indicating the errors. If the `properties` argument is invalid, returns
 * `null`.
 */
function parseProperties(properties, structure, index = -1) {
  const parsed = {};
  const invalid = [];
  function setValue(parsed, key, value, onSetValue) {
    parsed[key] = value;
    return onSetValue && onSetValue(parsed, key, value);
  }

  if (typeof properties !== 'object') {return null;}
  for (let i = 0, n = structure.length; i < n; i++) {
    let {key, type, optional, defaultValue, validValues, invalidValues,
      elements, condition, onSetValue} = structure[i];
    let keyname = structure[i].keyname || key;
    let prop = properties[key];
    let result = condition && condition(parsed, properties, index);

    if (result && result !== true) {invalid.push(result); continue;}
    if (prop !== undefined && result !== true) {
      if (type && typeof prop !== type) {
        invalid.push({key, type: typeof prop});
      }
      else if (
        (invalidValues && invalidValues.includes(prop)) ||
        (validValues   && !validValues.includes(prop) )
      ) {invalid.push({key, type: 'value'});}
      else if (type === 'object') {
        if (!Array.isArray(prop)) {prop = [prop];}
        if (!prop.length) {
          invalid.push({key, type: 'value'});
          if (structure[i].stopParse) {break;}
          continue;
        }
        setValue(parsed, keyname, [], onSetValue);
        let invalidProp = [];
        for (let j = 0, n = prop.length; j < n; j++) {
          let propParsed = parseProperties(prop[j], elements, n > 1 ? j : -1);
          if (!propParsed) {invalidProp.push({index: j, type: 'value'});}
          if (Array.isArray(propParsed)) {
            invalidProp.push({index: j, type: 'elements', details: propParsed});
          }
          else {parsed[keyname].push(propParsed);}
        }
        if (invalidProp.length) {
          invalid.push({key, type: 'elements', details: invalidProp});
        }
      }
      else {setValue(parsed, keyname, prop, onSetValue);}
      if (structure[i].stopParse) {break;}
    }
    else if (optional) {
      if (!defaultValue) {continue;}
      else if (typeof defaultValue === 'function') {
        let value = defaultValue(parsed, properties, index);
        setValue(parsed, keyname, value, onSetValue)
      }
      else {setValue(parsed, keyname, defaultValue, onSetValue);}
    }
    else {invalid.push({key, type: 'undefined'});}
  }

  return invalid.length ? invalid : parsed;
}

/**
 * Make a transform object from the given properties object, setting all the
 * defaults and checking for all necessary keys.
 * @param {object} properties - key:value pairs for the transformation
 * properties. See documentation for details on the valid values.
 * @returns the transformation object if the properties were valid. If there
 * were errors in the keys of properties, then will return an array describing
 * all of those. If the properties is not an object, returns `null` otherwise.
 */
function makeTransform(properties, hash) {
  let result = parseProperties(properties, structure);
  if (result && !Array.isArray(result)) {result.hash = hash;}
  return result;
}

/**
 * Creates a object corresponding with a directory to hold transformations
 * @param {string} dirName - name of directory
 * @return {object} transformation directory object, its `content` key is an
 * array that should hold all the folder contents
 */
function makeTransformDir(dirName) {
  return {name: dirName, type: 'dir', contents: []};
}


module.exports.calculateTransformSafely = (function () {
  var maliciousFunction;
  function reverseMaliciousChanges(mutations) {
    maliciousFunction = true;
    for (let mutation of mutations) {
      if (mutation.type === 'attributes') {
        mutation.target.setAttribute(mutation.attributeName, mutation.oldValue);
      }
      else if (mutation.type === 'characterData') {
        mutation.target.innerHTML = mutation.oldValue;
      }
      else if (mutation.type === 'childList') {
        for (let elem of mutation.addedNodes) {elem.remove();}
        for (let elem of mutation.removedNodes) {
          mutation.target.insertBefore(elem, mutation.nextSibling);
        }
      }
    }
    throw null;
  }
  
  function calculateTransformSafely(func, args) {
    const observer = new MutationObserver(reverseMaliciousChanges);
    maliciousFunction = false;
    const blocked = {
      alert, setTimeout, setInterval, clearTimeout, clearInterval,
      MutationObserver, Promise
    };
    function malicious() {maliciousFunction = true; throw null;};
    Object.keys(blocked).forEach(key => window[key] = malicious);
    observer.observe(document.documentElement, {
      attributes: true, attributeOldValue: true,
      characterData: true, characterDataOldValue: true,
      childList: true, subtree: true
    });

    let value;
    try {try {value = func(args);}
    finally {
      Object.keys(blocked).forEach(key => window[key] = blocked[key]);
      let queue = observer.takeRecords();
      observer.disconnect();
      if (queue.length) {try {reverseMaliciousChanges(queue);} catch{}}
      if (maliciousFunction) {alert(
        'WARNING: This transformation tried to breach this computer security ' +
        'by using functions not allowed by this program. No damage was done, ' +
        "but it's recommended that this transformation file and any other " + 
        'coming from the same origin be removed from this computer.'
      ); return null;}
    }} catch (err) {throw err;}
    return value;
  }

  return calculateTransformSafely;
})();