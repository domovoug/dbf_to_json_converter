const fs = require('fs');
const DBF = require('stream-dbf');

function FileList(dir) {
  if (fs.existsSync(dir)) {
    return fs.readdirSync(dir).filter((name) => ['DBF','dbf'].includes(name.split('.')[1]));
  } else {
    return [];
  }
}

function getArgsList() {
  return process.argv.slice(2).reduce((result, arg) => {
    let [key, value] = arg.split('=');
    result[key] = value;
    return result;
  }, {})
}

async function readFilesAndWriteInFile(fileList, dir, stream) {
  let flag_first = true;
  for (let filename of fileList) {
    await new Promise((resolve, reject) => {
      try {
        let parser = new DBF(`${dir}/${filename}`, {encoding: 'ibm866', lowercase: true});
        parser.stream.on('data', function (record) {
          if (flag_first)
            flag_first = false;
          else
            stream.write(", ");

          stream.write(JSON.stringify(record))
        });
        parser.stream.on('close', function () {
          resolve();
        });
      }catch (e) {
        reject(e)
      }
    })
  }
}

async function Start() {
  let argsList = getArgsList();
  if (argsList.hasOwnProperty('dir') || argsList.hasOwnProperty('file')) {
    if (!fs.existsSync(`${argsList['dir']}/converted`)) {
      fs.mkdirSync(`${argsList['dir']}/converted`);
    }
    let fileList = FileList(argsList['dir'])

    if (argsList.hasOwnProperty('single') && argsList['single'] === 'true') {
      console.log('Single mode')

      let writeStream = fs.createWriteStream(`${argsList['dir']}/converted/single.json`)
      await readFilesAndWriteInFile(fileList, argsList['dir'], writeStream).then(() => {
        writeStream.end();
      }, err => {
        errorHandler(err,1)
      })
    } else {
      console.log('Multiple mode')

      for (let filename of fileList) {
        let writeStream = fs.createWriteStream(`${argsList['dir']}/converted/${filename.split('.')[0].toLowerCase()}.json`)
        await readFilesAndWriteInFile([filename], argsList['dir'], writeStream).then(() => {
          writeStream.end();
        }, err => {
          errorHandler(err,2)
        })
      }
    }
  } else {
    errorHandler('Need send directory path with or file path!',3)
  }
}

function errorHandler(message,exitcode) {
  console.error(message);
  process.exit(exitcode)
}

Start().then(() => (console.log('Done'), process.exit(0)));

