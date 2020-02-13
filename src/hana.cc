#include <string>
#include <stdexcept>

#include <Windows.h>

#include "nekomimi.h"
#include "nekobuilder.h"
#include "ebyutil.h"
#include "hana.h"

namespace Hana {

    using std::string, std::vector;
    using Nekomimi::ResultCode;

    Hanako* Hanako::Create(string pathToWorkingDir, string voice, float volume) {
        Nekomimi::SettingBuilder builder(pathToWorkingDir, voice);
        Nekomimi::Setting setting = builder.Build();

        Nekomimi::APIAdapter* adapter = Nekomimi::APIAdapter::Create(setting.dllPath);
        if (adapter == nullptr) {
            throw std::runtime_error(string("Could not open the library file.\n\tGiven Path: ") + setting.dllPath);
        }

        Nekomimi::TConfig config;
        config.hzVoiceDB = setting.frequency;
        config.msecTimeout = 1000;
        config.pathLicense = setting.licensePath;
        config.dirVoiceDBS = setting.voiceDir;
        config.codeAuthSeed = setting.seed;
        config.lenAuthSeed = Nekomimi::LEN_SEED_VALUE_;

        if (ResultCode result = adapter->Init(&config); result != ResultCode::ERR_SUCCESS) {
            delete adapter;
            string errorMessage = "API initialization failed with code ";
            errorMessage += std::to_string(result);
            throw std::runtime_error(errorMessage);
        }

        char properPath[MAX_PATH];
        if (DWORD result = GetCurrentDirectoryA(MAX_PATH, properPath); result == 0) {
            delete adapter;
            string errorMessage = "Could not get the path to working directory properly. GetLastError() = ";
            errorMessage += std::to_string(GetLastError());
            throw std::runtime_error(errorMessage);
        }
        if (BOOL result = SetCurrentDirectoryA(setting.baseDir); !result) {
            delete adapter;
            string errorMessage = "Could not change working directory properly. GetLastError() = ";
            errorMessage += std::to_string(GetLastError());
            throw std::runtime_error(errorMessage);
        }
        if (ResultCode result = adapter->LangLoad(setting.languageDir); result != ResultCode::ERR_SUCCESS) {
            delete adapter;
            string errorMessage = "API Load Language failed (Could not load language file) with code ";
            errorMessage += std::to_string(result);
            throw std::runtime_error(errorMessage);
        }
        if (BOOL result = SetCurrentDirectoryA(properPath); !result) {
            delete adapter;
            string errorMessage = "Could not restore working directory properly. GetLastError() = ";
            errorMessage += std::to_string(GetLastError());
            throw std::runtime_error(errorMessage);
        }

        if (ResultCode result = adapter->VoiceLoad(setting.voiceName); result != ResultCode::ERR_SUCCESS) {
            delete adapter;
            string errorMessage = "API Load Voice failed (Could not load voice data) with code ";
            errorMessage += std::to_string(result);
            throw std::runtime_error(errorMessage);    
        }

        uint32_t paramSize = 0;
        if (ResultCode result = adapter->GetParam((void*)0, &paramSize);
                                result != ResultCode::ERR_INSUFFICIENT) { // NOTE: Code -20 is expected here
            delete adapter;
            string errorMessage = "API Get Param failed (Could not acquire the size) with code ";
            errorMessage += std::to_string(result);
            throw std::runtime_error(errorMessage); 
        }
        // std::cout << "paramSize: "  << paramSize << std::endl;
        // std::cout << "sizeof(Nekomimi::TTtsParam): " << sizeof(Nekomimi::TTtsParam) << std::endl;
        // assert(paramSize == sizeof(Nekomimi::TTtsParam));

        char* allocatedMemory = new char[paramSize];
        Nekomimi::TTtsParam* param = (Nekomimi::TTtsParam*) allocatedMemory;
        param->size = paramSize;
        if (ResultCode result = adapter->GetParam(param, &paramSize); result != ResultCode::ERR_SUCCESS) {
            delete[] allocatedMemory;
            delete adapter;
            string errorMessage = "API Get Param failed with code ";
            errorMessage += std::to_string(result);
            throw std::runtime_error(errorMessage);             
        }
        param->extendFormat = Nekomimi::JeitaRuby;
        param->procTextBuf = HiraganaCallback;
        param->procRawBuf = SpeechCallback;
        param->procEventTts = ProcEventTTS;
        param->lenRawBufBytes = Nekomimi::CONFIG_RAWBUF_SIZE_;
        param->volume = volume;
        param->speaker[0].volume = 1.0;

        if (ResultCode result = adapter->SetParam(param); result != ResultCode::ERR_SUCCESS) {
            delete[] allocatedMemory;
            delete adapter;
            string errorMessage = "API Set Param failed with code ";
            errorMessage += std::to_string(result);
            throw std::runtime_error(errorMessage);             
        }

        delete[] allocatedMemory;

        Hanako* hanako = new Hanako();
        hanako->m_APIAdapter = adapter;
        return hanako;
    }

    int Hanako::Hiragana(const unsigned char* inbytes, unsigned char** outbytes, size_t* outsize) {
        Response* const response = new Response(this);

        Nekomimi::TJobParam param;
        param.modeInOut = Nekomimi::JobInOut::IOMODE_PLAIN_TO_AIKANA;
        param.userData = response;

        char eventname[32];
        sprintf(eventname, "TTKLOCK:%p", response);

        HANDLE event = CreateEventA(NULL, TRUE, FALSE, eventname);

        int32_t jobID;
        if (ResultCode result = m_APIAdapter->TextToKana(&jobID, &param, (const char*) inbytes); result != Nekomimi::ERR_SUCCESS) {
            delete response;
            throw std::runtime_error(string("TextToKana failed with result code ") + std::to_string(result));
        }

        WaitForSingleObject(event, INFINITE);
        ResetEvent(event);
        CloseHandle(event);
        
        // finalize
        if (ResultCode result = m_APIAdapter->CloseKana(jobID); result != Nekomimi::ERR_SUCCESS) {
            delete response;
            throw std::runtime_error("wtf");
        }

        // write to output memory
        vector<unsigned char> buffer = response->End();
        *outsize = buffer.size();
        *outbytes = (unsigned char*) malloc(buffer.size() + 1);
        std::copy(buffer.begin(), buffer.end(), *outbytes);
        *(*outbytes + buffer.size()) = '\0';

        delete response;
        return 0;
    }

    int __stdcall Hanako::HiraganaCallback(Nekomimi::EventReasonCode reasonCode, int32_t jobID, Nekomimi::IntPtr userData) {
        Response* const response = (Response*) userData;

        if (reasonCode != Nekomimi::TEXTBUF_FULL && reasonCode != Nekomimi::TEXTBUF_FLUSH && reasonCode != Nekomimi::TEXTBUF_CLOSE) {
            // unexpected: may possibly lead to memory leak
            return 0;
        }

        static const int BUFFER_LENGTH = 1024;
        char* memory = new char[BUFFER_LENGTH];
        while (true) {
            uint32_t size, pos;
            if (ResultCode result = response->owner->m_APIAdapter->GetKana(jobID, memory, BUFFER_LENGTH, &size, &pos); 
                result != Nekomimi::ERR_SUCCESS) {
                break;       
            }
            response->Write(memory, size);
            if (BUFFER_LENGTH > size) {
                break;
            }
        }
        delete[] memory;

        if (reasonCode == Nekomimi::TEXTBUF_CLOSE) {
            // CLOSEイベントの後にこのコールバックが呼ばれることは実践上ない

            char eventname[32];
            sprintf(eventname, "TTKLOCK:%p", response);
            HANDLE event = OpenEventA(EVENT_ALL_ACCESS, FALSE, eventname);
            SetEvent(event);
        }
        return 0;
    }

    int Hanako::Speech(const unsigned char* inbytes, short** outbytes, size_t* outsize) {
        Response* const response = new Response(this);
        
        Nekomimi::TJobParam param;
        param.modeInOut = Nekomimi::JobInOut::IOMODE_AIKANA_TO_WAVE;
        param.userData = response;

        char eventname[32];
        sprintf(eventname, "TTSLOCK:%p", response);
        HANDLE event = CreateEventA(NULL, TRUE, FALSE, eventname);

        int32_t jobID;
        if (ResultCode result = m_APIAdapter->TextToSpeech(&jobID, &param, (const char*) inbytes); result != Nekomimi::ERR_SUCCESS) {
            delete response;
            throw std::runtime_error(string("TextToSpeech failed with result code ") + std::to_string(result));
        }

        WaitForSingleObject(event, INFINITE);
        ResetEvent(event);
        CloseHandle(event);
        
        // finalize
        if (ResultCode result = m_APIAdapter->CloseSpeech(jobID); result != Nekomimi::ERR_SUCCESS) {
            delete response;
            throw std::runtime_error("wtf");
        }

        // write to output memory
        vector<int16_t> buffer = response->End16();
        *outsize = buffer.size() * 2; // sizeof(int16_t) == sizeof(short) == 2
        *outbytes = (short*) malloc(buffer.size() * 2 + 1);
        std::copy(buffer.begin(), buffer.end(), *outbytes);
        *((char *)*outbytes + (buffer.size() * 2)) = '\0';

        delete response;
        return 0;
    }

    int __stdcall Hanako::SpeechCallback(Nekomimi::EventReasonCode reasonCode, int32_t jobID, uint64_t tick, Nekomimi::IntPtr userData) {
        Response* const response = (Response*) userData;

        if (reasonCode != Nekomimi::RAWBUF_FULL && reasonCode != Nekomimi::RAWBUF_FLUSH && reasonCode != Nekomimi::RAWBUF_CLOSE) {
            // unexpected: may possibly lead to memory leak
            return 0;
        }

        static const int BUFFER_LENGTH = 0xFFFF;
        int16_t* memory = new int16_t[BUFFER_LENGTH];
        while (true) {
            uint32_t size, pos;
            if (ResultCode result = response->owner->m_APIAdapter->GetData(jobID, memory, BUFFER_LENGTH, &size); 
                result != Nekomimi::ERR_SUCCESS) {
                break;
            }
            response->Write16(memory, size);
            if (BUFFER_LENGTH > size) {
                break;
            }
        }
        delete[] memory;

        if (reasonCode == Nekomimi::RAWBUF_CLOSE) {
            // CLOSEイベントの後にこのコールバックが呼ばれることは実践上ない

            char eventname[32];
            sprintf(eventname, "TTSLOCK:%p", response);
            HANDLE event = OpenEventA(EVENT_ALL_ACCESS, FALSE, eventname);
            SetEvent(event);
        }
        return 0;
    }
    
    int __stdcall Hanako::ProcEventTTS(Nekomimi::EventReasonCode reasonCode, int32_t jobID, uint64_t tick, const char* name, Nekomimi::IntPtr userData) {
        return 0;
    }

    void Response::Write(char* bytes, uint32_t size) {
        m_Buffer.insert(std::end(m_Buffer), bytes, bytes + size);
    }

    void Response::Write16(int16_t* shorts, uint32_t size) {
        m_Buffer16.insert(std::end(m_Buffer16), shorts, shorts + size);
    }

    vector<unsigned char> Response::End() {
        return m_Buffer;
    }

    vector<int16_t> Response::End16() {
        return m_Buffer16;
    }
}
