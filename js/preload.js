'use strict';

global.preloadedModules = null;
process.once('loaded', () => {
  let id = setInterval(function() {
    if (!document.documentElement) {return;}
    clearInterval(id);

    const path = require('path');
    const {ipcRenderer} = require('electron');
    const {GraphK, Mode} = require('./graphK/graphK.js');
    global.preloadedModules = {
      GraphK, Mode, path,
      loadFile: () => ipcRenderer.invoke('load:file'),
      saveFile: (data) => ipcRenderer.invoke('save:file', data),
      getTransformsFiles: () => ipcRenderer.invoke('transformations:names'),
      onFileAdd: (listener) => ipcRenderer.on('file:add', listener),
      onPanelMenuClick: (listener) => ipcRenderer.on('panel:click', listener),
      captureImage: (rect) => {
        let {x, y, width, height} = rect;
        rect = {x, y, width, height};
        for (let key in rect) {rect[key] = Math.round(rect[key]);}
        ipcRenderer.invoke('capture:image', rect)
      }
    };
  }, 10);
});