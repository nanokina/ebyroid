const assert = require('assert').strict;
const debug = require('debug')('ebyroid');

/** @typedef {import('./ebyroid')} Ebyroid */

function sanitizePath(path) {
  if ([...path].some(c => c.charCodeAt(0) > 127)) {
    throw new Error(
      'The path to VOICEROID directory may not contain any non-ascii character.'
    );
  }
  if (path.endsWith('\\')) {
    return path.slice(0, path.length - 1);
  }
  return path;
}

function guessVersion(name) {
  if (name.endsWith('_22')) {
    return 'VOICEROID+';
  }
  if (name.endsWith('_44')) {
    return 'VOICEROID2';
  }
  throw new Error(
    'Could not infer VOICEROID version. Make sure the given voice directory name is appropriate.'
  );
}

function sanitizeName(name) {
  if (name.endsWith('_22')) {
    const supports = ['kiritan', 'zunko', 'akane', 'aoi'];
    if (supports.some(s => name.startsWith(s))) {
      return name;
    }
    const names = supports.join('", "');
    throw new Error(
      `An unsopported VOICEROID+ library was given.\nEbyroid currently supports "${names}".\nWant your favorite library to get supported? Please open an issue or make a pull request!`
    );
  } else if (name.endsWith('_44')) {
    return name;
  } else {
    throw new Error('unreachable');
  }
}

function sanitizeVolume(volume) {
  if (typeof volume === 'undefined') {
    return 2.2;
  }
  if (typeof volume === 'number' && volume <= 5.0 && volume >= 0.0) {
    return volume;
  }
  throw new RangeError('options.volume should range from 0.0 to 5.0');
}

function sanitizeSampleRate(sampleRate, version) {
  if (typeof sampleRate === 'undefined') {
    return version === 'VOICEROID+' ? 22050 : 44100;
  }
  if (
    typeof sampleRate === 'number' &&
    [22050, 44100, 48000].includes(sampleRate)
  ) {
    return sampleRate;
  }
  throw new TypeError(
    'options.sampleRate should be one of 22050, 44100 or 48000'
  );
}

function sanitizeChannels(channels) {
  if (typeof channels === 'undefined') {
    return 1;
  }
  if (typeof channels === 'number' && channels < 2 && channels > 0) {
    return channels;
  }
  throw new TypeError('options.channels should be 1 or 2');
}

/**
 * Configurative options for a Voiceroid.
 * Note that variety of these values never affects Ebyroid on decision of exclusive reloading of voice libraries.
 *
 * @typedef VoiceroidOptions
 * @type {object}
 * @property {number} [volume=2.2] desired output volume (from 0.0 to 5.0) with 2.2 recommended.
 * @property {(22050|44100|48000)} [sampleRate=(22050|44100)] desired sample-rate of output PCM. VOICEROID+ defaults to 22050, and VOICEROID2 does to 44100. if a higher rate than default is given, Ebyroid will resample (upconvert) it to the rate.
 * @property {(1|2)} [channels=1] desired number of channels of output PCM. 1 stands for Mono, and 2 does for Stereo. since VOICEROID's output is always Mono, Ebyroid will manually interleave it when you set channels to 2.
 */

/**
 * Voiceroid data class contains necessary information to load the native library.
 * Note that the name identitier and optional settings never affect Ebyroid on its determination of whether to reload native libraries or not whereas the other params do.
 */
class Voiceroid {
  /**
   * Construct a Voiceroid data object.
   *
   * @param {string} name an identifiable name for this object.
   * @param {string} baseDirPath a path in which your VOICEROID's `.exe` is installed.
   * @param {string} voiceDirName a voice library dir, like `zunko_22` or `yukari_44`.
   * @param {VoiceroidOptions} [options={}] optional settings for this voiceroid.
   * @example
   * const yukari = new Voiceroid('Yukari-chan', 'C:\\Program Files (x86)\\AHS\\VOICEROID2', 'yukari_44');
   * const kiritan = new Voiceroid('Kiritan-chan', 'C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX', 'kiritan_22');
   * const ebyroid = new Ebyroid(yukari, kiritan);
   * ebyroid.use('Yukari-chan');
   */
  constructor(name, baseDirPath, voiceDirName, options = {}) {
    assert(typeof name === 'string' && name.length > 0);
    assert(typeof baseDirPath === 'string' && baseDirPath.length > 0);
    assert(typeof voiceDirName === 'string' && voiceDirName.length > 0);
    assert(typeof options === 'object');
    debug(
      'name=%s path=%s voice=%s options=%o',
      name,
      baseDirPath,
      voiceDirName,
      options
    );

    /**
     * the identifier of this object. {@link Ebyroid.use} takes this value as an argument.
     * @type {string}
     * @readonly
     */
    this.name = name;

    /**
     * the path in which `VOICEROID.exe` or `VoiceroidEditor.exe` is installed
     * @type {string}
     * @readonly
     */
    this.baseDirPath = sanitizePath(baseDirPath);

    /**
     * the version of the library
     * @type {"VOICEROID+"|"VOICEROID2"}
     * @readonly
     */
    this.version = guessVersion(voiceDirName);

    /**
     * the name of the directory where the voice library files are installed
     * @type {string}
     * @readonly
     */
    this.voiceDirName = sanitizeName(voiceDirName);

    /**
     * desired output volume
     * @type {number}
     * @readonly
     */
    this.outputVolume = sanitizeVolume(options.volume);

    /**
     * desired sample-rate of output PCM
     * @type {22050|44100|48000}
     * @readonly
     */
    this.outputSampleRate = sanitizeSampleRate(
      options.sampleRate,
      this.version
    );

    /**
     * desired number of channels of output PCM
     * @type {1|2}
     * @readonly
     */
    this.outputChannels = sanitizeChannels(options.channels);

    /**
     * the library's output sample-rate in Hz
     * @type {22050|44100}
     * @readonly
     */
    this.baseSampleRate = this.version === 'VOICEROID+' ? 22050 : 44100;

    debug('setup voiceroid object %O', this);
  }

  /**
   * Examine the equality.
   *
   * @param {Voiceroid} that the object that this instance examines equality with.
   * @returns {boolean}
   */
  equals(that) {
    if (!(that instanceof Voiceroid)) {
      return false;
    }
    return (
      this.name === that.name &&
      this.version === that.version &&
      this.baseDirPath === that.baseDirPath &&
      this.voiceDirName === that.voiceDirName &&
      this.outputVolume === that.outputVolume &&
      this.outputSampleRate === that.outputSampleRate &&
      this.outputChannels === that.outputChannels
    );
  }

  /**
   * Check if this and that are using same native library.
   *
   * @param {Voiceroid} that the object that this instance examines equality with.
   * @returns {boolean}
   */
  usesSameLibrary(that) {
    if (!(that instanceof Voiceroid)) {
      return false;
    }
    return (
      this.baseDirPath === that.baseDirPath &&
      this.voiceDirName === that.voiceDirName
    );
  }
}

module.exports = Voiceroid;
