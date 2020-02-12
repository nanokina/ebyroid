#ifndef HANA_H
#define HANA_H

#include <string>
#include <vector>

#include "nekomimi.h"

namespace Hana {

    class Hanako {
    public:
        static Hanako* Create(std::string pathToWorkingDir, std::string voice, float volume);
        int Hiragana(const unsigned char* inbytes, unsigned char** outbytes, size_t* outsize);
        int Speech(const unsigned char* inbytes, short** outbytes, size_t* outsize);
    private:
        Hanako() {}
        static int __stdcall HiraganaCallback(Nekomimi::EventReasonCode reasonCode, int32_t jobID, Nekomimi::IntPtr userData);
        static int __stdcall SpeechCallback(Nekomimi::EventReasonCode reasonCode, int32_t jobID, uint64_t tick, Nekomimi::IntPtr userData);
        static int __stdcall ProcEventTTS(Nekomimi::EventReasonCode reasonCode, int32_t jobID, uint64_t tick, const char* name, Nekomimi::IntPtr userData);

        Nekomimi::APIAdapter* m_APIAdapter;
    };

    class Response {
    public:
        Response(Hanako* owner): owner(owner) {}
        void Write(char* bytes, uint32_t size);
        void Write16(int16_t* bytes, uint32_t size);
        std::vector<unsigned char> End();
        std::vector<int16_t> End16();
        Hanako* owner;
    private:
        std::vector<unsigned char> m_Buffer;
        std::vector<int16_t> m_Buffer16;
    };
}

#endif /* HANA_H */
