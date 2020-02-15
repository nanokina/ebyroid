#include "api_adapter.h"

#include <stdexcept>

#include <Windows.h>

namespace ebyroid {

ApiAdapter* ApiAdapter::Create(const char* dll_path) {
  HINSTANCE handle = LoadLibraryA(dll_path);
  if (handle == nullptr) {
    return nullptr;
  }

  ApiAdapter* adapter = new ApiAdapter;
  adapter->init_ = (ApiInit) GetProcAddress(handle, "_AITalkAPI_Init@4");
  if (adapter->init_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_Init in the library.");
  }

  adapter->end_ = (ApiEnd) GetProcAddress(handle, "_AITalkAPI_End@0");
  if (adapter->end_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_End in the library.");
  }

  adapter->voice_load_ = (ApiVoiceLoad) GetProcAddress(handle, "_AITalkAPI_VoiceLoad@4");
  if (adapter->voice_load_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_VoiceLoad in the library.");
  }

  adapter->voice_clear_ = (ApiVoiceClear) GetProcAddress(handle, "_AITalkAPI_VoiceClear@0");
  if (adapter->voice_clear_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_VoiceClear in the library.");
  }

  adapter->set_param_ = (ApiSetParam) GetProcAddress(handle, "_AITalkAPI_SetParam@4");
  if (adapter->set_param_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_SetParam in the library.");
  }

  adapter->get_param_ = (ApiGetParam) GetProcAddress(handle, "_AITalkAPI_GetParam@8");
  if (adapter->get_param_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_GetParam in the library.");
  }

  adapter->lang_load_ = (ApiLangLoad) GetProcAddress(handle, "_AITalkAPI_LangLoad@4");
  if (adapter->lang_load_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_LangLoad in the library.");
  }

  adapter->text_to_kana_ = (ApiTextToKana) GetProcAddress(handle, "_AITalkAPI_TextToKana@12");
  if (adapter->text_to_kana_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_TextToKana in the library.");
  }

  adapter->close_kana_ = (ApiCloseKana) GetProcAddress(handle, "_AITalkAPI_CloseKana@8");
  if (adapter->close_kana_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_CloseKana in the library.");
  }

  adapter->get_kana_ = (ApiGetKana) GetProcAddress(handle, "_AITalkAPI_GetKana@20");
  if (adapter->get_kana_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_GetKana in the library.");
  }

  adapter->text_to_speech_ = (ApiTextToSpeech) GetProcAddress(handle, "_AITalkAPI_TextToSpeech@12");
  if (adapter->text_to_speech_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_TextToSpeech in the library.");
  }

  adapter->close_speech_ = (ApiCloseSpeech) GetProcAddress(handle, "_AITalkAPI_CloseSpeech@8");
  if (adapter->close_speech_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_CloseSpeech in the library.");
  }

  adapter->get_data_ = (ApiGetData) GetProcAddress(handle, "_AITalkAPI_GetData@16");
  if (adapter->get_data_ == nullptr) {
    FreeLibrary(handle);
    throw std::runtime_error("Could not find AITalkAPI_GetData in the library.");
  }

  adapter->dll_instance_ = handle;
  return adapter;
}

ApiAdapter::~ApiAdapter() {
  if (dll_instance_) {
    FreeLibrary(dll_instance_);
  }
}

ResultCode ApiAdapter::Init(TConfig* config) {
  return init_(config);
}

ResultCode ApiAdapter::End() {
  return end_();
}

ResultCode ApiAdapter::VoiceLoad(const char* voice_name) {
  return voice_load_(voice_name);
}

ResultCode ApiAdapter::VoiceClear() {
  return voice_clear_();
}

ResultCode ApiAdapter::SetParam(IntPtr p_param) {
  return set_param_(p_param);
}

ResultCode ApiAdapter::GetParam(IntPtr p_param, uint32_t* size) {
  return get_param_(p_param, size);
}

ResultCode ApiAdapter::LangLoad(const char* dir_lang) {
  return lang_load_(dir_lang);
}

ResultCode ApiAdapter::TextToKana(int32_t* job_id, TJobParam* param, const char* text) {
  return text_to_kana_(job_id, param, text);
}

ResultCode ApiAdapter::CloseKana(int32_t job_id, int32_t use_event) {
  return close_kana_(job_id, use_event);
}

ResultCode ApiAdapter::GetKana(int32_t job_id,
                               char* text_buf,
                               uint32_t len_buf,
                               uint32_t* size,
                               uint32_t* pos) {
  return get_kana_(job_id, text_buf, len_buf, size, pos);
}

ResultCode ApiAdapter::TextToSpeech(int32_t* job_id, TJobParam* param, const char* text) {
  return text_to_speech_(job_id, param, text);
}

ResultCode ApiAdapter::CloseSpeech(int32_t job_id, int32_t use_event) {
  return close_speech_(job_id, use_event);
}

ResultCode ApiAdapter::GetData(int32_t job_id, int16_t* raw_buf, uint32_t len_buf, uint32_t* size) {
  return get_data_(job_id, raw_buf, len_buf, size);
}

}  // namespace ebyroid
