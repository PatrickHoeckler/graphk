"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
// - No 'selectCallback' a função retorna o 'path' do elemento selecionado ao invés dos dados.
//   Como por fora, esse 'path' é usado para obter os dados, talvez fosse mais facil passar
//   os dados diretamente.

graphK.TransformPanel = function() {
  //Constants
  const filenameFormat = /^[^\\/?<>:|\"*^]{1,128}$/;
  const navTree =  new graphK.NavTree(); //navigation tree object;
  //Public Attributes

  //Private Properties
  var files = [];
  var transforms;
  var mode; //current mode of operation being used
  var mouseOverElem; //used to change highlight on change of mode
  //  callback functions
  var getArguments;
  var contextCallback, selectCallback;

  //Public Methods
  this.node = () => navTree.node();
  this.setModeObj = function (modeObj) {
    mode = modeObj;
    //if selectCallback !== null, then will not let change mode
    //only can change calling for stopDataSelect
    mode.addCheckListener(() => !selectCallback);
    mode.addChangeListener(modeChange);
  }
  this.renameFile = renameFile;
  this.deleteFromTree = deleteFromTree;
  this.getDataFromPath = getDataFromPath;
  this.getTransformFromPath = getTransformFromPath;
  this.getDataFromTreeElement = (treeElem) => getDataFromPath(navTree.findPath(treeElem));
  this.startDataSelect = function(callback, once = true) {
    if (typeof(callback) !== 'function') { throw new TypeError(
      `Expected a 'callback' function as argument. Got type ${typeof(callback)}`
    );}
    //won't start if can't change mode to SELECT
    if (!mode.change(graphK.mode.SELECT)) {return false;}
    if (once) {
      selectCallback = function(name, path, canceled) {
        callback(name, path, canceled);
        if (canceled) {return;}
        selectCallback = null;
        mode.change(graphK.mode.NORMAL);
      }
    } 
    else {selectCallback = callback;}
    return true;
  }
  this.stopDataSelect = function(canceled = false) {
    if (canceled) {selectCallback(null, null, true);}
    selectCallback = null;
    mode.change(graphK.mode.NORMAL);
  }
  this.addToTree = function(name = '', value, openRenameBox = false) {
    if (typeof(name) !== 'string' || !filenameFormat.test(name)) {return false;}
    let folderDiv = navTree.addFolder({name: name, value: transforms.value});
    if (!value) {
      folderDiv.classList.add('empty');
      files.push({name: name});
    }
    else {
      let structure = genTransformsStructure(transforms);
      //ARRUMAR ISSO NO FUTURO, CLONAR TOTALMENTE O ARRAY 'transforms' É UM DESPERDÍCIO DE MEMÓRIA
      //ESTÁ CLONANDO COISAS QUE PODERIAM SER ACESSADAS DIRETAMENTE DE 'transforms'.
      /// clone = graphK.deepClone(transforms);
      //pushes data read and clone to files array
      files.push({name: name, value: value, structure: structure});
      folderDiv.draggable = true;
    }
    if (openRenameBox) {renameFile(folderDiv);}
    return true;
  }
  //  reads file given by path
  this.readFile = function(filePath) {
    let fileName = filePath.split('\\').pop().split('/').pop();
    //checks if file was already loaded
    for (let i = 0; i < files.length; i++) {
      if (fileName === files[i].name) return;
    }
    //reads file
    let data = [];
    let dataText = d3.csvParseRows(fs.readFileSync(filePath, 'utf8'));
    for (let i = 0; i < dataText.length; i++)
      data.push([Number(dataText[i][0]), Number(dataText[i][1])]);

    this.addToTree(fileName, data);
  }
  this.updateTransforms = function(newTransforms) {
    if (!transforms) {
      transforms = newTransforms;
      return;
    }
    //Step 1 - Recreate the file tree with new transforms
    let oldTransforms = transforms;
    transforms = newTransforms;
    navTree.clear();
    for (let k = 0; k < files.length; k++) {
      let folderDiv = navTree.addFolder({name: files[k].name, value: newTransforms.value});
      if (!files[k].value) {folderDiv.classList.add('empty');}
      else {folderDiv.draggable = true;}
    }

    //Step 2 - Create an array for the old and new structure of each file
    let oldStructure = [];
    let newStructure = [];
    for (let k = 0; k < files.length; k++) {
      //Join all old structures in oldStructure array
      oldStructure.push(files[k].structure);
      //Create one structure for each file
      newStructure.push(genTransformsStructure(newTransforms));
    }

    //Step 3 - Compare which transformation is kept in this change
    //it's value in the newStructure array
    let oldPath = [];
    let newPath = [];
    (function compareTransforms(oldTf, newTf) {
      if (!oldTf || !newTf) {return;}
      for (let i = 0; i < oldTf.length; i++) {
        //if oldTf[i] corresponds to a folder
        if (oldTf[i].value) {
          for (let j = 0; j < newTf.length; j++) {
            if (oldTf[i].name === newTf[j].name) {
              oldPath.push(i); newPath.push(j);
              compareTransforms(oldTf[i].value, newTf[j].value);
              break;
            }
          }
        }
        //if oldTf[i] corresponds to a transformation 
        else {
          for (let j = 0; j < newTf.length; j++) {
            //if newTf also contains the oldTf[i] transformation
            if (newTf[j] === oldTf[i]) {
              for (let k = 0; k < files.length; k++) {
                let oldData = oldStructure[k];
                let newData = newStructure[k];
                for (let p = 0, n = oldPath.length - 1;; p++) {
                  oldData = oldData[oldPath[p]];
                  if (p !== n) {newData = newData[newPath[p]];}
                  else {
                    newData[newPath[p]] = oldData;
                    break;
                  }
                }
              }
            }
          }
        }
      }
      oldPath.pop();
      newPath.pop();
    })(oldTransforms.value, newTransforms.value);

    //Step 4 - Update the structure for every file
    for (let k = 0; k < files.length; k++) {files[k].structure = newStructure[k];}

    //Step 5 - Change the tree elements which correspond to an already calculated
    //transformation to ready
    for (let k = 0; k < files.length; k++) {
      let fileElem = navTree.node().children[k];
      (function checkElem(contents, structure, transforms) {
        for (let i = 0; i < contents.length; i++) {
          if (contents[i].classList.contains('collapsible')) { checkElem(
            contents[i].children[1].children, structure[i], transforms[i].value
          );}
          else {
            if (structure[i] !== null) {
              if (transforms[i].type !== 'no-plot') {contents[i].draggable = true;}
              contents[i].classList.add('ready');
              if (typeof(structure[i]) === 'number') {
                contents[i].title += contents[i].title ? 
                  '\nValue calculated: ' + structure[i] : 
                  'Value calculated: '   + structure[i];
              }
            }
          }
        }
      })(fileElem.children[1].children, files[k].structure, newTransforms.value);
    }
  }
  this.onGetArguments = (callback) => getArguments = callback;
  this.onContext = (callback) => contextCallback = callback;

  //Private Functions
  //  Rename navTree file
  function renameFile(treeElem) {
    let elem = navTree.getContainingElement(treeElem);
    if (!elem|| !navTree.isTopFolder(elem)) {return false;}
    if (!mode.change(graphK.mode.RENAME)) {return false;}
    let textElem = elem.getElementsByClassName('node-name')[0];
    let name = textElem.innerText;
    //Creates div element that will appear if the name is invalid
    let warningBox = graphK.appendNewElement(navTree.node(), 'div', 'warning')
    warningBox.innerHTML = 'Nome inválido para arquivo';
    warningBox.style.display = 'none';  //starts invisible
    textElem.style.display = 'none';
    //Creates input element
    let renameBox = graphK.appendNewElement(elem, 'input', 'rename');
    renameBox.setAttribute('type', 'text');
    renameBox.setAttribute('value', name);
    renameBox.focus();
    renameBox.select();

    //Functions to handle input events
    function checkStopKeys(e) {
      if ((e.keyCode === 13 && filenameFormat.test(renameBox.value)) || e.keyCode === 27) {
        renameBox.blur();
      }
    }
    function checkInput() {
      if (!filenameFormat.test(renameBox.value)) {
        if (warningBox.style.display === 'none') {
          //positions warning box bellow rename box and shows it
          let bRect = renameBox.getBoundingClientRect();
          warningBox.style.left = `${bRect.left}px`;
          warningBox.style.top = `${bRect.bottom}px`;
          warningBox.style.width = `${bRect.width}px`;
          warningBox.style.display = '';
          renameBox.classList.add('warning');
        }
      }
      else if (warningBox.style.display === ''){
        warningBox.style.display = 'none';
        renameBox.classList.remove('warning');
      }
    }
    function setName() {
      if (filenameFormat.test(renameBox.value) && name !== renameBox.value) {
        name = renameBox.value;
        let file = files[navTree.findPath(elem)[0]];
        file.name = name;
      }
      mode.change(graphK.mode.NORMAL);
      textElem.innerHTML = name;
      textElem.style.display = '';
      warningBox.remove();
      renameBox.remove();
      renameBox.removeEventListener('keydown', checkStopKeys);
      renameBox.removeEventListener('input', checkInput);
    }
    renameBox.addEventListener('focusout', setName, {once: true});
    renameBox.addEventListener('keydown', checkStopKeys);
    renameBox.addEventListener('input', checkInput);
    return true;
  }
  //  Generates a tree of arrays, each representing a folder of a
  //  set of transformations
  function genTransformsStructure(transformsObj) {
    let structure = [];
    (function recursiveGen(tfFolder, saveTo) {
      for (let tf of tfFolder) {
        //if tf is a directory (tf.value contain folder contents)
        if (tf.value) {
          let next = [];
          saveTo.push(next);
          recursiveGen(tf.value, next);
        }
        else {saveTo.push(null);}
      }
    })(transformsObj.value, structure);
    return structure;
  }
  //  Get data from file/transform given a path on the navTree
  function getTransformFromPath(path) {
    if (!Array.isArray(path)) {return null;}
    let tf = transforms;
    for (let id of path) {
      if (!tf.value || !(tf = tf.value[id])) {return null;}
    }
    return tf;
  }
  function getDataFromPath(path) {
    if (!Array.isArray(path) || !path.length) {return null;}
    if (files.length <= path[0]) {return null;}
    if (path.length === 1) {return files[path[0]];}
    let tf = transforms;
    let value = files[path[0]].structure;
    for (let i = 1; i < path.length; i++) {
      if (!tf.value || !(tf = tf.value[path[i]])) {return null;}
      value = value[path[i]];
    }
    let out = {};
    for (let key in tf) {out[key] = tf[key];}
    if (!out.value) {out.value = value;}
    return out;
  }
  function getStructureFromPath(path, ignoreLast = false) {
    if (!Array.isArray(path) || !path.length) {return null;}
    if (files.length <= path[0]) {return null;}
    let structure = files[path[0]].structure;
    let n = ignoreLast ? path.length - 1 : path.length;
    for (let i = 1; i < n; i++) {structure = structure[path[i]];}
    return structure;
  }
  //  Remove file from tree if 'elem' is file. If 'elem' represents
  //  a calculated transformation, deletes its calculated value
  function deleteFromTree(treeElem) {
    treeElem = navTree.getContainingElement(treeElem);
    if (navTree.isTopFolder(treeElem)) {
      //gets index of top folder in the tree, used to remove it from the files array
      let index = navTree.findPath(treeElem)[0];
      files.splice(index, 1);
      treeElem.parentElement.remove();
      return true;
    }
    else if (treeElem.classList.contains('ready')) {
      let path = navTree.findPath(treeElem);
      let tfId = path[path.length - 1];
      let fileTf = getStructureFromPath(path, true);
      fileTf[tfId] = null;
      treeElem.classList.remove('ready', 'highlight');
      treeElem.draggable = false;
      return true;
    }
    return false;
  }
  function selectTreeElem(treeElem) {
    let isTopFolder = navTree.isTopFolder(treeElem);
    if (!isTopFolder && !treeElem.classList.contains('ready')) {return;}
    //gets path in the tree of the element clicked
    let path = navTree.findPath(treeElem);
    let name = isTopFolder ? files[path[0]].name :
      files[path[0]].name + ':' + treeElem.innerText;
    treeElem.classList.remove('highlight');
    selectCallback(name, path, false);
  }
  //Listener to be executed when the mode is about to change
  function modeChange(newMode) {
    if (newMode === graphK.mode.NORMAL) {
      if (mouseOverElem) {mouseOverElem.classList.add('highlight');}
    }
    else {
      if (newMode === graphK.mode.DELETE) {
        //remove highlight from mouseover element if it can't be deleted
        if (
          mouseOverElem &&
          !navTree.isTopFolder(mouseOverElem) &&
          !mouseOverElem.classList.contains('ready')
        ) {mouseOverElem.classList.remove('highlight');}
      }
    }
  }
  
  //Initialize object
  mouseOverElem = null;
  selectCallback = null;
  //  adding context menu handlers
  navTree.node().addEventListener('contextmenu', (e) => {
    if (!contextCallback) {return};
    let elem = navTree.getContainingElement(e.target);
    if (!elem) {return;}

    let detail;
    if (elem.classList.contains('folder')) {
      if (elem.classList.contains('empty')) {detail = 'folder:empty';}
      else if (navTree.isTopFolder(elem)) {detail = 'folder:top';}
      else {detail = 'folder';}
    }
    else {
      if (elem.classList.contains('ready')) {detail = 'leaf:ready';}
      else if (elem.classList.contains('broken')) {detail = 'leaf:broken';}
      else {detail = 'leaf';}
    }
    contextCallback(e, 'navTree', detail);
  });
  //  adding mouse hover handlers
  navTree.node().addEventListener('mouseover', (e) => {
    if (!(mouseOverElem = navTree.getContainingElement(e.target))) {return;}
    //don't highlight in rename mode
    if (mode.mode() === graphK.mode.RENAME) {return;}
    //if not in normal mode - highlights only elements with data associated
    if (mode.mode()) {
      if (
        !navTree.isTopFolder(mouseOverElem) &&
        !mouseOverElem.classList.contains('ready')
      ) {return;}
    }
    mouseOverElem.classList.add('highlight');
  });
  navTree.node().addEventListener('mouseout', (e) => {
    if (!mouseOverElem) {return;}
    mouseOverElem.classList.remove('highlight');
    mouseOverElem = null;
  });
  //  adding click handler
  navTree.node().addEventListener('click', (e) => {
    if (mode.mode() === graphK.mode.DELETE || 
        mode.mode() === graphK.mode.SELECT) {return;}
    navTree.toggleFolder(e.target)
  });
  //  adding double click handler
  navTree.node().addEventListener('dblclick', (e) => {
    let elem = navTree.getContainingElement(e.target);
    if (!elem) {return;}

    //if in delete mode
    if (mode.mode() === graphK.mode.DELETE) {deleteFromTree(elem);}
    //if in select mode
    else if (mode.mode() === graphK.mode.SELECT) {selectTreeElem(elem);}
    //if in normal mode
    else if (mode.mode() === graphK.mode.NORMAL){
      //if elem is not a leaf ignores the event;
      if (!elem.classList.contains('leaf')) {return;}
      //gets path in the tree of the element clicked
      let path = navTree.findPath(elem);
      //last element of path will be the id of the transform selected in
      //relation to its parent folder, will be removed from path to be used later
      let tfId = path[path.length - 1];
      let fileTf = getStructureFromPath(path, true);
      //first element from path indicates the file index, no use for finding transform
      let fileId = path.shift();
      let transform = getTransformFromPath(path);
      let argsFormat = transform.args;
      
      //if function result was already calculated and there's no argument to change
      //then there's no need to calculate again
      if (elem.classList.contains('ready') && !argsFormat) {return;}
      if (elem.classList.contains('broken')) {return;}
      
      //calls function to get arguments for the transformation (the format of these arguments are
      //given as the first parameter to the function 'argsFormat'). This function must be set as a
      //callback outside of this object.
      //The second parameter is another callback function that needs to be called when the arguments
      //are found to calculate the transformation given the just found arguments.
      getArguments(argsFormat, function(args) {
        let value;
        try {
          //calculates transformation value using transform function on file data
          value = transform.func(files[fileId].value, args);
        } catch (err) {
          //if there was some error executing the function, changes the tree element to alert
          //that the transformation functions has some error in its code
          elem.setAttribute('title', 'O código dessa transformação resultou em erro.\n' +
          'Cheque o console pressionando F12 para mais detalhes.');
          elem.classList.add('broken');
          throw (err);
        }
        if (value === null || value === undefined) {return;}
        fileTf[tfId] = value;
        if (typeof(value) === 'number') {
          elem.title = !transform.tooltip ? 'Value calculated: ' + value :
            transform.tooltip + '\nValue calculated: ' + value;
        }
        //sets tree element as ready to use, and enables drag on it
        elem.classList.add('ready');
        if (transform.type !== 'no-plot') {elem.draggable = true;}
      });
    }
  });
  //  adding drag handler
  navTree.node().addEventListener('dragstart', (e) => {
    if (!mode.change(graphK.mode.DRAG)) {
      e.preventDefault();
      return;
    }
    
    let dragElem = e.target;
    navTree.node().classList.add('drag');
    dragElem.classList.remove('highlight');
    let data = getDataFromPath(navTree.findPath(dragElem));
    e.dataTransfer.setData('text', JSON.stringify({
      name: data.name,
      type: data.type,
      value: data.value
    }));

    //if the element being dragged is already a top folder meaning it
    //represents a file with data loaded on the program and not a transformation
    let dragTopFolder = navTree.isTopFolder(dragElem);
    
    //if the element is not a top folder, then adds extra event listener to the
    //corresponding top folder, making it possible to update its value with a
    //transformation value
    let topFolder = navTree.getTopFolder(dragElem);
    function drop(e) {
      let elem = navTree.getContainingElement(e.target);
      if (!elem) return;

      //getting and updating the data corresponding to the file
      e.preventDefault();
      let {name, value} = JSON.parse(e.dataTransfer.getData('text'));
      let path = navTree.findPath(elem);
      let file = files[path[0]];
      file.value = value;
      if (elem.classList.contains('empty')) {
        //update file name
        file.name = name;
        let textElem = elem.getElementsByClassName('node-name')[0];
        textElem.innerHTML = name;
        //update transforms, enables drag and removes the empty class
        file.structure = genTransformsStructure(transforms);
        elem.draggable = true;
        elem.classList.remove('empty');
      }
      else if (elem === topFolder) {
        //reseting branch on navTree corresponding to the topFolder
        //calling parent because topFolder is contained within a div
        let leafs = topFolder.parentElement.getElementsByClassName('leaf');
        for (let i = 0; i < leafs.length; i++) {
          deleteFromTree(leafs[i]);
        }
      }
    }
    function dragOver (e) {
      let elem = navTree.getContainingElement(e.target);
      mouseOverElem = elem;
      if (!elem || !navTree.isTopFolder(elem)) return;
      if (elem === topFolder && dragTopFolder) return;
      if (!elem.classList.contains('empty') && elem !== topFolder) return;
      elem.classList.add('highlight');
      e.preventDefault();
    }
    function dragLeave(e) {
      if (!mouseOverElem) {return;}
      mouseOverElem.classList.remove('highlight');
      mouseOverElem = null;
    }
    function dragEnd(e) {
      //remove all event listeners added
      mode.change(graphK.mode.NORMAL);
      mouseOverElem = navTree.getContainingElement(e.target);
      if (mouseOverElem) {mouseOverElem.classList.add('highlight');}
      navTree.node().removeEventListener('drop'     , drop);
      navTree.node().removeEventListener('dragover' , dragOver);
      navTree.node().removeEventListener('dragleave', dragLeave);
      navTree.node().classList.remove('drag');
    }

    //add all event listeners necessary
    //  event listeners to handle drop on topFolder, and to change
    //  its background color on dragover/dragleave
    navTree.node().addEventListener('drop'     , drop);
    navTree.node().addEventListener('dragover' , dragOver);
    navTree.node().addEventListener('dragleave', dragLeave);
    //  event listener of the end of drag, removes all added listeners
    dragElem.addEventListener ('dragend'  , dragEnd, {once: true});
  });
}