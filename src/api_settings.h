#ifndef API_SETTINGS_H
#define API_SETTINGS_H

#include <string>

#include <cstdint>

namespace ebyroid {

static constexpr size_t kMaxPathSize = 0xFF;
static constexpr int32_t kFrequency44 = 0xAC44;
static constexpr int32_t kFrequency22 = 0x5622;
static constexpr char* kDllFilename = "aitalked.dll";
static constexpr char* kLicFilename = "aitalk.lic";
static constexpr char* kWinDelimit = "\\";

struct Settings {
  char base_dir[kMaxPathSize];
  char dll_path[kMaxPathSize];
  char voice_dir[kMaxPathSize];
  char voice_name[16];
  char language_dir[kMaxPathSize];
  char license_path[kMaxPathSize];
  const char* seed;
  uint32_t frequency;
};

class SettingsBuilder {
 public:
  SettingsBuilder(const std::string& base_dir, const std::string& voice_name)
      : base_dir(base_dir), voice_name(voice_name) {}

  Settings Build();

 private:
  std::string base_dir;
  std::string voice_name;
};

}  // namespace ebyroid

#endif  // API_SETTINGS_H
