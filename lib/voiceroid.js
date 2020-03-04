const debug = require('debug')('ebyroid');

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
  if (typeof volume === 'number' && volume <= 5.0 && volume >= 0.0) {
    return volume;
  }
  throw new Error('Volume must range from 0.0 to 5.0');
}

/**
 * Voiceroid data class contains necessary information to import its library.
 */
class Voiceroid {
  /**
   * Construct a Voiceroid data object.
   *
   * @param {string} baseDirPath a path in which your VOICEROID's `.exe` is installed.
   * @param {string} voiceDirName a voice data dir, like `zunko_22` or `yukari_44`.
   * @param {number} [volume=2.2] desired output volume (0.0 to 5.0) with 2.2 recommended.
   * @example
   * // As for Kiritan (VOICEROID+)
   * baseDirPath = 'C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX';
   * voiceDirName = 'kiritan_22';
   * // As for Yukari (VOICEROID2)
   * baseDirPath = 'C:\\Program Files (x86)\\AHS\\VOICEROID2';
   * voiceDirName = 'yukari_44';
   */
  constructor(baseDirPath, voiceDirName, volume = 2.2) {
    debug('path=%s voice=%s volume=%d', baseDirPath, voiceDirName, volume);

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
     * the directory where the voice library is installed
     * @type {string}
     * @readonly
     */
    this.voiceDirName = sanitizeName(voiceDirName);

    /**
     * desired output volume
     * @type {number}
     * @readonly
     */
    this.volume = sanitizeVolume(volume);
    // FIXME Maybe remove it? Seems irrelevant.

    /**
     * the library's output sample-rate in Hz
     * @type {22050|44100}
     */
    this.baseSampleRate = this.version === 'VOICEROID+' ? 22050 : 44100;

    debug('setup voiceroid object %O', this);
  }

  /**
   * Examine the equality.
   *
   * @param {Voiceroid} that the object that this instance examines equality with.
   */
  equals(that) {
    if (!(that instanceof Voiceroid)) {
      return false;
    }
    return (
      this.version === that.version && this.voiceDirName === that.voiceDirName
    );
  }
}

module.exports = Voiceroid;
