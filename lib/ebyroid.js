const assert = require('assert').strict;
const iconv = require('iconv-lite');
const debug = require('debug')('ebyroid');
/** @type {import("./module_def")} */
const ebyroid = require('bindings')('ebyroid');
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
 * The voiceroid that is currently used in the native library.
 *
 * @type {Voiceroid?}
 */
let current = null;

/**
 * @type {Ebyroid?}
 */
let singleton = null;

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
     * @type {Voiceroid[]} voiceroids to use.
     */
    this.voiceroids = voiceroids;
  }

  /**
   * Let ebyroid use a specific voiceroid library. Distinctively, this operation may take a few seconds to complete.
   *
   * @param {string} voiceDirName as an identifier of the voiceroids already setup by constructor. like `"zunko_22"` or `"yukari_44"`.
   */
  async use(voiceDirName) {
    const voiceroid = this.voiceroids.find(
      v => v.voiceDirName === voiceDirName
    );
    if (!voiceroid) {
      throw new Error(
        `Could not find a voiceroid by identifier "${voiceDirName}".`
      );
    }

    await semaphore.lock();
    if (current === null) {
      debug('call init. voiceroid = %O', voiceroid);
      try {
        ebyroid.init(
          voiceroid.baseDirPath,
          voiceroid.voiceDirName,
          voiceroid.volume
        );
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to initialize ebyroid C++ module', err);
        // eslint-disable-next-line no-process-exit
        process.exit(-1);
      }
      current = voiceroid;
      semaphore.unlock();
    } else {
      // FIXME needs setup only method?
      debug('call convert with needs_reload = true. voiceroid = %O', voiceroid);

      const options = {
        needs_reload: true,
        base_dir: voiceroid.baseDirPath,
        voice: voiceroid.voiceDirName,
        volume: voiceroid.volume,
      };
      debug('options %O', options);
      try {
        await new Promise((resolve, reject) =>
          ebyroid.convert('dummy text', options, err => {
            if (err) reject(err);
            else resolve();
          })
        );
        current = voiceroid;
      } catch (err) {
        debug('Fatal failure of reloading library. voiceroid = %O', err);
        /** @type {Voiceroid} */
        const clone = Object.assign(
          Object.create(Object.getPrototypeOf(voiceroid)),
          voiceroid
        );
        clone.voiceDirName = 'definitely_needs_reload'; // breaks equality with everything
        current = clone;
        throw err;
      } finally {
        semaphore.unlock();
      }
    }
  }

  /**
   * Convert text to a PCM buffer.
   * When voiceDirName is given and the demanded voiceroid is NOT the current one, it will aqcuire mutex lock and reload the native library.
   * In which case it may block all of other requests for fair amount of time like a two or three seconds.
   *
   * @param {string} text Raw utf-8 text to convert
   * @param {string?} [voiceDirName=null] as an identifier of the voiceroids already setup by constructor. like `"zunko_22"` or `"yukari_44"`.
   * @returns {Promise<WaveObject>} object that consists of a raw PCM buffer and format information
   */
  async convertEx(text, voiceDirName = null) {
    if (!voiceDirName) {
      return this.convert(text);
    }
    const vr = this.voiceroids.find(v => v.voiceDirName === voiceDirName);
    if (!vr) {
      throw new Error(
        `Could not find a voiceroid by identifier "${voiceDirName}".`
      );
    } else if (vr.equals(current)) {
      return this.convert(text);
    }

    const buffer = iconv.encode(text, SHIFT_JIS);
    const options = {
      needs_reload: true,
      base_dir: vr.baseDirPath,
      voice: vr.voiceDirName,
      volume: vr.volume,
    };
    await semaphore.lock();

    return new Promise((resolve, reject) => {
      ebyroid.convert(buffer, options, (err, pcmOut) => {
        current = vr;
        semaphore.unlock();
        if (err) {
          // FIXME current = null;?
          reject(err);
        } else {
          resolve(new WaveObject(pcmOut, current.baseSampleRate));
        }
      });
    });
  }

  /**
   * Convert text to a PCM buffer. Prefer using this method whenever you can.
   *
   * @param {string} text Raw utf-8 text to convert
   * @returns {Promise<WaveObject>} object that consists of a raw PCM buffer and format information
   */
  // eslint-disable-next-line class-methods-use-this
  async convert(text) {
    const buffer = iconv.encode(text, SHIFT_JIS);
    const options = { needs_reload: false };
    await semaphore.acquire();

    return new Promise((resolve, reject) => {
      ebyroid.convert(buffer, options, (err, pcmOut) => {
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
   * (Not Recommended) Compile text to an certain intermediate representation called 'AI Kana' that VOICEROID uses internally.
   * This method exists only to gratify your curiosity. No other use for it.
   *
   * @param {string} rawText Raw utf-8 text to reinterpret into 'AI Kana' representation
   * @returns {Promise<string>} AI Kana representation of the text
   */
  // eslint-disable-next-line class-methods-use-this
  async rawApiCallTextToKana(rawText) {
    const buffer = iconv.encode(rawText, SHIFT_JIS);
    await semaphore.acquire();

    return new Promise((resolve, reject) => {
      ebyroid.reinterpret(buffer, {}, (err, output) => {
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
  // eslint-disable-next-line class-methods-use-this
  async rawApiCallAiKanaToSpeech(aiKana) {
    const buffer = iconv.encode(aiKana, SHIFT_JIS);
    await semaphore.acquire();

    return new Promise((resolve, reject) => {
      ebyroid.speech(buffer, {}, (err, pcmOut) => {
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
