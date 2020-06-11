'use strict';

global.preloadedModules = null;
process.once('loaded', () => {
  let id = setInterval(function() {
    if (!document.documentElement) {return;}
    clearInterval(id);

    const path = require('path');
    const {ipcRenderer} = require('electron');
    const {GraphK, Mode} = require('../graphK/js/graphK/graphK.js');
    global.preloadedModules = {
      GraphK, Mode, path,
      loadFile: () => ipcRenderer.invoke('load:file'),
      saveFile: (name, contents) => ipcRenderer.invoke('save:file', name, contents),
      getTransforms: () => ipcRenderer.invoke('transformations:names'),
      onFileAdd: (listener) => ipcRenderer.on('file:add', listener)
    };
  }, 10);
});