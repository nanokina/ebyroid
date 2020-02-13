#ifndef NEKOBUILDER_H
#define NEKOBUILDER_H

#include <string>

#include <stdint.h>

namespace Nekomimi {

    static const size_t MAX_PATH_SIZE = 0xFF;
    static const int32_t FREQUENCY_44_ = 0xAC44;
    static const int32_t FREQUENCY_22_ = 0x5622;
    static const int32_t LEN_SEED_VALUE_ = 0;
    static const int32_t CONFIG_RAWBUF_SIZE_ = 0x158880;
    static const char* DLL_FILENAME_ = "aitalked.dll";
    static const char* LIC_FILENAME_ = "aitalk.lic";
    static const char* WIN_DELIMIT_ = "\\";

    struct Setting {
        char baseDir[MAX_PATH_SIZE];
        char dllPath[MAX_PATH_SIZE];
        char voiceDir[MAX_PATH_SIZE];
        char voiceName[16];
        char languageDir[MAX_PATH_SIZE];
        char licensePath[MAX_PATH_SIZE];
        const char *seed;
        uint32_t frequency;
    };
    
    class SettingBuilder {
        std::string baseDir;
        std::string voiceName;
        
    public:
        SettingBuilder(std::string baseDir, std::string voiceName):
            baseDir(baseDir), voiceName(voiceName) {}
        
        Setting Build();
    };
}

#endif /* NEKOBUILDER_H */
