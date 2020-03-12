# ebyroid
Ebyroid is a node native addon for `VOICEROID+` and `VOICEROID2` supports.\
It provides an access from Node.js Javascript to VOICEROIDs through N-API and native codes, which is fast.\
We also provide a standalone HTTP server as Win32 executable so you can avoid the **certain difficult problems**.

### Supported VOICEROIDs
- `VOICEROID2`
- `VOICEROID+` (partially)
  - Tohoku Zunko, Tohoku KiritanEx, Kotonoha Akane, Kotonoha Aoi

### Requirements (as npm package)
- Windows (10 or Server recomennded)
- **Node.js for Windows x86 (win32-ia32)** - `^12.13.1`
- [CMake for Windows](https://cmake.org/download/) - `^3.16.4`
- MSVC `^2017`, or just get the latest [Visual Studio Community](https://visualstudio.microsoft.com/ja/free-developer-offers/) if you aren't certain what it would mean
- Powershell `^3`
- Voiceroid libraries installed with a valid and legitimate license

### Requirements (as standalone server)
- Windows (10 or Server recommended)
- Voiceroid libraries installed with a valid and legitimate license

## Install
### npm package
After you fulfilled the requirements above:
```
npm i ebyroid
```

### standalone server
Go to [Releases](https://github.com/nanokina/ebyroid/releases) and download the latest `ebyroid-v*.zip`. Then unzip it to wherever you want (e.g. `C:\ebyroid`).


## Usage
### npm package

```js
const { Ebyroid, Voiceroid } = require('ebyroid');

const akari = new Voiceroid('akari-chan', 'C:\\Program Files (x86)\\AHS\\VOICEROID2', 'akari_44');
const kiritan = new Voiceroid('kiritan-chan', 'C:\\Program Files (x86)\\AHS\\VOICEROID+\\KiritanEX', 'kiritan_22');

const ebyroid = new Ebyroid(akari, kiritan);

ebyroid.use('akari-chan');

async function main() {
  const pcm1 = await ebyroid.convert('こんにちは');
  const pcm2 = await ebyroid.convertEx('東京特許許可局東京特きょきょきゃこく', 'kiritan-chan');
  // and your code goes here...
}

main();
```

### standalone server

on CMD

```
C:\ebyroid> ebyroid.exe configure
C:\ebyroid> ebyroid.exe start --port 3333
```

on Powershell

```
PS C:\ebyroid> ./ebyroid configure
PS C:\ebyroid> ./ebyroid start --port 4567
```


## API Endpoints of Standalone Server

### `GET /api/v1/audiostream`

#### query parameters

|  id   |  type  | required | desc             | example                      |
| :---: | :----: | :------: | :--------------- | :--------------------------- |
| text  | string | **yes**  | TTS content      | `text=今日は%20はじめまして` |
| name  | string |    no    | Voiceroid to use | `name=kiritan-chan`          |

#### response types

- `200 OK` => `application/octet-stream`
- `4xx` and `5xx` => `application/json`

#### extra response headers

|               id               |        value        | desc            |
| :----------------------------: | :-----------------: | :-------------- |
|    Ebyroid-PCM-Sample-Rate     | `22050\|44100\|48000` | Samples per sec |
|     Ebyroid-PCM-Bit-Depth      |        `16`         | Fixed to 16-bit |
| Ebyroid-PCM-Number-Of-Channels |        `1\|2`        | Mono or Stereo  |

Note that these headers will be sent only with `200 OK`.

#### response body

Byte stream of the [Linear PCM](http://soundfile.sapp.org/doc/WaveFormat/) data.\
The stream doesn't contain file header bytes since this endpoint is rather for those who want to deal with raw audio data.\
Use `GET /api/v1/audiofile` instead if you demand `.wav` file.

### `GET /api/v1/audiofile`

#### query parameters

|  id   |  type  | required | desc             | example                    |
| :---: | :----: | :------: | :--------------- | :------------------------- |
| text  | string | **yes**  | TTS content      | `text=今晩は%20さようなら` |
| name  | string |    no    | Voiceroid to use | `name=akane-chan`          |

#### response types

- `200 OK` => `audio/wav`
- `4xx` and `5xx` => `application/json`

#### extra response headers

None.

#### response body

Complete data for a `.wav` file.\
Any modern browser should support either to play or to download it.

## FAQ

### Why do I have to use 32-bit node?

Because Ebyroid is a native addon that interacts with VOICEROID's 32-bit native code.\
When you need to interact with 32-bit code, it is necessary that your code also runs in 32-bit.

### How do I switch 64-bit node and 32-bit node?

Use [nvm](https://github.com/coreybutler/nvm-windows). Also consider to use Ebyroid's standalone server.

### VOICEROID+ supports looks poor, why?

As of `VOICEROID2`, the software design is sophisticated and there's only one executable while voice librariy varies.\
That's why `VOICEROID2` is fully supported. Just making a support for the one executable works fine.

In contrast, every `VOICEROID+` has its own executable, which means I need to write an individual support for each library.\
And I just f--king ran out of money after buying 4 of them.

I'd appreciate your support as in making a pull request, opening an issue or emailing me.

### Does Ebyroid support concurrency?

Yes. It sticks to asynchronous operation as hard as I can do in native code so as not to break Node's concept.\
That results in Ebyroid being able to process `^100RPS` when the CPU is fast enough.

That said, however, some operation like switching voiceroid may acquire the inter-thread lock and take couple hundreds of millis (200ms-400ms practically) solely by itself. Be aware that frequent occurrance of such events may lead to slowen the whole app.

## License
MIT. See LICENSE.

## Disclaimer
Since Ebyroid is merely an ad-hoc, non-profit, open source and free library that interacts with VOICEROID, it doesn't contain any data with commercial value nor has any intent to exploit. Ebyroid only uses information loaded to RAM in human readable format, such like a string, considered to be public, as means of Fair Use of public information.

I will never be responsible for any consequences in connection with any use of Ebyroid or anyone that uses Ebyroid. I will only be concerned with calls of the US federal courts through Github, Inc. thus any other call and request from other authority or a company shall be ignored and immediately removed.

FAIR-USE COPYRIGHT DISCLAIMER

Copyright Disclaimer Under Section 107 of the Copyright Act 1976, allowance is made for "fair use" for purposes such as criticism, commenting, news reporting, teaching, scholarship, and research. Fair use is a use permitted by copyright statute that might otherwise be infringing. Non-profit, educational or personal use tips the balance in favour of fair use.

## catgirl

![ebyroid](https://user-images.githubusercontent.com/24854132/76497659-c90dc080-647e-11ea-9249-33bcc8d74f64.png)

### sister project

- [Hanako](https://www.github.com/Ebycow/hanako) - Discord TTS Bot for Wide-Use
