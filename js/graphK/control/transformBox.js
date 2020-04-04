"use strict";

//    COISAS PARA AJUSTAR NO FUTURO
//
// - Remover a necessidade de deepClone do array 'transforms' para cada novo arquivo criado
// - Checar se não tem um meio melhor de organizar as transformações, ou seja, repensar como
//   esse array 'transforms' é usado
// - Expandir a função 'updateTransforms'
// - No 'selectCallback' a função retorna o 'path' do elemento selecionado ao invés dos dados.
//   Como por fora, esse 'path' é usado para obter os dados, talvez fosse mais facil passar
//   os dados diretamente.

graphK.TransformBox = function() {
  //Constants
  const filenameRegExp = /^[^\\/?<>:|\"*^]{1,128}$/;
  //Public Attributes

  //Private Properties
  var navTree;
  var files = [];
  var transforms;
  var mode; //current mode of operation being used
  var mouseOverElem; //used to change highlight on change of mode
  //  callback functions
  var getArguments;
  var contextCallback, selectCallback;

  //Public Methods
  this.node = () => navTree.node();
  this.renameFile = renameFile;
  this.deleteFromTree = deleteFromTree;
  this.getDataFromPath = getDataFromPath;
  this.getDataFromTreeElement = (treeElem) => getDataFromPath(navTree.findPath(treeElem));
  this.selectFromTree = function(callback) {
    //if is not in select mode don't start selection
    if (mode !== graphK.mode.SELECT) {return false;}
    selectCallback = callback;
    return true;
  }
  this.addToTree = function(name = '', value, openRenameBox = false) {
    if (typeof(name) !== 'string' || !filenameRegExp.test(name)) {return false;}
    let folderDiv = navTree.addFolder({name: name, value: transforms.value});
    if (!value) {
      folderDiv.classList.add('empty');
      files.push({name: name});
    }
    else {
      //ARRUMAR ISSO NO FUTURO, CLONAR TOTALMENTE O ARRAY 'transforms' É UM DESPERDÍCIO DE MEMÓRIA
      //ESTÁ CLONANDO COISAS QUE PODERIAM SER ACESSADAS DIRETAMENTE DE 'transforms'.
      let clone = graphK.deepClone(transforms);
      //pushes data read and clone to files array
      files.push({name: name, value: value, transforms: clone});
      folderDiv.draggable = true;
    }
    if (openRenameBox) {renameFile(folderDiv);}
    return true;
  }
  this.getMode = () => mode;
  this.setMode = setMode;
  this.canSetMode = canSetMode;
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
  this.updateTransforms = function(_transforms) {
    files = [];
    navTree.clear();
    transforms = graphK.deepClone(_transforms);
  }
  this.onGetArguments = (callback) => getArguments = callback;
  this.onContext = (callback) => contextCallback = callback;

  //Private Functions
  //  Rename navTree file
  function renameFile(treeElem) {
    if (!canSetMode(graphK.mode.RENAME)) {return false;}
    let elem = navTree.getContainingElement(treeElem);
    if (!elem|| !navTree.isTopFolder(elem)) {return false;}
    let textElem = elem.getElementsByClassName('node-name')[0];
    let name = textElem.innerText;
    //Creates input element
    let renameBox = document.createElement('input');
    renameBox.setAttribute('type', 'text');
    renameBox.setAttribute('value', name);
    renameBox.classList.add('rename');
    //Creates div element that will appear if the name is invalid
    let warningBox = document.createElement('div');
    warningBox.classList.add('warning');
    warningBox.innerHTML = 'Nome inválido para arquivo';
    warningBox.style.display = 'none';  //starts invisible
    navTree.node().appendChild(warningBox);
    //set mode to rename and configures elements to start renaming
    setMode(graphK.mode.RENAME);
    textElem.style.display = 'none';
    elem.appendChild(renameBox);
    renameBox.focus();
    renameBox.select();

    //Functions to handle input events
    function checkStopKeys(e) {
      if ((e.keyCode === 13 && filenameRegExp.test(renameBox.value)) || e.keyCode === 27) {
        renameBox.blur();
      }
    }
    function checkInput() {
      if (!filenameRegExp.test(renameBox.value)) {
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
      if (filenameRegExp.test(renameBox.value) && name !== renameBox.value) {
        name = renameBox.value;
        let file = files[navTree.findPath(elem)[0]];
        file.name = name;
      }
      //Resets mode to normal, needs to update the mode before calling the function
      //because if mode === graphK.mode.RENAME, then setMode() does nothing (this
      //is necessary to avoid outside influences to change mode while the renameBox
      //is still open)
      setMode(mode = graphK.mode.NORMAL);
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
  //  Get data from file/transform given a path on the navTree
  function getDataFromPath(path) {
    if (!Array.isArray(path) || !path.length) {return null;}
    if (files.length <= path[0]) {return null;}
    if (path.length === 1) {return files[path[0]];}
    let data = files[path[0]].transforms;
    for (let i = 1; i < path.length; i++) {
      if (data.value.length <= path[i]) {return null;}
      data = data.value[path[i]];
    }
    return data;
  }
  //  Remove file from tree if 'elem' is file. If 'elem' represents
  //  a calculated transformation, deletes its calculated value
  function deleteFromTree(treeElem) {
    treeElem = navTree.getContainingElement(treeElem);
    if (navTree.isTopFolder(treeElem)) {
      //gets index of top folder in the tree, used to remove it from the files array
      let index = navTree.findPath(treeElem);
      files.splice(index, 1);
      navTree.node().removeChild(treeElem.parentElement);
      return true;
    }
    else if (treeElem.classList.contains('ready')) {
      let transformation = getDataFromPath(navTree.findPath(treeElem));
      transformation.value = null;
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
    selectCallback = null;
  }
  function setMode(newMode) {
    if (!canSetMode(newMode)) {return false;}
    //if wants to reset to normal mode
    if (newMode === graphK.mode.NORMAL) {
      //if is changing from select mode, then the selection was canceled via this function call
      //needs to call the callback informing the cancel (third argument - indicates cancel)
      if (mode === graphK.mode.SELECT && selectCallback) {
        //If selectCallback calls for setMode, then there will be an infinite recursion calling
        //of selectCallback()->setMode()->selectCallback()->... - to avoid this, we set callback
        //to null before calling it via a temporary variable
        let temp = selectCallback;
        selectCallback = null;
        temp(null, null, true);
      }
      if (mouseOverElem) {mouseOverElem.classList.add('highlight');}
    }
    //if newMode is anything other than normal mode
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
    mode = newMode;
    return true;
  }
  function canSetMode(newMode) {
    return mode !== graphK.mode.RENAME && 
      (newMode === graphK.mode.NORMAL || mode === graphK.mode.NORMAL);
  }
  
  //Initialize object
  mouseOverElem = null;
  selectCallback = null;
  mode = graphK.mode.NORMAL;
  navTree = new graphK.NavTree(); //navigation tree object

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
  })
  //  adding mouse hover handlers
  navTree.node().addEventListener('mouseover', (e) => {
    if (!(mouseOverElem = navTree.getContainingElement(e.target))) {return;}
    //don't highlight in rename mode
    if (mode === graphK.mode.RENAME) {return;}
    //if not in normal mode - highlights only elements with data associated
    if (mode) {
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
    if (mode !== graphK.mode.DELETE) {navTree.toggleFolder(e.target);}
  });
  //  adding double click handler
  navTree.node().addEventListener('dblclick', (e) => {
    let elem = navTree.getContainingElement(e.target);
    if (!elem) {return;}

    //if in delete mode
    if (mode === graphK.mode.DELETE) {deleteFromTree(elem);}
    //if in select mode
    else if (mode === graphK.mode.SELECT) {selectTreeElem(elem);}
    //if in normal mode
    else {
      //if elem is not a leaf ignores the event;
      if (!elem.classList.contains('leaf')) {return;}
      //gets path in the tree of the element clicked
      let path = navTree.findPath(elem);
      let transformation = getDataFromPath(path);
      let argsFormat = transformation.args;
      
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
          //calculates transformation value using transformation function on file data
          value = transformation.func(files[path[0]].value, args);
        } catch (err) {
          //if there was some error executing the function, changes the tree element to alert
          //that the transformation functions has some error in its code
          elem.setAttribute('title', 'O código dessa transformação resultou em erro.\n' +
          'Cheque o console pressionando F12 para mais detalhes.');
          elem.classList.add('broken');
          throw (err);
        }
        if (!value && value !== 0) return;
        transformation.value = value;
        if (typeof(value) === 'number') {
          elem.title = !transformation.tooltip ? 'Value calculated: ' + value :
            transformation.tooltip + '\nValue calculated: ' + value;
        }
        //sets tree element as ready to use, and enables drag on it
        elem.classList.add('ready');
        if (transformation.type !== 'no-plot') elem.draggable = true;
      });
    }
  });
  //  adding drag handler
  navTree.node().addEventListener('dragstart', (e) => {
    //only allows drag on drag mode
    if (mode !== graphK.mode.DRAG) {
      e.preventDefault();
      return;
    }
    
    let dragElem = e.target;
    navTree.node().classList.add('drag');
    dragElem.classList.remove('highlight');
    //gets path in the tree of the element clicked
    let path = navTree.findPath(dragElem);
    //gets choosen transformation data position on file transformation object
    let tr = getDataFromPath(path);
    e.dataTransfer.setData('text', JSON.stringify({
      name: tr.name,
      type: tr.type,
      value: tr.value
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
        file.transforms = graphK.deepClone(transforms);
        elem.draggable = true;
        elem.classList.remove('empty');
      }
      else if (elem === topFolder) {
        //reseting branch on navTree corresponding to the topFolder
        //calling parent because topFolder is contained within a div
        let leafs = topFolder.parentElement.getElementsByClassName('leaf');
        for (let i = 0; i < leafs.length; i++) {
          leafs[i].classList.remove('ready');
          leafs[i].draggable = false;
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
      mode = graphK.mode.NORMAL;
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


  //===DEBUG STUFF===
  this.getTransforms = () => transforms;
  //=================
}