/**
 * Conversion result object that contains a PCM data and format information.
 */
class WaveObject {
  /**
   * @param {Int16Array} data 16bit PCM data
   * @param {number} sampleRate sample-rate of the data (Hz)
   */
  constructor(data, sampleRate) {
    /**
     * an array of signed 16bit integer values which represents 16bit Linear PCM data
     * @type {Int16Array}
     */
    this.data = data;
    /**
     * the bit depth of PCM data. this value is fixed to 16 unless any VOICEROID comes to support 24bit depth someday.
     * @type {16}
     */
    this.bitDepth = 16;
    /**
     * the sample-rate (samples per second) of PCM data. 22050Hz for VOICEROID+ and 44100Hz for VOICEROID2.
     * That's for now. Ebyroid's resampling feature will come soon.
     * @type {22050|44100}
     */
    this.sampleRate = sampleRate;
    /**
     * the number of channels in PCM data. 1 for Mono, 2 for Stereo. It's fixed to 1 due to VOICEROID's nature.
     * That's for now. Ebyroid soon will provide an option to interleave data into Stereo.
     * @type {1|2}
     */
    this.numChannels = 1;
  }
}

module.exports = WaveObject;
