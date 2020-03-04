class WaveObject {
  /**
   * @param {Int16Array} data 16bit PCM data
   * @param {number} sampleRate sample-rate of the data (Hz)
   */
  constructor(data, sampleRate) {
    this.data = data;
    this.bitDepth = 16;
    this.sampleRate = sampleRate;
    this.numChannels = 1;
  }
}

module.exports = WaveObject;
