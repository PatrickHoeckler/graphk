"use strict";

module.exports = {NavTree};
const {appendNewElement} = require('./auxiliar.js');

function NavTree() {
  const node = appendNewElement(null, 'div', 'nav-tree');
  this.node  = () => node;
}

/**
 * Auxiliar function to NavTree.prototype.addToTree(), adds a folder to the
 * tree, that is, an element that does not contain information by itself, it
 * is just a container of leafs, those contain information.
 * @param {object} folder - Object describing the folder to add
 * @param {String} folder.name - The name of the folder
 * @param {'pkg'|'dir'} folder.type - What type of folder it is, used just to
 * set the icon
 * @param {object[]} folder.value - Array of objects describing the contents of
 * the folder, they can also be folders, or be leafs
 * @param {(content: object, isLeaf: boolean) => any | null =} getData -
 * Callback that takes the object that is being added to the tree and returns
 * the value that should be linked to it.
 * @param {HTMLElement} parent - The HTMLElement to be the parent of the folder
 * element created
 * @param {number=} index - The index to place the new element, if ommited
 * will append the element at the end of parent.
 * @return {HTMLElement} The element containing the folder icon and name, but
 * not the main element that contains also the folder contents
 */
function addFolder(folder, getData, parent, index) {
  const referenceNode = parent.children[index] || null;
  let folderDiv = appendNewElement(null, 'div', 'folder collapsed');
  let folderNode = appendNewElement(folderDiv, 'div', 'folder-node');
  let folderContent = appendNewElement(folderDiv, 'div', 'folder-contents');
  appendNewElement(folderNode, 'span', 'node-icon');
  appendNewElement(folderNode, 'span', 'node-name').innerHTML = folder.name;
  parent.insertBefore(folderDiv, referenceNode);
  if (folder.type === 'pkg') {folderDiv.classList.add('pkg');}
  for (let file of folder.value) {
    if (file.value) {addFolder(file, getData, folderContent);}
    else {addLeaf(file, getData, folderContent);}
  }
  let linkedData = getData && getData(folder, false);
  if (linkedData !== null && linkedData !== undefined) {
    folderNode[NavTree.dataSymbol] = linkedData;}
  return folderNode;
}

/**
 * Auxiliar function to NavTree.prototype.addToTree(), adds a leaf to the
 * tree, that is, a final element, a element that does not contain other
 * inside, the leaf of the tree.
 * @param {object} leaf - The object describing the leaf
 * @param {string} leaf.name - The name of the leaf
 * @param {string} leaf.tooltip - The tooltip to be shown when the user hovers
 * over the leaf.
 * @param {(content: object, isLeaf: boolean) => any | null =} getData -
 * Callback that takes the object that is being added to the tree and returns
 * the value that should be linked to it.
 * @param {HTMLElement} parent - The HTMLElement to be the parent of the leaf
 * element created.
 * @param {number=} index - The index to place the new element, if ommited
 * will append the element at the end of parent.
 * @returns {HTMLElement} The element containing the leaf icon and name
 */
function addLeaf(leaf, getData, parent, index) {
  const referenceNode = parent.children[index] || null;
  let leafNode = appendNewElement(null, 'div', 'leaf-node');
  if (leaf.tooltip) {leafNode.setAttribute('title', leaf.tooltip);}
  appendNewElement(leafNode, 'span', 'node-icon');
  appendNewElement(leafNode, 'span', 'node-name').innerHTML = leaf.name;
  parent.insertBefore(leafNode, referenceNode);
  let linkedData = getData && getData(leaf, true);
  if (linkedData !== null && linkedData !== undefined) {
    leafNode[NavTree.dataSymbol] = linkedData;}
  return leafNode;
}

NavTree.prototype = {
  constructor: NavTree,
  /** Clears all content inside the folder but keeps it. If treeElem is not
   * given, then clears all the elements from the tree.
   * @param {HTMLElement=} treeElem
  */
  clear: function(treeElem) {
    if (treeElem !== this.node()) {
      treeElem = this.getContainingElement(treeElem);
      if (!treeElem || this.isLeaf(treeElem)) {return;}
      treeElem = treeElem.nextElementSibling;
    }
    treeElem.innerHTML = '';
  },
  /**
   * Returns wheter or not the element is contained in a NavTree leaf element.
   * @param {HTMLElement} treeElem
   */
  isLeaf: function(treeElem) {
    treeElem = this.getContainingElement(treeElem);
    return treeElem && treeElem.classList.contains('leaf-node');
  },
  /**
   * Returns wheter or not the containing element of the given element is a
   * folder at the top of the tree
   * @param {HTMLElement} treeElem
   */
  isTopFolder: function(treeElem) {
    treeElem = this.getContainingElement(treeElem);
    return treeElem && treeElem.parentElement.parentElement === this.node();
  },
  /**
   * Removes from the tree the first element containing the element given. That
   * is the leaf container, or the folder and all it's contents.
   * @param {HTMLElement} treeElem - Will remove the first container of this
   * element.
   * @return {HTMLElement?} The removed element, `null` if no containing element
   * was found.
   */
  remove: function(treeElem) {
    treeElem = this.getContainingElement(treeElem);
    if (treeElem.classList.contains('folder-node')) {
      treeElem = treeElem.parentElement;
    }
    return treeElem && treeElem.remove(), treeElem;
  },
  /**
   * Adds the needed HTMLElement's to the NavTree node and binds data to them.
   * Can create either a folder or a leaf.
   * @param {object} content - An object describing a tree leaf or folder
   * @param {string} content.name - Name of added object
   * @param {object[]=} content.value - Used to differentiate a folder from
   * a leaf. If present indicates a folder, and the array holds the contents
   * of it.
   * @param {'pkg'|'dir'=} content.type - Defines the type of folder, used to
   * change the icon
   * @param {string=} content.tooltip - Tooltip to give to the leaf element
   * @param {(content: object, isLeaf: boolean) => any | null =} getData -
   * Callback that takes the object that is being added to the tree, either a
   * folder or a leaf (given by the isLeaf argument), and returns the data that
   * should be linked to the element created. The data can be anything, but if
   * the callback returns `null`, `undefined`, or if the callback is not
   * defined, then no value will be linked.
   * @param {HTMLElement=} parent - A folder element inside the tree to contain
   * the new element. Default value is the main node of the tree.
   * @param {number=} index - The index to place the new element, if ommited
   * will append the element at the end of parent.
   * @return {HTMLElement} The containing element of the content added or `null`
   * if the parent element was invalid.
   */
  addToTree: function(content, getData, parent, index) {
    if (!parent) {parent = this.node();}
    else {
      parent = parent.closest('.folder');
      if (!parent) {parent = this.node();}
      else {parent = parent.children[1];}
    }
    if (content.value) {return addFolder(content, getData, parent, index);}
    else {return addLeaf(content, getData, parent, index);}
  },
  /**
   * Changes the index of the containing leaf or folder element. That is,
   * changes the position the element is indexed in relation to its parent.
   * @param {HTMLElement} treeElem
   * @param {number=} index - The new index, if `undefined` or invalid, will
   * position the element at the end of parent.
   */
  changeIndex: function(treeElem, index) {
    treeElem = this.getContainingElement(treeElem);
    if (!treeElem) {return;}
    if (treeElem.classList.contains('folder-node')) {
      treeElem = treeElem.parentElement;}
    const referenceNode = treeElem.parentElement.children[index] || null;
    if (treeElem !== referenceNode) {
      treeElem.parentElement.insertBefore(treeElem, referenceNode);
    }
  },

  /**
   * Searches up the parents of the element to find the containing element of
   * class 'folder-node' or 'leaf-node', if the element given is already a
   * container, then it will return it.
   * @param {HTMLElement} treeElem the element that is contained.
   * @return {HTMLElement?} The containing element if found, `null` otherwise.
  */
  getContainingElement: function (treeElem) {
    for (let curElem = treeElem;; curElem = curElem.parentElement) {
      if (!curElem || curElem === this.node()) {return null;}
      if (curElem.classList.contains('leaf-node') ||
        curElem.classList.contains('folder-node')
      ) {return curElem;}
    }
  },

  /** Collapses all folders in the tree */
  collapseAll: function() {
    let uncollapsed = this.node().getElementsByClassName('collapsible');
    for (let folder of uncollapsed) {folder.classList.add('collapsed');}
  },
  /**
   * Returns the container for the top folder relative to the tree element.
   * @param {HTMLElement} treeElem
   * @return {HTMLElement?} The top folder container, `null` if none found.
   */
  getTopFolder: function (treeElem) {
    for (let child of this.node().children) {
      if (child.contains(treeElem)) {return child.children[0];}
    }
    return null;
  },
  /**
   * Returns the direct parent folder container for the object.
   * @param {HTMLElement} treeElem 
   * @return {HTMLElement?} The parent folder container, `null` if none found.
   */
  getParentFolder: function (treeElem) {
    treeElem = this.getContainingElement(treeElem);
    if (!treeElem) {return;}
    if (!this.isLeaf(treeElem)) {treeElem = treeElem.parentElement;}
    for (let curElem = treeElem.parentElement;; curElem = curElem.parentElement) {
      if (!curElem || curElem === this.node()) {return curElem;}
      if (curElem.classList.contains('folder')) {return curElem.children[0];}
    }
  },
  /**
   * Finds the folder given by the treeElem and returns the contents of this
   * folder as an array of HTMLElements. If the element given is the same as
   * the main NavTree element, then returns all the top contents of the tree. 
   * @param {HTMLElement} treeElem - Element being part of the folder
   * @return {HTMLElement[]?} The containers of the folder and leaf contents,
   * or `null` if no folder was found from the given element.
   */
  getFolderContents: function (treeElem) {
    let folderContent;
    if (treeElem === this.node()) {folderContent = treeElem;}
    else {
      treeElem = this.getContainingElement(treeElem);
      if (!treeElem || treeElem.classList.contains('leaf-node')) {return null;}
      folderContent = treeElem.nextElementSibling;
    }
    if (!folderContent.children) {return [];}
    return Array.prototype.map.call(folderContent.children, elem =>
      elem.classList.contains('leaf-node') ? elem : elem.children[0]);
  },
  /**
   * Toggle the folder containing the element given from collapsed/uncollapsed
   * @param {HTMLElement} treeElem - An element contained by the folder, or the
   * folder element itself.
   */
  toggleFolder: function (treeElem) {
    let container = this.getContainingElement(treeElem);
    if (
      container && //container must be true, else elem given is not part of tree
      container.classList.contains('folder-node') && //can only toggle folders
      !container.parentElement.classList.contains('empty') //must not be a empty folder
    ) {container.parentElement.classList.toggle('collapsed');}
  },
  /**
   * Sets the name of the leaf or the folder containing the treeElem. Or if
   * name is `undefined`, returns the current name.
   * @param {HTMLElement} treeElem - An element of the tree
   * @param {string=} name - The name of the element.
   * @return {string?} The current name of the leaf or folder, or the given
   * name if it was defined. Returns `null` if the container was not found.
   */
  elemName: function(treeElem, name) {
    treeElem = this.getContainingElement(treeElem) && treeElem.children[1];
    if (!treeElem) {return null;}
    return !name ? treeElem.innerText : (treeElem.innerHTML = name);
  },
  /**
   * Sets the bound data for the leaf or the folder containing the treeElem. Or
   * if data is `undefined`, returns the current bound data.
   * @param {HTMLElement} treeElem - An element of the tree, the data for it's
   * first container will be found.
   * @param {*=} data - The data to bound to the container element. Won't bound
   * anything if this value is not set.
   * @return {any} The data bounded to the element, or the given data if it was
   * defined. Will return `null` if the container was not found.
  */
  elemData: function(treeElem, data) {
    treeElem = this.getContainingElement(treeElem);
    if (!treeElem) {return null;}
    return !data ? treeElem[NavTree.dataSymbol] : 
      (treeElem[NavTree.dataSymbol] = data);
  },
  /**
   * Opens a text input element for the user to rename the folder or leaf of
   * the tree given by the treeElem.
   * @param {HTMLElement} treeElem
   * @param {RegExp=} format - The format required for the name, can be left as
   * `undefined` to not require any specific format.
   * @return {Promise} A promise to be resolved with the new name given. If not
   * able to find any leaf or folder given by the treeElem, the promise will
   * reject.
   */
  openRenameBox: function(treeElem, format) {return new Promise((resolve, reject) => {
    treeElem = this.getContainingElement(treeElem);
    if (!treeElem) {return reject(`No leaf or tree found from 'treeElem'`);}
    const textElem = treeElem.children[1];
    //Creates div element that will appear if the name is invalid
    const warningBox = appendNewElement(this.node(), 'div', 'warning')
    warningBox.style.display = 'none';
    warningBox.innerHTML = 'Nome inválido para arquivo';
    textElem.style.display = 'none';
    //Creates input element
    const renameBox = appendNewElement(treeElem, 'input', 'rename');
    renameBox.setAttribute('type', 'text');
    renameBox.setAttribute('value', textElem.innerText);

    //Functions to handle input events
    function checkStopKeys({key}) {
      if (key === 'Escape' ||
        (key === 'Enter' && format.test(renameBox.value))
      ) {renameBox.blur();}
    }
    function checkInput() {
      if (!format.test(renameBox.value)) {
        if (warningBox.style.display === 'none') {
          //positions warning bellow rename box and shows it
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
      if (format.test(renameBox.value)) {textElem.innerHTML = renameBox.value;}
      textElem.style.display = '';
      warningBox.remove(); renameBox.remove();
      renameBox.removeEventListener('keydown', checkStopKeys);
      renameBox.removeEventListener('input', checkInput);
      resolve(textElem.innerText);
    }
    //Configuring rename box functionality
    renameBox.addEventListener('focusout', setName, {once: true});
    renameBox.addEventListener('keydown', checkStopKeys);
    renameBox.addEventListener('input', checkInput);
    renameBox.focus();
    renameBox.select();
  });}
}

Object.defineProperty(NavTree, 'dataSymbol', {value: Symbol('NavTree')});