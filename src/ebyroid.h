#ifndef EBYROID_H
#define EBYROID_H

#include <cstdint>
#include <string>
#include <vector>

#include "api_adapter.h"

namespace ebyroid {

class Ebyroid {
 public:
  static Ebyroid* Create(const std::string& base_dir, const std::string& voice, float volume);
  int Hiragana(const unsigned char* inbytes, unsigned char** outbytes, size_t* outsize);
  int Speech(const unsigned char* inbytes, int16_t** outbytes, size_t* outsize);

 private:
  Ebyroid() {}
  static int __stdcall HiraganaCallback(EventReasonCode reason_code,
                                        int32_t job_id,
                                        IntPtr user_data);
  static int __stdcall SpeechCallback(EventReasonCode reason_code,
                                      int32_t job_id,
                                      uint64_t tick,
                                      IntPtr user_data);
  static int __stdcall ProcEventTTS(EventReasonCode reason_code,
                                    int32_t job_id,
                                    uint64_t tick,
                                    const char* name,
                                    IntPtr user_data);

  ApiAdapter* api_adapter_;
};

class Response {
 public:
  Response(Ebyroid* owner) : owner_(owner) {}
  void Write(char* bytes, uint32_t size);
  void Write16(int16_t* shorts, uint32_t size);
  std::vector<unsigned char> End();
  std::vector<int16_t> End16();
  Ebyroid* owner() { return owner_; }

 private:
  Ebyroid* owner_;
  std::vector<unsigned char> buffer_;
  std::vector<int16_t> buffer_16_;
};

}  // namespace ebyroid

#endif  // EBYROID_H
