#include "nekomimi.h"

#include <stdexcept>

#include <Windows.h>

namespace Nekomimi {

APIAdapter* APIAdapter::Create(const char* pathToLibrary) {
    HINSTANCE handle = LoadLibraryA(pathToLibrary);
    if (handle == nullptr) {
        return nullptr;
    }

    APIAdapter* adapter = new APIAdapter;
    adapter->m_Init = (APIInit) GetProcAddress(handle, "_AITalkAPI_Init@4");
    if (adapter->m_Init == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_Init in the library.");
    }

    adapter->m_End = (APIEnd) GetProcAddress(handle, "_AITalkAPI_End@0");
    if (adapter->m_End == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_End in the library.");
    }
    
    adapter->m_VoiceLoad = (APIVoiceLoad) GetProcAddress(handle, "_AITalkAPI_VoiceLoad@4");
    if (adapter->m_VoiceLoad == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_VoiceLoad in the library.");
    }

    adapter->m_VoiceClear = (APIVoiceClear) GetProcAddress(handle, "_AITalkAPI_VoiceClear@0");
    if (adapter->m_VoiceClear == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_VoiceClear in the library.");
    }

    adapter->m_SetParam = (APISetParam) GetProcAddress(handle, "_AITalkAPI_SetParam@4");
    if (adapter->m_SetParam == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_SetParam in the library.");
    }

    adapter->m_GetParam = (APIGetParam) GetProcAddress(handle, "_AITalkAPI_GetParam@8");
    if (adapter->m_GetParam == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_GetParam in the library.");
    }

    adapter->m_LangLoad = (APILangLoad) GetProcAddress(handle, "_AITalkAPI_LangLoad@4");
    if (adapter->m_LangLoad == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_LangLoad in the library.");
    }

    adapter->m_TextToKana = (APITextToKana) GetProcAddress(handle, "_AITalkAPI_TextToKana@12");
    if (adapter->m_TextToKana == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_TextToKana in the library.");
    }

    adapter->m_CloseKana = (APICloseKana) GetProcAddress(handle, "_AITalkAPI_CloseKana@8");
    if (adapter->m_CloseKana == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_CloseKana in the library.");
    }

    adapter->m_GetKana = (APIGetKana) GetProcAddress(handle, "_AITalkAPI_GetKana@20");
    if (adapter->m_GetKana == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_GetKana in the library.");
    }

    adapter->m_TextToSpeech = (APITextToSpeech) GetProcAddress(handle, "_AITalkAPI_TextToSpeech@12");
    if (adapter->m_TextToSpeech == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_TextToSpeech in the library.");
    }

    adapter->m_CloseSpeech = (APICloseSpeech) GetProcAddress(handle, "_AITalkAPI_CloseSpeech@8");
    if (adapter->m_CloseSpeech == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_CloseSpeech in the library.");
    }

    adapter->m_GetData = (APIGetData) GetProcAddress(handle,  "_AITalkAPI_GetData@16");
    if (adapter->m_GetData == nullptr) {
        FreeLibrary(handle);
        throw std::runtime_error("Could not find AITalkAPI_GetData in the library.");
    }

    adapter->m_LibraryInstanceHandle = handle;
    return adapter;
}

APIAdapter::~APIAdapter() {
    if (m_LibraryInstanceHandle) {
        FreeLibrary(m_LibraryInstanceHandle);
    }
}

ResultCode APIAdapter::Init(TConfig* config) {
    return m_Init(config);
}

ResultCode APIAdapter::End() {
    return m_End();
}

ResultCode APIAdapter::VoiceLoad(const char* voiceName) {
    return m_VoiceLoad(voiceName);
}

ResultCode APIAdapter::VoiceClear() {
    return m_VoiceClear();
}

ResultCode APIAdapter::SetParam(IntPtr pParam) {
    return m_SetParam(pParam);
}

ResultCode APIAdapter::GetParam(IntPtr pParam, uint32_t* size) {
    return m_GetParam(pParam, size);
}

ResultCode APIAdapter::LangLoad(const char* dirLang) {
    return m_LangLoad(dirLang);
}

ResultCode APIAdapter::TextToKana(int32_t* jobID, TJobParam* param, const char* text) {
    return m_TextToKana(jobID, param, text);
}

ResultCode APIAdapter::CloseKana(int32_t jobID, int32_t useEvent) {
    return m_CloseKana(jobID, useEvent);
}

ResultCode APIAdapter::GetKana(int32_t jobID, char* textBuf, uint32_t lenBuf, uint32_t* size, uint32_t* pos) {
    return m_GetKana(jobID, textBuf, lenBuf, size, pos);
}

ResultCode APIAdapter::TextToSpeech(int32_t* jobID, TJobParam* param, const char* text) {
    return m_TextToSpeech(jobID, param, text);
}

ResultCode APIAdapter::CloseSpeech(int32_t jobID, int32_t useEvent) {
    return m_CloseSpeech(jobID, useEvent);
}

ResultCode APIAdapter::GetData(int32_t jobID, int16_t* rawBuf, uint32_t lenBuf, uint32_t* size) {
    return m_GetData(jobID, rawBuf, lenBuf, size);
}

} // namespace nekomimi
