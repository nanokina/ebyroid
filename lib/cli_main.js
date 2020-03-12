/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const root = require('yargs');
const Ebyroid = require('./ebyroid');
const Voiceroid = require('./voiceroid');
const MiniServer = require('./mini_server');

/** @typedef {root.Argv<{}>} Yargs */
/** @typedef {{ [key in keyof root.Arguments<{}>]: Arguments<{}>[key] }} Argv */

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
          dirent.isDirectory() && dirent.name !== 'VOICEROID2'
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
      : `That is not a valid ${version} directory.`;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return 'There is no such a directory.';
    }
    return `Something went wrong. Possibly an expception related to file access (code=${e.code})`;
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

/** @param {Argv} argv */
function configure(argv) {
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
      message: 'In which directory is it installed?',
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
      message: 'Give an unique name to this voiceroid settings!',
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
      message: 'Add one more settings for another voiceroid?',
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
    console.log(`Writing to "${argv.output}"...\n`);
    const json = JSON.stringify(objects, null, 2);
    fs.writeFileSync(argv.output, json);
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

/** @param {Argv} argv */
function start(argv) {
  console.log('Loading config from JSON file...');
  const json = fs.readFileSync(argv.config, 'utf8');
  const objects = JSON.parse(json);
  const vrs = objects.map(toVR);
  console.log(
    'Loaded',
    vrs.length,
    'voiceroid(s):',
    vrs.map(v => v.name).join(', ')
  );
  const ebyroid = new Ebyroid(...vrs);
  const defname = objects.find(o => o.default).name;
  ebyroid.use(defname);
  console.log(`Use "${defname}" as default...`);
  const mini = new MiniServer(ebyroid);
  console.log(`Starting up the server, with port ${argv.port}...`);
  mini.start(argv.port);
  console.log(`Server started! - http://localhost:${argv.port}/`);
  return 0;
}

const c = {
  command: 'configure',
  desc: 'create a configuration file',

  /** @param {Yargs} yargs */
  builder(yargs) {
    return yargs
      .option('output', {
        alias: 'o',
        describe: 'specify a path to output config file',
        default: './ebyroid.conf.json',
      })
      .normalize('output')
      .demandOption('output');
  },

  handler: configure,
};

const s = {
  command: 'start',
  desc: 'start the audiostream server',

  /** @param {Yargs} yargs */
  builder(yargs) {
    return yargs
      .option('config', {
        alias: 'c',
        describe: 'provide a path to config file',
        default: './ebyroid.conf.json',
      })
      .option('port', {
        alias: 'p',
        describe: 'specify a port to listen',
        default: 4090,
      })
      .normalize('config')
      .number('port')
      .demandOption('config');
  },

  handler: start,
};

function main() {
  const m = [
    'For more specific details:',
    '  ebyroid configure --help',
    '  ebyroid start --help',
    '',
    'Or just try:',
    '  ebyroid configure && ebyroid start',
  ];
  return root
    .scriptName('ebyroid')
    .command(c.command, c.desc, c.builder, c.handler)
    .command(s.command, s.desc, s.builder, s.handler)
    .demandCommand(1, m.join('\n'))
    .help().argv;
}

module.exports = main;
