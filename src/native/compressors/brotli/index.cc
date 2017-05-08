#include <nan.h>
#include "stream_encode.h"
#include "stream_decode.h"
using namespace v8;

NAN_MODULE_INIT(Init)
{
    StreamEncode::Init(target);
    StreamDecode::Init(target);
}

NODE_MODULE(brotli, Init)