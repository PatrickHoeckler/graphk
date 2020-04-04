'use strict';

//    COISAS PARA AJUSTAR NO FUTURO
// - O jeito que eu carrego as transformações usando require/exports parece esquisito,
//   talvez tenha um jeito melhor de fazer.
// - O jeito que eu passo as transformações da thread executando esse código (main process),
//   para a thread renderizando a janela principal (renderer process) me parece estranho
//   (eu to usando o objeto compartilhado 'global'), ver se tem um jeito melhor de fazer isso
//

// Modules
const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');
const {app, BrowserWindow, Menu, dialog, ipcMain} = electron;

//global shared object
global.graphK = {}; //initially empty
//transformation files
const transformsFiles = loadTransformsNames();

//Platform specific
//************ ADICIONAR SUPORTE AO MAC NO FUTURO *****************
//const isMac = process.platform === 'darwin';

var mainWindow, argWindow;

// Listen for app to be ready
app.on('ready', function (){
  //Create new window
  mainWindow = new BrowserWindow({
    title: 'graphK',
    minHeight: 300,
    minWidth: 600,
    webPreferences: {nodeIntegration: true},
    show: false
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

function addFile() {
  //Select Files
  let fileNames = dialog.showOpenDialogSync(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Comma separeted values (.csv)', extensions: ['csv'] },
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
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
        click: addFile
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

  //Menu 1
  {
    label: 'Edit',
    submenu: [
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
    ]
  },

  //Menu 2
  {
    label: 'View',
    submenu: [
      { role: 'minimize' },
      { role: 'togglefullscreen', label: 'Fullscreen' },
    ]
  }
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
ipcMain.on('transformations:names', (e, transformMask) => {
  let checkMask = transformMask === 'all' ? false: true;
  let transforms = {name: '.', value: []};
  //defining a self executing function to load all transformations
  //into the transforms object
  (function loadTransforms(transfFolder, folderPath, mask, saveTo) {
    for (let i = 0; i < transfFolder.length; i++) {
      //if the element corresponds to a directory (is a object containing a value key)
      if (transfFolder[i].value !== undefined) {
        //if the mask needs to be checked and if mask is false ignores the directory
        if (checkMask && !mask[i][0]) continue;
        let newFolder = [];
        saveTo.push({name: transfFolder[i].name, value: newFolder, type: 'dir'});
        let nextPath = path.join(folderPath, transfFolder[i].name);
        loadTransforms(
          transfFolder[i].value, nextPath,
          !checkMask ? null : mask[i].slice(1),
          newFolder
        );
      }
      //if the element corresponds to a file
      else {
        //if the mask needs to be checked and if mask is false ignores the file
        if (checkMask && !mask[i]) continue;
        let transformPath = '.\\' + path.join(folderPath, transfFolder[i].name);
        let imports = require(transformPath);
        if (Array.isArray(imports.pkg)) {
          let pkgName = imports.pkgName ? imports.pkgName : path.parse(transformPath).name;
          let newFolder = [];
          saveTo.push({name: pkgName, value: newFolder, type: 'pkg'});
          for (let tf of imports.pkg) {newFolder.push(tf);}
        }
        else {saveTo.push(imports);}
      }
    }
  })(transformsFiles.value, 'transformations', transformMask, transforms.value)

  //stores transforms object on global object to be acessed by the renderer process
  global.graphK.transforms = transforms;
  mainWindow.webContents.send('transformations:values');
});

ipcMain.on('arguments:input', (e, argsFormat) => {
  if (argsFormat === undefined || argsFormat === null) {
    mainWindow.webContents.send('arguments:values', true);
    return;
  }
  //creates new window to input arguments
  argWindow = new BrowserWindow({
    title: 'Select the parameters',
    height: 90 + 60 * argsFormat.length,
    width: 400,
    webPreferences: {nodeIntegration: true},
    show: false,
    parent: mainWindow,
    modal: true,
    resizable: false
  });
  //Load html into window
  argWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'html/args.html'),
    protocol: 'file:',
    slashes: true
  }));
  argWindow.once('ready-to-show', () => {
    argWindow.removeMenu();
    argWindow.show();
    //send arguments format to argWindow
    argWindow.webContents.send('arguments:input', argsFormat);
  });

  //add event listener waiting for argWindow response
  ipcMain.once('arguments:values', (e, args) => {
    argWindow.removeAllListeners('close');
    mainWindow.show();
    argWindow.close();
    //if user clicked cancel (args will be null)
    if (!args) {mainWindow.webContents.send('arguments:values', false);}
    //if args were given correctly
    else {mainWindow.webContents.send('arguments:values', true, args);}
    argWindow = null;
  });
  //event listener to handle when window closes (when user clicks the X button)
  argWindow.once('close', () => {
    mainWindow.show();
    ipcMain.removeAllListeners('arguments:values');
    mainWindow.webContents.send('arguments:values', false);
    argWindow = null;
  });
});

ipcMain.on('arguments:select', () => {
  mainWindow.webContents.send('arguments:select');
  argWindow.hide();
  mainWindow.focus();
  ipcMain.once('arguments:selected', (e, name, path, canceled) => {
    argWindow.show();
    argWindow.webContents.send('arguments:selected', name, path, canceled);
  });
});

ipcMain.on('save:file', (e, name, value) => {
  //show dialog box to save file
  let fileName = dialog.showSaveDialogSync(mainWindow, {
    defaultPath: name,
    filters: [
      {name: 'Comma separeted values (.csv)', extensions: ['csv']}
    ],
  });
  if (fileName === undefined) return;

  //open file selected to save data
  fs.open(fileName, 'w', (err, file) => {
    if (err) {
      dialog.showErrorBox('Erro abrindo arquivo', err.prototype.message);
      return;
    }

    //convert data to csv
    function dataToCSV(data) {
      let csv = '';
      data.forEach((sample) => csv += sample.join(',') + '\n');
      return csv;
    }
    let csv = dataToCSV(value);

    //save data
    fs.write(file, csv, (err) => {
      fs.close(file, () => {return;});
      if (!err) return;
      dialog.showErrorBox('Erro escrevendo no arquivo', err.prototype.message);
    });
  });
});

ipcMain.on('open:file', addFile);

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
function loadTransformsNames() {
  function readFolder(folder, saveTo) {
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
  }
  let dirName = path.join(__dirname, 'transformations');
  let transformsFiles = {name: '.', value: []};
  readFolder(dirName, transformsFiles.value);
  return transformsFiles;
}