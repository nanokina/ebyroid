/* eslint-disable class-methods-use-this */
/* eslint-disable no-unused-vars */

// a silly js file that declares interface of the native module.
// this file should not be required from anywhere,
// with an exception for JSDoc only imports.

/**
 * @typedef NativeOptions
 * @type {object}
 * @property {boolean} needs_reload determines if native addon needs to reload the VOICEROID library
 * @property {string?} base_dir a path in which VOICEROID is installed
 * @property {string?} voice a directory name where the voice library files are at
 * @property {number?} volume desired output volume ranged from 0.0 to 5.0
 */

/**
 * Native ebyroid module's type interface.
 */
class NativeModule {
  /**
   * call convert
   *
   * @param {Buffer} input ShiftJIS bytecodes
   * @param {NativeOptions} options options to determine whether to reload or not
   * @param {function(Error,Int16Array):void} callback result is an array of 16bit PCM data
   * @abstract
   */
  convert(input, options, callback) {
    throw new Error('not implemented');
  }

  /**
   * call reinterpret
   *
   * @param {Buffer} input ShiftJIS bytecodes
   * @param {object} dummy the passing value should always be `{}`
   * @param {function(Error,Buffer)} callback result is a buffer of ShiftJIS bytecodes of AI Kana
   * @abstract
   */
  reinterpret(input, dummy, callback) {
    throw new Error('not implemented');
  }

  /**
   * call speech
   *
   * @param {Buffer} input ShiftJIS bytecodes of AI Kana
   * @param {object} dummy the passing value should always be `{}`
   * @param {function(Error,Int16Array)} callback result is an array of 16bit PCM data
   * @abstract
   */
  speech(input, dummy, callback) {
    throw new Error('not implemented');
  }
}

module.exports = NativeModule;
