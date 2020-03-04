/* eslint-disable no-console */
const fs = require('fs');
const { WaveFile } = require('wavefile');
const Ebyroid = require('../lib/ebyroid');

Ebyroid.init(
  'C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX',
  'kiritan_22',
  2.2
);

async function main() {
  await new Promise(r => {
    setTimeout(() => r(), 5000);
  });

  new Array(100).fill(true).forEach((_, i) => {
    Ebyroid.reinterpretText('東京特許許可局許可局長').then(x =>
      console.error(`reinterpret ${i}: ${x}`)
    );
  });

  new Array(100).fill(true).forEach((_, i) => {
    Ebyroid.speechReinterpretedText('アリガト').then(x =>
      console.log(`speech ${i}: ${x.data.length}`)
    );
  });

  new Array(100).fill(true).forEach((_, i) => {
    Ebyroid.convert('あああああああああああああああああああああ').then(x =>
      console.log(`convert ${i}: ${x.data.length}`)
    );
  });

  const options = {
    base_dir: 'C:\\Program Files (x86)\\AHS\\VOICEROID2',
    voice: 'akari_44',
    volume: 2.1,
  };

  new Array(100).fill(true).forEach((_, i) => {
    Ebyroid.convertWithReload('どうか助けて下さい。', options).then(x =>
      console.log(`convertWithReload ${i}: ${x.data.length}`)
    );
  });
}

main();

setTimeout(async () => {
  const waveObject = await Ebyroid.convert(
    '私がシュリンプちゃんです。またの名を海老といいます。伊勢海老じゃないよ'
  );
  const wav = new WaveFile();
  wav.fromScratch(1, waveObject.sampleRate, '16', waveObject.data);
  const oho = (Math.random() * 100) | 0;
  fs.writeFileSync(`TEST${oho}.wav`, wav.toBuffer());
}, 10000);
