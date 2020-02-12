#include <node_api.h>

#include "hana.h"
#include "ebyutil.h"

using std::string;
using Hana::Hanako;

typedef struct {
    Hanako* hanako;
} module_context;

typedef enum {
    WORK_HIRAGANA,
    WORK_SPEECH
} work_type;

typedef struct {
    work_type worktype;
    unsigned char* input;
    size_t input_size;
    void* output;
    size_t output_size;
    napi_async_work self;
    napi_ref javascript_callback_ref;
} work_data;

static module_context* module; 

static void
async_work_on_execute(napi_env env, void* data) {
    int result;
    napi_status status;
    work_data* work = (work_data*) data;

    switch (work->worktype) {
        case WORK_HIRAGANA:
            try {
                unsigned char* out;
                result = module->hanako->Hiragana(work->input, &out, &work->output_size);
                work->output = out;
            } catch (std::exception &e) {
                const char* m = "(Hana::Hanako::Hiragana)";
                napi_fatal_error(m, strlen(m), e.what(), strlen(e.what()));
            }
            break;
        case WORK_SPEECH:
            try {
                short* out;
                result = module->hanako->Speech(work->input, &out, &work->output_size);
                work->output = out;
            } catch (std::exception &e) {
                const char* m = "(Hana::Hanako::Speech)";
                napi_fatal_error(m, strlen(m), e.what(), strlen(e.what()));
            }            
            break;
    }
}

static void
async_work_on_complete(napi_env env, napi_status work_status, void* data) {
    if (work_status == napi_cancelled) {
        // TODO: throw a Javascript exception
        return;
    }

    napi_status status;
    napi_value retval[1], callback, undefined;
    work_data* work = (work_data*) data;

    switch(work->worktype) {
        case WORK_HIRAGANA:
            // convert output bytes to node buffer
            status = napi_create_buffer_copy(env, work->output_size, work->output, NULL, &retval[0]);
            e_assert(status == napi_ok);
            break;
        case WORK_SPEECH:
            // convert output bytes to uint16array

            // create underlying arraybuffer
            void* node_memory;
            napi_value array_buffer;
            status = napi_create_arraybuffer(env, work->output_size, &node_memory, &array_buffer);
            e_assert(status == napi_ok);

            // copy data to arraybuffer and create int16array
            memcpy(node_memory, work->output, work->output_size);
            e_assert(work->output_size % 2 == 0);
            status = napi_create_typedarray(env, napi_int16_array, work->output_size/2, array_buffer, 0, &retval[0]);
            e_assert(status == napi_ok);
            break;
    }

    // retain access to 'undefined' as to pass it as the function receiver 'this'
    status = napi_get_undefined(env, &undefined);
    e_assert(status == napi_ok);

    // acquire the javascript callback function
    status = napi_get_reference_value(env, work->javascript_callback_ref, &callback);
    e_assert(status == napi_ok);

    // actually call the javascript callback function
    status = napi_call_function(env, undefined, callback, 1, retval, NULL);
    Dprintf("napi_call_function status = %d", status);
    e_assert(status == napi_ok || status == napi_pending_exception);

    // decrement the reference count of the callback function ... means it will be GC'd
    uint32_t refs;
    status = napi_reference_unref(env, work->javascript_callback_ref, &refs);
    e_assert(status == napi_ok && refs == 0);

    // now neko work is done so we delete the work object 
    status = napi_delete_async_work(env, work->self);
    e_assert(status == napi_ok);

    // and manually allocated recources 
    free((void*)work->input);
    free((void*)work->output);
    free(work);
}

static napi_value
do_async_work(napi_env env, napi_callback_info info, work_type worktype) {
    napi_status status;

    size_t argc = 2;
    napi_value argv[2];
    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    en_assert(status == napi_ok);

    // first arg must be buffer    
    bool is_buffer;
    status = napi_is_buffer(env, argv[0], &is_buffer);
    en_assert(status == napi_ok && is_buffer == true);

    // second arg must be function
    napi_valuetype valuetype;
    status = napi_typeof(env, argv[1], &valuetype);
    en_assert(status == napi_ok && valuetype == napi_function);
    
    // fetch buffer data
    unsigned char* node_buffer_data; 
    size_t node_buffer_size;
    status = napi_get_buffer_info(env, argv[0], (void**) &node_buffer_data, &node_buffer_size);

    // allocate
    unsigned char* buffer = (unsigned char*) malloc(node_buffer_size + 1);
    memcpy(buffer, node_buffer_data, node_buffer_size);
    *(buffer + node_buffer_size) = '\0';

    char* workname;
    switch (worktype) {
        case WORK_HIRAGANA:
            workname = "Input Text Reinterpretor";
            break;
        case WORK_SPEECH:
            workname = "Reinterpreted Text To PCM Converter";
            break;
    }

    // create name identifier 
    napi_value async_work_name;
    status = napi_create_string_utf8(env, workname, NAPI_AUTO_LENGTH, &async_work_name);
    en_assert(status == napi_ok);

    // create reference for the callback fucntion because it otherwise will soon get GC'd
    napi_ref callback_ref;
    status = napi_create_reference(env, argv[1], 1, &callback_ref);
    en_assert(status == napi_ok);

    // create working data
    work_data* work = (work_data*) malloc(sizeof(*work));
    work->input = buffer;
    work->input_size = node_buffer_size;
    work->javascript_callback_ref = callback_ref;
    work->worktype = worktype;

    // create async work object
    status = napi_create_async_work(env, NULL, async_work_name, async_work_on_execute, async_work_on_complete, work, &work->self);
    en_assert(status == napi_ok);
    
    // queue the async work
    status = napi_queue_async_work(env, work->self);
    en_assert(status == napi_ok);

    return NULL;
}

//
// JS Signature: speech(representatedTextBytes: Buffer, done: function(output16Bit44kPCM: Int16Array) -> none) -> none
//
static napi_value 
export_func_speech(napi_env env, napi_callback_info info) {
    return do_async_work(env, info, WORK_SPEECH);
}

//
// JS Signature: reinterpret(inputTextBytes: Buffer, done: function(outputBytes: Buffer) -> none) -> none
//
static napi_value 
export_func_reinterpret(napi_env env, napi_callback_info info) {
    return do_async_work(env, info, WORK_HIRAGANA);
}

//
// JS Signature: init(installDir: string, voiceDir: string, volume: number) -> none
//
static napi_value
export_func_init(napi_env env, napi_callback_info info) {
    if (module->hanako == NULL) {
        return NULL;
    }

    napi_status status;

    size_t argc = 3;
    napi_value argv[3];
    status = napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
    en_assert(status == napi_ok);

    napi_valuetype valuetype;
    status = napi_typeof(env, argv[0], &valuetype);
    en_assert(status == napi_ok && valuetype == napi_string);
    
    status = napi_typeof(env, argv[1], &valuetype);
    en_assert(status == napi_ok && valuetype == napi_string);
    
    status = napi_typeof(env, argv[2], &valuetype);
    en_assert(status == napi_ok && valuetype == napi_number);

    // fetch necessary buffer size 
    size_t size;
    status = napi_get_value_string_utf8(env, argv[0], NULL, 0, &size); // NOTE: 'size' doesn't count the NULL character of the end, it seems
    en_assert(status == napi_ok);

    // allocate
    char* install_dir_buffer = (char*) malloc(size + 1);
    status = napi_get_value_string_utf8(env, argv[0], install_dir_buffer, size + 1, NULL);
    en_assert(status == napi_ok);

    // fetch necessary buffer size
    status = napi_get_value_string_utf8(env, argv[1], NULL, 0, &size);
    en_assert(status == napi_ok);

    // allocate
    char* voice_dir_buffer = (char*) malloc(size + 1);
    status = napi_get_value_string_utf8(env, argv[1], voice_dir_buffer, size + 1, NULL);
    en_assert(status == napi_ok);
    
    // fetch volume
    double volume;
    status = napi_get_value_double(env, argv[2], &volume);
    en_assert(status == napi_ok);

    // initialize hanako
    try {
        module->hanako = Hanako::Create(install_dir_buffer, voice_dir_buffer, (float)volume);
    } catch (std::exception &e) {
        const char* location = "(Hana::Hanako::Create)";
        napi_fatal_error(location, strlen(location), e.what(), strlen(e.what()));
    }

    // finalize hanako in the cleanup hook
    status = napi_add_env_cleanup_hook(
        env,
        [](void* arg){ delete module->hanako; },
        NULL);
    en_assert(status == napi_ok);

    free(install_dir_buffer);
    free(voice_dir_buffer);

    return NULL;
}

static napi_value 
module_main(napi_env env, napi_value exports) {
    napi_property_descriptor props[] = {
        { "speech", NULL, export_func_speech, NULL, NULL, NULL, napi_enumerable, NULL },
        { "reinterpret", NULL, export_func_reinterpret, NULL, NULL, NULL, napi_enumerable, NULL },
        { "init", NULL, export_func_init, NULL, NULL, NULL, napi_enumerable, NULL },
    };

    napi_status status = napi_define_properties(env, exports, sizeof(props) / sizeof(*props), props);
    en_assert(status == napi_ok);

    module = (module_context*) malloc(sizeof(*module));
    
    // clean heap in the cleanup hook
    status = napi_add_env_cleanup_hook(
        env,
        [](void* arg){ free(module); },
        NULL);
    en_assert(status == napi_ok);

    return exports;
}

NAPI_MODULE(ebyroid, module_main)
