# GraphK
:memo: Read in other language: [English](README.md), [Português](README.pt-br.md)\
:warning: *Still in development stage, bugs may be present and functionality may change in the future.*

This program is for visualization and manipulation of numbered data in the format of a sequence of (x, y) points. The main focus is to facilitate the work with data coming from EMG (*Electromyography*) signals, however any data with the right format also works.

The loaded data can be manipulated via [transformations](#transformations), which are files that can be created by anyone and imported automatically by the program. There is already some basic transformations that accompany the program, functions like: scale/shift of axis, average/RMS calculation, retification, filters, integration and others.

## Running the program
To execute this program you will need to install the [Node.js](https://nodejs.org/) application.\
Clone/Download this repository, open a command-line interpreter (*cmd*, *shell*, ...) in the repository folder, and execute the following command:
```sh
npm update
```
In case of error, check if Node.js was installed correctly, if the command-line interpreter is opened at the right directory, and that the directory is not read-only. The above command needs to be executed only once.

To run the program, execute the following command:
```sh
npm start
```

## File types
This program can load/save files of different types, the current supported formats are the following:
- [csv, txt](#csv,-txt)
- [JSON](#JSON)

### csv, txt
This type of file must contain the sequence of points (x, y) in the csv (*Comma Separated Values*) format, that is, a table where the lines and columns are divided by a line break and a \<separator\> respectively.\
The \<separator\> is normally one of the following characters: `,`, `|`, `SPACE`, `TAB`. However any character different from `A-Z a-z 0-9 . - +` is accepted as a separator. The separator is infered by the program when the file is opened.\
A file in this format must have:
- A header as the first line, defining the column names (optional):
```
header_1, header_2, header_3, ... , header_n
```
- Lines with numbers defining the values for the sequence of points:
```
0.0, 0.0, 0.0, ... , 0.0
0.1, 0.2, 0.3, ... , 0.4
 ⋮     ⋮    ⋮           ⋮
0.5, 0.6, 0.7, ... , 0.8
```
Files with only one column will be loaded in the program with their name defined by the header (filename if header is absent) and the numbers will define the values for the y axis, while the x axis will be filled with integers beginning from 0.\
Files with two columns have the default format expected, the header is ignored and the values define the x and y axis respectively for the first and second column.\
Files with n columns will be loaded as n different files, each named by the corresponding header (filename followed by column number if header is absent). The values of the columns will define the y axis corresponding to each one, while the x axis will be filled with integers beginning from 0.\
Files saved in the csv format will contain only two columns, for the x and y axis respectively, and will not contain a header.

### JSON
This type of file is an option to save the data with the intention to reload it in the future. JSON files allow for aditional data to be saved besides the sequence of points, this in turn allows for the data to be reloaded just like it was when saved, it also allows for saving/loading different set of data (not a sequence of points).

## Transformations
Transformation files are Javascript modules of the standard ECMAScript (for security reasons, Node.js modules are not allowed). The program loads all files inside the *transformations* folder automatically when it starts, and those can be used just like any other transformation.\
The idea behind transformations is to allow for the addition of functionality to the program, so it is possible for the user to create it's own custom routines and have them running normally inside the program. This transformation files can also be shared between users, it functions just like a plugin.

To understand how to program your own transformation files, check the [guide](docs/en-us/transformations.md).