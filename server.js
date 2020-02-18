const WaveFile = require('wavefile').WaveFile;
const { Ebyroid } = require('./ebyroid');
const http = require('http');
const url = require('url');

Ebyroid.init('C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX', 'kiritan_22');

const server = http.createServer(async (req, res) => {
    const query = url.parse(req.url, true).query;
    if (query.text) {
        const waveObject = await Ebyroid.speechText(query.text);
        const buffer = Buffer.from(waveObject.data.buffer);
        const headers = {
            'Content-Type': 'application/octet-stream',
            'Content-Length': buffer.byteLength,
            'Ebyroid-PCM-Sample-Rate': waveObject.sampleRate,
            'Ebyroid-PCM-Bit-Depth': waveObject.bitDepth,
            'Ebyroid-PCM-Number-Of-Channels': waveObject.numChannels
        };
        res.writeHead(200, headers);
        res.write(buffer);
        res.end();

    } else {
        res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });

        let waveObject = await Ebyroid.speechText("なんかエラーが起きたみたいやな。");
        let wav = new WaveFile();
        wav.fromScratch(1, waveObject.sampleRate, '16', waveObject.data);

        res.end((new Buffer(wav.toBuffer())).toString('base64'));

    }


});

server.listen(4090);
