const WaveFile = require('wavefile').WaveFile;
const { Ebyroid } = require('./ebyroid');
const http = require('http');
const url = require('url');

Ebyroid.init('C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX', 'kiritan_22');

const server = http.createServer(async (req, res) => {
    const query = url.parse(req.url, true).query;
    if (!query.text) {
        const json = JSON.stringify({ error: 'Invalid argument' });
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': json.length
        }
        res.writeHead(400, headers);
        res.write(json);
        res.end();

        return;
    }

    try {
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
    } catch (e) {
        const json = JSON.stringify({ error: e.message });
        const headers = {
            'Content-Type': 'application/json; charset=utf-8',
            'Content-Length': json.length
        }
        res.writeHead(500, headers);
        res.write(json);
        res.end();
    }
});

server.listen(4090);
