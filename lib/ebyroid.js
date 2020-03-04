const iconv = require('iconv-lite');
const debug = require('debug')('ebyroid');
const ebyroid = require('bindings')('ebyroid');
const Semaphore = require('./semaphore');
const WaveObject = require('./wave_object');

const SHIFT_JIS = 'shiftjis';

class Ebyroid {
  static init(pathArg, voice, volume) {
    debug('path=%s voice=%s volume=%d', pathArg, voice, volume);

    this.ready = false;
    this.semaphore = new Semaphore(2);
    this.sampleRate = 0;

    if (this.ready) {
      throw new Error('Ebyroid.init が複数回呼び出されました。');
    }

    let path = pathArg;
    if (pathArg.endsWith('\\')) {
      path = pathArg.slice(0, pathArg.length - 1);
    }

    if (voice.endsWith('_22')) {
      const supports = ['kiritan', 'zunko', 'akane', 'aoi'];
      if (supports.some(name => voice.startsWith(name))) {
        // VOICEROID+ confirmed
        this.sampleRate = 22050;
      } else {
        throw new Error(
          '指定されたVOICEROID+ライブラリはサポートされていません。'
        );
      }
    } else {
      // VOICEROID2 confirmed
      this.sampleRate = 44100;
    }

    if (volume > 5.0 || volume < 0) {
      throw new RangeError('volumeは 0 ～ 5.0 で指定して下さい。');
    }

    ebyroid.init(path, voice, volume);
    this.ready = true;
  }

  static async convertWithReload(text, _options) {
    const buffer = iconv.encode(text, SHIFT_JIS);
    const options = { ..._options, needs_reload: true };
    await this.semaphore.lock();

    return new Promise((resolve, reject) => {
      ebyroid.convert(buffer, options, (err, pcmOut) => {
        this.semaphore.unlock();
        if (err) {
          reject(err);
        } else {
          this.sampleRate = _options.voice.endsWith('44') ? 44100 : 22050;
          resolve(new WaveObject(pcmOut, this.sampleRate));
        }
      });
    });
  }

  static async convert(text) {
    const buffer = iconv.encode(text, SHIFT_JIS);
    const options = { needs_reload: false };
    await this.semaphore.acquire();

    return new Promise((resolve, reject) => {
      ebyroid.convert(buffer, options, (err, pcmOut) => {
        this.semaphore.release();
        if (err) {
          reject(err);
        } else {
          resolve(new WaveObject(pcmOut, this.sampleRate));
        }
      });
    });
  }

  static async reinterpretText(rawText) {
    if (!this.ready) {
      return new Error(
        '初期化前に Ebyroid.reinterpretText が呼び出されました。'
      );
    }

    const buffer = iconv.encode(rawText, SHIFT_JIS);

    await this.semaphore.acquire();

    return new Promise((resolve, reject) => {
      ebyroid.reinterpret(buffer, {}, (err, output) => {
        this.semaphore.release();
        if (err) {
          reject(err);
        } else {
          const utf8text = iconv.decode(output, SHIFT_JIS);
          resolve(utf8text);
        }
      });
    });
  }

  static async speechReinterpretedText(reinterpretedText) {
    if (!this.ready) {
      return new Error(
        '初期化前に Ebyroid.speechReinterpretedText が呼び出されました。'
      );
    }

    const buffer = iconv.encode(reinterpretedText, SHIFT_JIS);

    await this.semaphore.acquire();

    return new Promise((resolve, reject) => {
      ebyroid.speech(buffer, {}, (err, pcmOut) => {
        this.semaphore.release();
        if (err) {
          reject(err);
        } else {
          resolve(new WaveObject(pcmOut, this.sampleRate));
        }
      });
    });
  }
}

module.exports = Ebyroid;
