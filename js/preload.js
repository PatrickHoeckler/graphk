'use strict';

const { fstat } = require('fs');

global.preloaded = null;
process.once('loaded', () => {
  let id = setInterval(function() {
    if (!document.documentElement) {return;}
    clearInterval(id);

    const path = require('path');
    const {createHash} = require('crypto');
    const {readFileSync} = require('fs');
    const {ipcRenderer} = require('electron');
    const GraphK = require('./graphK/graphK.js');
    global.preloaded = {
      GraphK, path,
      loadFile: (filters) => ipcRenderer.invoke('load:file', filters),
      saveFile: (data) => ipcRenderer.invoke('save:file', data),
      saveString: (data, filters) => {
        return ipcRenderer.invoke('save:string', data, filters);
      },
      getTransformsFiles: () => ipcRenderer.invoke('transformations:names'),
      onFileAdd: (listener) => ipcRenderer.on('file:add', listener),
      onPanelMenuClick: (listener) => ipcRenderer.on('panel:click', listener),
      captureImage: function(rect) {
        let {x, y, width, height} = rect;
        rect = {x, y, width, height};
        for (let key in rect) {rect[key] = Math.round(rect[key]);}
        ipcRenderer.invoke('capture:image', rect)
      },
      calcSHA256: function(filename) {
        try {
          filename = path.join(__dirname, filename);
          let buffer = readFileSync(filename);
          let hash = createHash('sha256').update(buffer).digest('hex');
          return hash;
        } catch (err) {return null;}
      }
    };
  }, 10);
});

