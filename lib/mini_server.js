const http = require('http');

/** @typedef {import('./ebyroid')} Ebyroid */

/**
 * @param {http.ServerResponse} res
 * @param {number} code
 * @param {string} message
 */
function error4x(res, code, message) {
  const json = JSON.stringify({ error: message });
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': json.length,
  };
  res.writeHead(code, headers);
  res.write(json);
  res.end();
}

/**
 * @param {http.ServerResponse} res
 * @param {string} ecode
 * @param {string} emessage
 */
function error500(res, ecode, emessage) {
  const json = JSON.stringify({
    error: 'internal server error',
    code: ecode,
    message: emessage,
  });
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': json.length,
  };
  res.writeHead(500, headers);
  res.write(json);
  res.end();
}

function ok(res) {
  const json = JSON.stringify({ status: 'ok' });
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': json.length,
  };
  res.writeHead(200, headers);
  res.write(json);
  res.end();
}

/**
 * @this MiniServer
 * @param {http.ServerResponse} res
 * @param {URLSearchParams} params
 */
async function onGetAudioStreamF(res, params) {
  const text = params.get('text');
  if (!text) {
    return error4x(res, 400, 'text was not given');
  }
  try {
    let pcm;
    const name = params.get('name');
    if (name && name !== this.defaultName) {
      pcm = await this.ebyroid.convertEx(text, name);
    } else {
      pcm = await this.ebyroid.convert(text);
    }
    const buffer = Buffer.from(pcm.data.buffer);
    const headers = {
      'Content-Type': 'application/octet-stream',
      'Content-Length': buffer.byteLength,
      'Ebyroid-PCM-Sample-Rate': pcm.sampleRate,
      'Ebyroid-PCM-Bit-Depth': pcm.bitDepth,
      'Ebyroid-PCM-Number-Of-Channels': pcm.numChannels,
    };
    res.writeHead(200, headers);
    res.write(buffer);
    res.end();
    return undefined;
  } catch (e) {
    return error500(res, e.code, e.message);
  }
}

/**
 * @this MiniServer
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
async function onRequestF(req, res) {
  if (req.method !== 'GET') {
    return error4x(res, 400, 'bad request');
  }

  const url = new URL(req.url, `http://${req.headers.host}/`);
  if (!url.pathname.startsWith(this.basePath)) {
    return error4x(res, 404, 'not found');
  }

  const pathname = url.pathname.slice(this.basePath.length);
  switch (pathname) {
    case '':
    case '/':
      return ok(res);
    case '/audiostream':
      return onGetAudioStreamF.call(this, res, url.searchParams);
    default:
      return error4x(res, 404, 'not found');
  }
}

/**
 * Ebyroid's built-in audiostream server
 */
class MiniServer {
  /**
   * @param {Ebyroid} ebyroid
   * @param {number} maxHeaderSize
   */
  constructor(ebyroid, maxHeaderSize = 65536) {
    this.ebyroid = ebyroid;
    this.basePath = '/api/v1';
    this.server = http.createServer({ maxHeaderSize }, onRequestF.bind(this));
  }

  /**
   * @param {number} port
   */
  start(port) {
    this.defaultName = this.ebyroid.using.name;
    this.server.listen(port);
  }

  end() {
    this.server.close();
  }
}

module.exports = MiniServer;
