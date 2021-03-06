'use strict';

//    COISAS PARA AJUSTAR NO FUTURO
// - O jeito que eu carrego as transformações usando require/exports parece esquisito,
//   talvez tenha um jeito melhor de fazer.
// - Muda os nomes que eu estou usando para fazer as comunicações entre processos via
//   ipcRender e ipcMain, os nomes são meio complicados e confusos. Por Exemplo: 
//   'transformations:values', 'arguments:select', etc.

// Modules
const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const {app, BrowserWindow, Menu, dialog, ipcMain} = electron;

const filterDict = {
  'json': {name: 'Javascript Object Notation (.json)', extensions: ['json']},
  'png':  {name: 'Portable Network Graphics (.png)'  , extensions: ['png']},
  'csv':  {name: 'Comma separeted values (.csv)'     , extensions: ['csv']},
  'txt':  {name: 'Text file (.txt)'                  , extensions: ['txt']},
  'any':  {name: 'All Files (*.*)'                   , extensions: ['*']}
}
//Platform specific
//************ ADICIONAR SUPORTE AO MAC NO FUTURO *****************
//const isMac = process.platform === 'darwin';

var mainWindow;

// Listen for app to be ready
app.on('ready', function (){
  //Create new window
  mainWindow = new BrowserWindow({
    title: 'graphK',
    minHeight: 300,
    minWidth: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      preload: path.join(app.getAppPath(), './js/preload.js')
    },
  });
  //Load html into window
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'html/index.html'),
    protocol: 'file:',
    slashes: true
  }));
  //Quit app when main window closed
  mainWindow.on('closed', () => app.quit());
  mainWindow.once('ready-to-show', () => {
    mainWindow.maximize();
    mainWindow.focus();
  });
  
  //Build menu from template
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  //Insert menu
  Menu.setApplicationMenu(mainMenu);
});

function loadFile() {
  //Select Files
  let fileNames = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [filterDict['csv'], filterDict['any']]
  })
  //Send File Names to ipcRenderer
  //  if no files selected
  if (fileNames === undefined) {return;}
  //  if files were selected, send fileNames to mainWindow process
  mainWindow.webContents.send('file:add', fileNames);
}

// Create menu template
const mainMenuTemplate = [
  //Menu 0
  {
    label: 'File',
    submenu: [
      //Submenu 0
      {
        label: 'Add File',
        click: loadFile
      },
      //Submenu 1
      {
        label: 'Preferences',
        click() {
          dialog.showMessageBoxSync(mainWindow, {
            title: 'Aviso',
            message: 'Ainda não foi implementado, botei aqui pra fica mais bonito.'
          })
        }
      },
      //Submenu 2'
      { role: 'quit', accelerator: 'CmdOrCtrl+Q'}
    ]
  },
];

//add debug tools if not on release
if (process.env.NODE_ENV !== 'production') {
  mainMenuTemplate.push({
    label: 'Debug',
    submenu: [
      //Submenu 0
      { role: 'toggleDevTools', label: 'DevTools', accelerator: 'F12' },
      { role: 'reload', accelerator: 'F5'}
    ]
  })
}

//catch request for transformations:names
ipcMain.handle('transformations:names', (event) => {
  //gets all filenames located inside the 'transformations' folder
  //returns an array representing all the files, depending if the file
  //is a directory or not, the corresponding element will be:
  //  - if file is not a directory: the array element is an object with 
  //    a name key containing the file name.
  //  - if file is a directory: the array element will be an object that
  //    besides having a key for the directory name, also contains a value
  //    key which will be another array where its elements represent the
  //    files inside the directory in the same manner as given by this two
  //    bullet points
  let dirName = path.join(__dirname, 'transformations');
  let tfFiles = {name: '.', value: []};
  (function readFolder(folder, saveTo) {
    let files = fs.readdirSync(folder, {withFileTypes: true});
    for (let i = 0; i < files.length; i++) {
      if (files[i].isDirectory()) {
        let newFolder = [];
        saveTo.push({name: files[i].name, value: newFolder});
        readFolder(path.join(folder, files[i].name), newFolder);
      }
      else {
        saveTo.push({name: files[i].name});
      }
    }
  })(dirName, tfFiles.value);
  return tfFiles;
});

ipcMain.handle('capture:image', (event, rect) => {
  let fileName = dialog.showSaveDialogSync(mainWindow, {
    defaultPath: 'capture', filters: [filterDict['png']]
  });
  if (fileName === undefined) {return false};

  fs.open(fileName, 'w', (err, file) => {
    if (err) {
      return dialog.showErrorBox('Erro abrindo arquivo', err.prototype.message);
    }
    mainWindow.webContents.capturePage(rect).then((capture) => {
      let pngBuffer = capture.toPNG();
      fs.write(file, pngBuffer, (err) => {
        fs.close(file, () => {return;});
        if (!err) {return;}
        dialog.showErrorBox('Erro escrevendo no arquivo', err.prototype.message);
      });
    });
  });
});

ipcMain.handle('save:file', (event, data) => {
  let fileName = dialog.showSaveDialogSync(mainWindow, {
    defaultPath: data.name,
    filters: [filterDict['csv'], filterDict['json']]
  });
  if (fileName === undefined) {return false};
  fs.open(fileName, 'w', (err, file) => {
    if (err) {
      return dialog.showErrorBox('Erro abrindo arquivo', err.prototype.message);
    }
    let extension = path.extname(fileName);
    let contents = '';
    if (extension === '.csv') {
      data.value.forEach((sample) => contents += sample.join(',') + '\n');
    }
    else if (extension === '.json') {
      contents = JSON.stringify(data);
    }
    else {return null;}
    //save data
    fs.write(file, contents, (err) => {
      fs.close(file, () => {return;});
      if (!err) return;
      dialog.showErrorBox('Erro escrevendo no arquivo', err.prototype.message);
    });
  });
});

ipcMain.handle('save:string', (event, data, filterKeys) => {
  let fileName = dialog.showSaveDialogSync(mainWindow, {
    defaultPath: data.name,
    filters: !filterKeys ? [filterDict['txt']] :
      filterKeys.map(key => filterDict[key])
  });
  if (fileName === undefined) {return false};
  fs.open(fileName, 'w', (err, file) => {
    if (err) {
      return dialog.showErrorBox('Erro abrindo arquivo', err.prototype.message);
    }
    fs.write(file, data.string, (err) => {
      fs.close(file, () => {return;});
      if (!err) {return;}
      dialog.showErrorBox('Erro escrevendo no arquivo', err.prototype.message);
    });
  });
});

ipcMain.handle('load:file', (event, filterKeys) => {
  return dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: !filterKeys ? [filterDict['any']] :
        filterKeys.map(key => filterDict[key])
  });
});