const assert = require('assert').strict;
const iconv = require('iconv-lite');
const debug = require('debug')('ebyroid');
/** @type {import("./module_def")} */
const native = require('bindings')('ebyroid');
const Semaphore = require('./semaphore');
const WaveObject = require('./wave_object');

/** @typedef {import("./module_def").NativeOptions} NativeOptions */

/** @typedef {import("./voiceroid")} Voiceroid */

// shift-jis
const SHIFT_JIS = 'shiftjis';

/**
 * Class-wise global semaphore object.
 *
 * @type {Semaphore}
 */
const semaphore = new Semaphore(2);

/**
 * @type {Voiceroid[]}
 */
const fifo = [];

/**
 * The voiceroid that is currently used **in the native library**.
 *
 * @type {Voiceroid?}
 */
let current = null;

/**
 * @type {Ebyroid?}
 */
let singleton = null;

/**
 * @param {Ebyroid} self
 */
function validateOpCall(self) {
  assert(self.using !== null, 'operation calls must be called after .use()');
  assert(current !== null, 'ebyroid native module must have been initialized');
}

/**
 * @param {Voiceroid} vr
 * @param {Error} err
 * @returns {Voiceroid}
 */
function errorroid(vr, err) {
  // FIXME more graceful way to handle errors?
  return Object.assign(Object.create(Object.getPrototypeOf(vr)), vr, {
    baseDirPath: 'error',
    voiceDirName: err.message,
  });
}

/**
 * @returns {Voiceroid?}
 */
function lastRegistered() {
  const vr = fifo[fifo.length - 1];
  return vr || null;
}

/**
 * @param {Voiceroid} vr
 */
function register(vr) {
  fifo.push(vr);
  debug('(registered) fifo = %d', fifo.length);
}

/**
 * @param {Voiceroid} vr
 */
function unregister(vr) {
  assert(vr === fifo[0], 'unregisteration is equivalent to fifo.shift()');
  fifo.shift();
  debug('(unregistered) fifo = %d', fifo.length);
}

/**
 * @param {Voiceroid} vr
 * @returns {boolean}
 */
function needsLibraryReload(vr) {
  const lastreg = lastRegistered();
  const comparison = lastreg || current;
  return !vr.usesSameLibrary(comparison);
}

/**
 * @this Ebyroid
 * @param {string} text
 * @param {Voiceroid} [internal=null]
 * @returns {Promise<WaveObject>}
 */
async function internalConvertF(text, internal = null) {
  const buffer = iconv.encode(text, SHIFT_JIS);
  await semaphore.acquire();

  const vr = internal || this.using;
  assert(vr.usesSameLibrary(current), 'it must not need to reload');

  // TODO setup full options here
  const options = {
    needs_reload: false,
    volume: vr.outputVolume,
  };

  return new Promise((resolve, reject) =>
    native.convert(buffer, options, (err, pcmOut) => {
      current = vr;
      semaphore.release();
      if (err) {
        reject(err);
      } else {
        resolve(new WaveObject(pcmOut, vr.outputSampleRate));
      }
    })
  );
}

/**
 * Ebyroid class provides an access to the native VOICEROID+/VOICEROID2 libraries.
 */
class Ebyroid {
  /**
   * Construct an Ebyroid instance.
   *
   * @param  {...Voiceroid} voiceroids voiceroids to use.
   */
  constructor(...voiceroids) {
    assert(voiceroids.length > 0, 'at least one voiceroid must be given');
    debug('voiceroids = %O', voiceroids);

    /**
     * voiceroids to use.
     *
     * @type {Map<string, Voiceroid>}
     */
    this.voiceroids = new Map();
    voiceroids.forEach(vr => this.voiceroids.set(vr.name, vr));

    /**
     * the voiceroid currently used **by this instance**.
     *
     * @type {Voiceroid?}
     */
    this.using = null;
  }

  /**
   * Let ebyroid use a specific voiceroid library.
   * Distinctively, this operation may take a few seconds to complete when called first time.
   *
   * @param {string} voiceroidName a name identifier of the voiceroid to use
   * @example
   * const yukari = new Voiceroid('Yukari-chan', 'C:\\Program Files (x86)\\AHS\\VOICEROID2', 'yukari_44');
   * const kiritan = new Voiceroid('Kiritan-chan', 'C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX', 'kiritan_22');
   * const ebyroid = new Ebyroid(yukari, kiritan);
   * ebyroid.use('Kiritan-chan');
   */
  use(voiceroidName) {
    const vr = this.voiceroids.get(voiceroidName);
    if (!vr) {
      throw new Error(`Could not find a voiceroid by name "${voiceroidName}".`);
    }

    if (current === null) {
      debug('call init. voiceroid = %O', vr);
      try {
        native.init(vr.baseDirPath, vr.voiceDirName, vr.outputVolume);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize ebyroid native module', err);
        throw err;
      }
      current = vr;
    }
    debug('use %s', vr.name);
    this.using = vr;
  }

  /**
   * Convert text to a PCM buffer.
   * When a voiceroid corresponding to the given voiceroidName uses a different voice library than
   * the one currently used in the native library, it will acquire a mutex lock and reload native library.
   * In which case it may block all of other requests for fair amount of time like a two or three seconds.
   * See {@link Voiceroid} for further details.
   *
   * @param {string} text Raw utf-8 text to convert
   * @param {string} voiceroidName a name identifier of the voiceroid to use
   * @returns {Promise<WaveObject>} object that consists of a raw PCM buffer and format information
   */
  async convertEx(text, voiceroidName) {
    if (this.using === null) {
      // only when a user called this method without calling .use() once
      this.use(voiceroidName);
    }
    validateOpCall(this);

    const vr = this.voiceroids.get(voiceroidName);
    if (!vr) {
      throw new Error(`Could not find a voiceroid by name "${voiceroidName}".`);
    }

    if (!needsLibraryReload(vr)) {
      debug('convertEx() delegates to internalConvertF %s', vr.name);
      return internalConvertF.call(this, text, vr);
    }

    const buffer = iconv.encode(text, SHIFT_JIS);

    debug('register %s', vr.name);
    register(vr);

    debug('waiting for a lock');
    await semaphore.lock();
    debug('got a lock');

    assert(!vr.usesSameLibrary(current), 'it must need to reload');

    /** @type {NativeOptions} */
    const options = {
      needs_reload: true,
      base_dir: vr.baseDirPath,
      voice: vr.voiceDirName,
      volume: vr.outputVolume,
    };

    return new Promise((resolve, reject) =>
      native.convert(buffer, options, (err, pcmOut) => {
        debug('unregister %s', vr.name);
        unregister(vr);
        if (err) {
          current = errorroid(vr, err);
          reject(err);
          debug('unlock with error %O', err);
          setImmediate(() => semaphore.unlock());
        } else {
          current = vr;
          debug('unlock');
          semaphore.unlock();
          resolve(new WaveObject(pcmOut, vr.outputSampleRate));
        }
      })
    );
  }

  /**
   * Convert text to a PCM buffer. Prefer using this method whenever you can.
   *
   * @param {string} text Raw utf-8 text to convert
   * @returns {Promise<WaveObject>} object that consists of a raw PCM buffer and format information
   */
  convert(text) {
    validateOpCall(this);
    if (needsLibraryReload(this.using)) {
      debug('convert() escalates to convertEx()');
      return this.convertEx(text, this.using.name);
    }
    return internalConvertF.call(this, text);
  }

  /**
   * (Not Recommended) Compile text to an certain intermediate representation called 'AI Kana' that VOICEROID uses internally.
   * This method exists only to gratify your curiosity. No other use for it.
   *
   * @param {string} rawText Raw utf-8 text to reinterpret into 'AI Kana' representation
   * @returns {Promise<string>} AI Kana representation of the text
   */
  async rawApiCallTextToKana(rawText) {
    validateOpCall(this);
    const buffer = iconv.encode(rawText, SHIFT_JIS);
    await semaphore.acquire();

    return new Promise((resolve, reject) => {
      native.reinterpret(buffer, {}, (err, output) => {
        semaphore.release();
        if (err) {
          reject(err);
        } else {
          const utf8text = iconv.decode(output, SHIFT_JIS);
          resolve(utf8text);
        }
      });
    });
  }

  /**
   * (Not Recommended) Read out the given text __written in an intermediate representation called 'AI Kana'__ that VOICEROID uses internally.
   * This method exists only to gratify your curiosity. No other use for it.
   *
   * @param {string} aiKana AI Kana representation to read out
   * @returns {Promise<WaveObject>} object that consists of a raw PCM buffer and format information
   */
  async rawApiCallAiKanaToSpeech(aiKana) {
    validateOpCall(this);
    const buffer = iconv.encode(aiKana, SHIFT_JIS);
    await semaphore.acquire();

    return new Promise((resolve, reject) => {
      native.speech(buffer, {}, (err, pcmOut) => {
        semaphore.release();
        if (err) {
          reject(err);
        } else {
          resolve(new WaveObject(pcmOut, current.baseSampleRate));
        }
      });
    });
  }

  /**
   * Supportive static method for the case in which you like to use it as singleton.
   *
   * @param {Ebyroid} instance instance to save as singleton
   */
  static setInstance(instance) {
    singleton = instance;
  }

  /**
   * Supportive static method for the case in which you like to use it as singleton.
   *
   * @returns {Ebyroid?} the singleton instance (if set)
   */
  static getInstance() {
    return singleton;
  }
}

module.exports = Ebyroid;
