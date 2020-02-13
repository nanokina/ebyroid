#include <stdexcept>

#include "ebyutil.h"
#include "nekobuilder.h"

namespace Nekomimi {

    using std::string;

    Setting SettingBuilder::Build() {
        Setting setting;
        string dllPath = baseDir + WIN_DELIMIT_ + DLL_FILENAME_;
        string licensePath = baseDir + WIN_DELIMIT_ + LIC_FILENAME_;
        std::strcpy(setting.baseDir, baseDir.c_str());
        std::strcpy(setting.voiceName, voiceName.c_str());
        std::strcpy(setting.dllPath, dllPath.c_str());
        std::strcpy(setting.licensePath, licensePath.c_str());

        Dprintf("%s \n %s \n %s \n %s \n", setting.baseDir, setting.dllPath, setting.licensePath, setting.voiceName);

        if (voiceName.find("_22") != string::npos) {
            // this means the given library is VOICEROID+
            setting.frequency = FREQUENCY_22_;

            string voiceDir = baseDir + WIN_DELIMIT_ + "voice";
            string languageDir = baseDir + WIN_DELIMIT_ + "lang";
            std::strcpy(setting.voiceDir, voiceDir.c_str());
            std::strcpy(setting.languageDir, languageDir.c_str());
            if (voiceName == "kiritan_22") {
                setting.seed = EBY_SEED_B;
            } else if (voiceName == "zunko_22") {
                setting.seed = EBY_SEED_C;
            } else {
                char message[64];
                sprintf(message, "Unsupported VOICEROID+ library '%s' was given.", setting.voiceName);
                throw new std::runtime_error(message);
            }
        } else {
            // this means it is either VOICEROID2 or an unexpected library
            // try to setup as VOCAROID2 anyways
            setting.frequency = FREQUENCY_44_;

            string voiceDir = baseDir + WIN_DELIMIT_ + "Voice";
            string languageDir = baseDir + WIN_DELIMIT_ + "Lang" + WIN_DELIMIT_ + "standard";
            std::strcpy(setting.voiceDir, voiceDir.c_str());
            std::strcpy(setting.languageDir, languageDir.c_str());
            setting.seed = EBY_SEED_A;
        }

        return std::move(setting);
    }
}
