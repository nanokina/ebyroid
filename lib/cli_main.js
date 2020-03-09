/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const program = require('commander');
const inquirer = require('inquirer');
const Ebyroid = require('./ebyroid');
const Voiceroid = require('./voiceroid');
const MiniServer = require('./mini_server');

let handled = false;

function unused(...x) {
  return x;
}

function int(v, acc) {
  unused(acc);
  return Number.parseInt(v, 10);
}

function defaultPath(version) {
  return version === 'VOICEROID+'
    ? 'C:\\Program Files (x86)\\AHS\\VOICEROID+'
    : 'C:\\Program Files (x86)\\AHS\\VOICEROID2';
}

function validateVoiceroidPath(vrpath, { version }) {
  const fsopt = { withFileTypes: true };
  try {
    let files;
    if (version === 'VOICEROID+') {
      files = fs
        .readdirSync(vrpath, fsopt)
        .map(dirent =>
          dirent.isDirectory()
            ? fs.readdirSync(path.join(vrpath, dirent.name), fsopt)
            : []
        )
        .flat()
        .filter(dirent => dirent.isFile());
    } else {
      files = fs
        .readdirSync(vrpath, { withFileTypes: true })
        .filter(dirent => dirent.isFile());
    }
    return files.some(file => file.name === 'aitalked.dll')
      ? true
      : 'That is not a valid VOICEROID+ directory.';
  } catch (e) {
    if (e.code === 'ENOENT') {
      return 'There is no such a directory.';
    }
    return `Something went wrong. Perhaps an invalid path was given. (code=${e.code})`;
  }
}

function configureObject(answers) {
  const o = {};
  o.version = answers.version;
  o.name = answers.name;

  const base = answers.usesDefaultPath
    ? defaultPath(answers.version)
    : answers.customPath;
  o.baseDirPath =
    o.version === 'VOICEROID+' ? path.join(base, answers.vpDirName) : base;

  o.voiceDirName = answers.voiceDirName;

  return o;
}

async function configure(opts) {
  handled = true;
  const names = new Map();
  const questions = [
    {
      type: 'list',
      name: 'version',
      message: 'Which version of VOICEROID do you use?',
      choices: ['VOICEROID+', 'VOICEROID2'],
    },
    {
      type: 'confirm',
      name: 'usesDefaultPath',
      message: answers =>
        `Is your VOICEROID installed in "${defaultPath(answers.version)}"?`,
      when: answers => {
        const vrpath = defaultPath(answers.version);
        return typeof validateVoiceroidPath(vrpath, answers) !== 'string';
      },
    },
    {
      type: 'input',
      name: 'customPath',
      message: 'Where is it installed in?',
      when: answers => !answers.usesDefaultPath,
      filter: value => path.normalize(value),
      validate: validateVoiceroidPath,
    },
    {
      type: 'list',
      name: 'vpDirName',
      message: 'Which VOICEROID+ do you like to use?',
      choices: answers => {
        const base = answers.usesDefaultPath
          ? defaultPath(answers.version)
          : answers.customPath;
        return fs
          .readdirSync(base, { withFileTypes: true })
          .filter(
            dirent => dirent.isDirectory() && !dirent.name.startsWith('.')
          )
          .map(dirent => dirent.name);
      },
      when: answers => answers.version === 'VOICEROID+',
    },
    {
      type: 'list',
      name: 'voiceDirName',
      message: 'Which voice library do you like to use?',
      choices: answers => {
        const base = answers.usesDefaultPath
          ? defaultPath(answers.version)
          : answers.customPath;
        const voiceBase =
          answers.version === 'VOICEROID+'
            ? path.join(base, answers.vpDirName, 'voice')
            : path.join(base, 'Voice');
        return fs
          .readdirSync(voiceBase, { withFileTypes: true })
          .filter(
            dirent => dirent.isDirectory() && !dirent.name.startsWith('.')
          )
          .map(dirent => dirent.name);
      },
    },
    {
      type: 'input',
      name: 'name',
      message: 'Give an identical name to this voiceroid settings!',
      validate: name => {
        if (name.length < 1) {
          return 'Name cannot be empty.';
        }
        if (names.has(name)) {
          return 'That name is already used.';
        }
        names.set(name, true);
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'continue',
      message: 'Add more settings for other voiceroids?',
      default: false,
    },
  ];

  function ask(arr = []) {
    return inquirer.prompt(questions).then(answers => {
      arr.push(answers);
      if (answers.continue) {
        console.log(`---------- No.${arr.length + 1} ----------`);
        return ask(arr);
      }
      return Promise.resolve(arr.map(configureObject));
    });
  }

  function finalAsk(objects) {
    return inquirer
      .prompt([
        {
          type: 'list',
          name: 'which',
          message: 'Which one of the voiceroids should be used as default?',
          choices: objects.map(o => o.name),
        },
      ])
      .then(answers => {
        const od = objects.find(o => o.name === answers.which);
        od.default = true;
        return Promise.resolve(objects);
      });
  }

  function writeJson(objects) {
    console.log(`Writing to "${opts.output}"...\n`);
    const json = JSON.stringify(objects, null, 2);
    fs.writeFileSync(opts.output, json);
    return Promise.resolve();
  }

  return ask()
    .then(finalAsk)
    .then(writeJson)
    .catch(e => console.error('\nSorry, an error occured!', e));
}

function toVR(o) {
  return new Voiceroid(o.name, o.baseDirPath, o.voiceDirName);
}

async function start(opts) {
  handled = true;
  try {
    // https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js
    // FIXME why??
    if (process.platform === 'win32') {
      // eslint-disable-next-line global-require
      const rl = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      rl.on('SIGINT', () => {
        process.emit('SIGINT');
      });
    }

    console.log('Loading config from JSON file...');
    const json = await fs.promises.readFile(opts.config, 'utf8');
    const objects = JSON.parse(json);
    const vrs = objects.map(toVR);
    console.log(
      'Loaded',
      vrs.length,
      'voiceroid(s):',
      vrs.map(v => v.name).join(', ')
    );
    const eby = new Ebyroid(...vrs);
    const defname = objects.find(o => o.default).name;
    eby.use(defname);
    console.log(`Use "${defname}" as default...`);
    const mini = new MiniServer(eby, opts.maxHeaderSize);
    console.log(`Starting up the server, with port ${opts.port}...`);
    console.log(`--max-header-size = ${opts.maxHeaderSize}...`);
    mini.start(opts.port);
    process.on('SIGINT', () => {
      mini.end();
      // eslint-disable-next-line no-process-exit
      setImmediate(() => process.exit(0));
    });
    console.log('Server started!\n');
  } catch (e) {
    console.error('Error while starting up the server.\n\n', e, '\n\n');
    // eslint-disable-next-line no-process-exit
    setImmediate(() => process.exit(0));
  }
  return Promise.resolve();
}

async function main() {
  program.name('ebyroid').version('0.2.0');

  program
    .command('start')
    .description('start an audiostream server')
    .option('-p, --port <port>', 'port to listen', int, 4090)
    .option('-m, --max-header-size <bytes>', 'Max HTTP header size', int, 65535)
    .option(
      '-c, --config <path>',
      'path to a config file',
      './ebyroid.conf.json'
    )
    .action(start);

  program
    .command('configure')
    .description('create a config file interactively')
    .option('-o, --output <file>', 'output file', './ebyroid.conf.json')
    .action(configure);

  program.on('--help', () => {
    console.log('');
    console.log('Try these:');
    console.log('  ebyroid start --help');
    console.log('  ebyroid configure --help');
    console.log('  ebyroid configure');
    console.log('');
  });

  await program.parseAsync(process.argv);

  if (!handled) {
    program.help();
  }
}

module.exports = main;
