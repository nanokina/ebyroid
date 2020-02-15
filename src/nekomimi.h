#ifndef NEKOMIMI_H
#define NEKOMIMI_H

#include <stdint.h>

#ifndef _WINDEF_
struct HINSTANCE__;
typedef HINSTANCE__* HINSTANCE;
#endif

namespace ebyroid {

static const int32_t MAX_VOICENAME_ = 80;
static const int32_t CONTROL_LENGTH_ = 12;
static const int32_t CONFIG_RAWBUF_SIZE_ = 0x158880;

enum EventReasonCode {
  TEXTBUF_FULL = 0x00000065,
  TEXTBUF_FLUSH = 0x00000066,
  TEXTBUF_CLOSE = 0x00000067,
  RAWBUF_FULL = 0x000000C9,
  RAWBUF_FLUSH = 0x000000CA,
  RAWBUF_CLOSE = 0x000000CB,
  PH_LABEL = 0x0000012D,
  BOOKMARK = 0x0000012E,
  AUTOBOOKMARK = 0x0000012F
};

enum ExtendFormat : uint32_t {
  None = 0,
  JeitaRuby = 1,
  AutoBookmark = 16,
  Both = JeitaRuby | AutoBookmark
};

enum JobInOut : uint32_t {
  IOMODE_PLAIN_TO_WAVE = 11,
  IOMODE_AIKANA_TO_WAVE = 12,
  IOMODE_JEITA_TO_WAVE = 13,
  IOMODE_PLAIN_TO_AIKANA = 21,
  IOMODE_AIKANA_TO_JEITA = 32
};

enum ResultCode {
  ERR_USERDIC_NOENTRY = -1012,
  ERR_USERDIC_LOCKED = -1011,
  ERR_COUNT_LIMIT = -1004,
  ERR_READ_FAULT = -1003,
  ERR_PATH_NOT_FOUND = -1002,
  ERR_FILE_NOT_FOUND = -1001,
  ERR_OUT_OF_MEMORY = -206,
  ERR_JOB_BUSY = -203,
  ERR_INVALID_JOBID = -202,
  ERR_TOO_MANY_JOBS = -201,
  ERR_LICENSE_REJECTED = -102,
  ERR_LICENSE_EXPIRED = -101,
  ERR_LICENSE_ABSENT = -100,
  ERR_INSUFFICIENT = -20,
  ERR_NOT_LOADED = -11,
  ERR_NOT_INITIALIZED = -10,
  ERR_WAIT_TIMEOUT = -4,
  ERR_INVALID_ARGUMENT = -3,
  ERR_UNSUPPORTED = -2,
  ERR_INTERNAL_ERROR = -1,
  ERR_SUCCESS = 0,
  ERR_ALREADY_INITIALIZED = 10,
  ERR_ALREADY_LOADED = 11,
  ERR_PARTIALLY_REGISTERED = 21,
  ERR_NOMORE_DATA = 204
};

enum StatusCode {
  STAT_WRONG_STATE = -1,
  STAT_INPROGRESS = 10,
  STAT_STILL_RUNNING = 11,
  STAT_DONE = 12
};

typedef void* IntPtr;
typedef int(__stdcall* ProcTextBuf)(EventReasonCode reasonCode, int32_t jobID, IntPtr userData);
typedef int(__stdcall* ProcRawBuf)(EventReasonCode reasonCode,
                                   int32_t jobID,
                                   uint64_t tick,
                                   IntPtr userData);
typedef int(__stdcall* ProcEventTTS)(EventReasonCode reasonCode,
                                     int32_t jobID,
                                     uint64_t tick,
                                     const char* name,
                                     IntPtr userData);

#pragma pack(push, 1)
struct TTtsParam {
  uint32_t size;
  ProcTextBuf procTextBuf;
  ProcRawBuf procRawBuf;
  ProcEventTTS procEventTts;
  uint32_t lenTextBufBytes;
  uint32_t lenRawBufBytes;
  float volume;
  int32_t pauseBegin;
  int32_t pauseTerm;
  ExtendFormat extendFormat;
  char voiceName[MAX_VOICENAME_];
  struct TJeitaParam {
    char femaleName[MAX_VOICENAME_];
    char maleName[MAX_VOICENAME_];
    int32_t pauseMiddle;
    int32_t pauseLong;
    int32_t pauseSentence;
    char control[CONTROL_LENGTH_];
  };
  TJeitaParam jeita;
  uint32_t numSpeakers;
  int32_t __reserved__;
  struct TSpeakerParam {
    char voiceName[MAX_VOICENAME_];
    float volume;
    float speed;
    float pitch;
    float range;
    int32_t pauseMiddle;
    int32_t pauseLong;
    int32_t pauseSentence;
    char styleRate[MAX_VOICENAME_];
  };
  TSpeakerParam speaker[1];
};
#pragma pack(pop)

#pragma pack(push, 1)
struct TJobParam {
  JobInOut modeInOut;
  IntPtr userData;
};
#pragma pack(pop)

#pragma pack(push, 1)
struct TConfig {
  uint32_t hzVoiceDB;
  const char* dirVoiceDBS;
  uint32_t msecTimeout;
  const char* pathLicense;
  const char* codeAuthSeed;
  uint32_t lenAuthSeed;
};
#pragma pack(pop)

class APIAdapter {
 public:
  ~APIAdapter();

  static APIAdapter* Create(const char* pathToLibrary);

  ResultCode Init(TConfig* config);
  ResultCode End();
  ResultCode SetParam(IntPtr pParam);
  ResultCode GetParam(IntPtr pParam, uint32_t* size);
  ResultCode LangLoad(const char* dirLang);
  ResultCode VoiceLoad(const char* voiceName);
  ResultCode VoiceClear();
  ResultCode TextToKana(int32_t* jobID, TJobParam* param, const char* text);
  ResultCode CloseKana(int32_t jobID, int32_t useEvent = 0);
  ResultCode GetKana(int32_t jobID, char* textBuf, uint32_t lenBuf, uint32_t* size, uint32_t* pos);
  ResultCode TextToSpeech(int32_t* jobID, TJobParam* param, const char* text);
  ResultCode CloseSpeech(int32_t jobID, int32_t useEvent = 0);
  ResultCode GetData(int32_t jobID, int16_t* rawBuf, uint32_t lenBuf, uint32_t* size);

 private:
  APIAdapter() {}

  HINSTANCE m_LibraryInstanceHandle = nullptr;

  typedef ResultCode(__stdcall* APIInit)(TConfig* config);
  typedef ResultCode(__stdcall* APIEnd)(void);
  typedef ResultCode(__stdcall* APISetParam)(IntPtr pParam);
  typedef ResultCode(__stdcall* APIGetParam)(IntPtr pParam, uint32_t* size);
  typedef ResultCode(__stdcall* APILangLoad)(const char* dirLang);
  typedef ResultCode(__stdcall* APIVoiceLoad)(const char* voiceName);
  typedef ResultCode(__stdcall* APIVoiceClear)(void);
  typedef ResultCode(__stdcall* APITextToKana)(int32_t* jobID, TJobParam* param, const char* text);
  typedef ResultCode(__stdcall* APICloseKana)(int32_t jobID,
                                              int32_t useEvent);  // useEvent is default to 0
  typedef ResultCode(__stdcall* APIGetKana)(int32_t jobID,
                                            char* textBuf,
                                            uint32_t lenBuf,
                                            uint32_t* size,
                                            uint32_t* pos);
  typedef ResultCode(__stdcall* APITextToSpeech)(int32_t* jobID,
                                                 TJobParam* param,
                                                 const char* text);
  typedef ResultCode(__stdcall* APICloseSpeech)(int32_t jobID,
                                                int32_t useEvent);  // useEvent is default to 0
  typedef ResultCode(__stdcall* APIGetData)(int32_t jobID,
                                            int16_t* rawBuf,
                                            uint32_t lenBuf,
                                            uint32_t* size);

  APIInit m_Init;
  APIEnd m_End;
  APIVoiceLoad m_VoiceLoad;
  APIVoiceClear m_VoiceClear;
  APISetParam m_SetParam;
  APIGetParam m_GetParam;
  APILangLoad m_LangLoad;
  APITextToKana m_TextToKana;
  APICloseKana m_CloseKana;
  APIGetKana m_GetKana;
  APITextToSpeech m_TextToSpeech;
  APICloseSpeech m_CloseSpeech;
  APIGetData m_GetData;
};

}  // namespace ebyroid

#endif  // NEKOMIMI_H
