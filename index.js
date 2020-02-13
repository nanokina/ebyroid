const WaveFile = require('wavefile').WaveFile;
const fs = require('fs');
const { Ebyroid } = require('./ebyroid');

Ebyroid.init('C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX', 'kiritan_22');

async function main() {

    await new Promise((r) => {
        setTimeout(() => r(), 5000);
    });
    
    let count = 100000;
    for (const _ of Array(100)) {
        Ebyroid.reinterpretText('まさよしのおなか').then((x) => console.log(`${++count}: ${x}`));
    }
    
    let cnt = 200000;
    for (const _ of Array(100)) {
        Ebyroid.speechReinterpretedText('アリガト').then((x) => console.log(`${++cnt}: ${x.length}`));
    }
    
    let c = 300000;
    for (const _ of Array(100)) {
        Ebyroid.speechText('ああああああああああああああああああああああああああああああああああああああああああ')
            .then((x) => console.log(`${++c}: ${x.length}`));
    }
}

main();

setTimeout(async () => {
    let pcmData = await Ebyroid.speechText('私がシュリンプちゃんです。またの名を海老といいます。伊勢海老じゃないよ');
    let wav = new WaveFile();
    wav.fromScratch(1, 44100, '16', pcmData);
    let oho = Math.random() * 100 | 0;
    fs.writeFileSync('TEST' + oho + '.wav', wav.toBuffer());
}, 10000);
