
// Load C++ module 
const ebyroid = (() => {
    if (process.env.DEBUG) {
        return require('./build/Debug/ebyroid.node');
    } else {
        return require('./build/Release/ebyroid.node');
    }
})();

const iconv = require('iconv-lite'); // VOICEROID2くんはShift_JISしか取り扱えない
const Buffer = require('buffer').Buffer;
const debug = require('debug')('ebyroid');
debug.log = console.log.bind(console);

const Shift_JIS = 'shiftjis';

// ミニセマフォ
class Semaphore {

    constructor(max) {
        this._max = max;
        this._stone = 0;
        this._waitings = [];
    }

    acquire() {
        if (this._stone < this._max) {
            this._stone++;
            return new Promise((resolve) => resolve());
        } else {
            return new Promise((resolve) => {
                this._waitings.push({ resolve });
            });
        }
    }

    release() {
        this._stone--;
        if (this._waitings.length > 0) {
            this._stone++;
            let firstOne = this._waitings.shift();
            firstOne.resolve();
        }
    }

}

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

// えびロイド
class Ebyroid {

    static _ready = false;

    static _semaphore = new Semaphore(2); // ライブラリ内のキューが2つまでしかないので……

    static _sampleRate;

    /**
     * ネイティブモジュールでライブラリの初期化を行います。
     * @param {string} path - VOICEROID2のインストールパス
     * @param {string} voice - 音声ライブラリのフォルダ名
     * @param {number} volume - 出力波形のマスタ音量 1~5
     */
    static init(path = 'C:\\Program Files (x86)\\AHS\\VOICEROID2', voice = 'akari_44', volume = 2.5) {
        debug('Ebyroid.init arguments given: path=%s voice=%s volume=%d', path, voice, volume);

        if (this._ready) {
            throw new Error("Ebyroid.init が複数回呼び出されました。");
        }

        if (path.endsWith('\\')) {
            path = path.slice(0, path.length - 1);
        }

        if (voice.endsWith('_22')) {
            const supports = ['kiritan', 'zunko', 'akane', 'aoi'];
            if (supports.some((name) => voice.startsWith(name))) {
                // VOICEROID+ confirmed
                this._sampleRate = 22050;
            } else {
                throw new Error('指定されたVOICEROID+ライブラリはサポートされていません。');
            }
        } else {
            // VOICEROID2 confirmed
            this._sampleRate = 44100;
        }

        if (volume > 5.0 || volume < 0) {
            throw new RangeError('volumeは 0 ～ 5.0 で指定して下さい。');
        }

        ebyroid.init(path, voice, volume);
        this._ready = true;
    }

    /**
     * ネイティブモジュールで文章を読み上げます。
     * @param {string} text 読み上げる文章
     * @return {Promise<WaveObject>} 波形データオブジェクト
     */
    static async speechText(text) {

        if (!this._ready) {
            return new Error('初期化前に Ebyroid.speechText が呼び出されました。');
        }

        let buffer = iconv.encode(text, Shift_JIS);

        await this._semaphore.acquire();

        return new Promise((resolve) => {
            ebyroid.reinterpret(buffer, (kanaOut) => {
                ebyroid.speech(kanaOut, (pcmOut) => {
                    this._semaphore.release();
                    resolve(new WaveObject(pcmOut, this._sampleRate));
                });
            });
        });
    }

    /**
     * ネイティブモジュールで文章を再解釈してVOICEROID読み上げ可能なテキストに変換します。
     * 通常は {@link Ebyroid.speechText} を使用してください。
     * 
     * @param {string} rawText もとの文章
     * @return {Promise<string>} VOICEROIDが解釈可能なテキスト
     */
    static async reinterpretText(rawText) {

        if (!this._ready) {
            return new Error('初期化前に Ebyroid.reinterpretText が呼び出されました。');
        }

        let buffer = iconv.encode(rawText, Shift_JIS);

        await this._semaphore.acquire();

        return new Promise((resolve) => {
            ebyroid.reinterpret(buffer, (output) => {
                this._semaphore.release();
                let utf8text = iconv.decode(output, Shift_JIS);
                resolve(utf8text);
            });
        });
    }

    /**
     * ネイティブモジュールで解釈可能テキストを音声に変換します。
     * 通常は {@link Ebyroid.speechText} を使用して下さい。
     * 
     * @param {string} reinterpretedText VOICEROIDが解釈可能なテキスト
     * @return {Promise<WaveObject>} 波形データオブジェクト
     */
    static async speechReinterpretedText(reinterpretedText) {

        if (!this._ready) {
            return new Error('初期化前に Ebyroid.speechReinterpretedText が呼び出されました。');
        }

        let buffer = iconv.encode(reinterpretedText, Shift_JIS);

        await this._semaphore.acquire();

        return new Promise((resolve) => {
            ebyroid.speech(buffer, (pcmOut) => {
                this._semaphore.release();
                resolve(new WaveObject(pcmOut, this._sampleRate));
            });
        });
    }

}

module.exports = { Ebyroid };
