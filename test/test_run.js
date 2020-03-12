/* eslint-disable no-console */
const fs = require('fs');
const { WaveFile } = require('wavefile');
const Ebyroid = require('../lib/ebyroid');
const Voiceroid = require('../lib/voiceroid');

const a = new Voiceroid(
  'kiri',
  'C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX',
  'kiritan_22'
);
const b = new Voiceroid(
  'akarin',
  'C:\\Program Files (x86)\\AHS\\VOICEROID2',
  'akari_44'
);
const ebyroid = new Ebyroid(a, b);
ebyroid.use('kiri');

async function main() {
  await new Promise(r => {
    setTimeout(() => r(), 5000);
  });

  new Array(100).fill(true).forEach((_, i) => {
    ebyroid
      .rawApiCallTextToKana('東京特許許可局許可局長')
      .then(x => console.error(`reinterpret ${i}: ${x}`));
  });

  new Array(100).fill(true).forEach((_, i) => {
    ebyroid
      .rawApiCallAiKanaToSpeech('アリガト')
      .then(x => console.log(`speech ${i}: ${x.data.length}`));
  });

  new Array(100).fill(true).forEach((_, i) => {
    ebyroid
      .convert('あああああああああああああああああああああ')
      .then(x => console.log(`convert ${i}: ${x.data.length}`));
  });

  const voices = ['kiri', 'akarin'];

  new Array(300).fill(true).forEach((_, i) => {
    const name = voices[(Math.random() * 2) | 0];
    ebyroid
      .convertEx('どうか助けて下さい。', name)
      .then(x => console.log(`convertEx ${i}: ${x.data.length}`));
  });
}

main();

setTimeout(async () => {
  const waveObject = await ebyroid.convert(
    '私がシュリンプちゃんです。またの名を海老といいます。伊勢海老じゃないよ'
  );
  const wav = new WaveFile();
  wav.fromScratch(1, waveObject.sampleRate, '16', waveObject.data);
  const oho = (Math.random() * 100) | 0;
  fs.writeFileSync(`TEST${oho}.wav`, wav.toBuffer());
}, 10000);
