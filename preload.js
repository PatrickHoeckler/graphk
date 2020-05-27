'use strict';

const path = require('path');
const {ipcRenderer} = require('electron');
process.once('loaded', () => {
  global.preloadedModules = {
    path, ipcRenderer
  }
})