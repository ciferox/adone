#include "../../adone.h"
#include <stddef.h>
#include <stdint.h>
#include "brotli.h"

void *Allocator::Alloc(void *opaque, size_t size)
{
    return static_cast<Allocator *>(opaque)->Alloc(size);
}

void *Allocator::Alloc(size_t size)
{
    void *realbuffer = malloc(size + sizeof(AllocatedBuffer));
    AllocatedBuffer *buf = static_cast<AllocatedBuffer *>(realbuffer);
    if (!buf)
    {
        return NULL;
    }

    buf->size = size;
    buf->available = size;
    allocated_unreported_memory += size + sizeof(*buf);
    return static_cast<void *>(buf + 1);
}

Allocator::AllocatedBuffer *Allocator::GetBufferInfo(void *address)
{
    return static_cast<AllocatedBuffer *>(address) - 1;
}

void Allocator::Free(void *opaque, void *address)
{
    if (!address)
        return;

    AllocatedBuffer *buf = GetBufferInfo(address);

    if (opaque)
    {
        Allocator *alloc = static_cast<Allocator *>(opaque);
        alloc->allocated_unreported_memory -= buf->size + sizeof(*buf);
    }
    else
    {
        Nan::AdjustExternalMemory(-(buf->size + sizeof(*buf)));
    }

    free(buf);
}

void Allocator::Free(void *address)
{
    Free(this, address);
}

void Allocator::ReportMemoryToV8()
{
    Nan::AdjustExternalMemory(allocated_unreported_memory);
    allocated_unreported_memory = 0;
}

StreamCoder::StreamCoder()
{
}

StreamCoder::~StreamCoder()
{
    size_t n_chunks = pending_output.size();
    for (size_t i = 0; i < n_chunks; i++)
        alloc.Free(pending_output[i]);

    alloc.ReportMemoryToV8();
}

Local<Array> StreamCoder::PendingChunksAsArray()
{
    size_t n_chunks = pending_output.size();
    Local<Array> chunks = Nan::New<Array>(n_chunks);

    for (size_t i = 0; i < n_chunks; i++)
    {
        uint8_t *current = pending_output[i];
        Allocator::AllocatedBuffer *buf_info = Allocator::GetBufferInfo(current);
        Nan::Set(chunks, i, Nan::NewBuffer(reinterpret_cast<char *>(current),
                                           buf_info->size - buf_info->available,
                                           Allocator::NodeFree,
                                           NULL)
                                .ToLocalChecked());
    }
    pending_output.clear();

    return chunks;
}

StreamDecode::StreamDecode(Local<Object> options) : next_in(NULL), available_in(0)
{
    state = BrotliDecoderCreateInstance(Allocator::Alloc, Allocator::Free, &alloc);
    alloc.ReportMemoryToV8();
    Local<String> key;

    key = Nan::New<String>("dictionary").ToLocalChecked();
    if (Nan::Has(options, key).FromJust())
    {
        Local<Object> dictionary = Nan::Get(options, key).ToLocalChecked()->ToObject();
        const size_t dict_size = node::Buffer::Length(dictionary);
        const char *dict_buffer = node::Buffer::Data(dictionary);

        BrotliDecoderSetCustomDictionary(state, dict_size, (const uint8_t *)dict_buffer);
    }
}

StreamDecode::~StreamDecode()
{
    BrotliDecoderDestroyInstance(state);
}

void StreamDecode::Init(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
{
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("StreamDecode").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    Nan::SetPrototypeMethod(tpl, "transform", Transform);
    Nan::SetPrototypeMethod(tpl, "flush", Flush);

    constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New("StreamDecode").ToLocalChecked(),
             Nan::GetFunction(tpl).ToLocalChecked());
}

NAN_METHOD(StreamDecode::New)
{
    StreamDecode *obj = new StreamDecode(info[0]->ToObject());
    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
}

NAN_METHOD(StreamDecode::Transform)
{
    StreamDecode *obj = ObjectWrap::Unwrap<StreamDecode>(info.Holder());

    Local<Object> buffer = info[0]->ToObject();
    obj->next_in = (const uint8_t *)node::Buffer::Data(buffer);
    obj->available_in = node::Buffer::Length(buffer);

    Nan::Callback *callback = new Nan::Callback(info[1].As<Function>());
    StreamDecodeWorker *worker = new StreamDecodeWorker(callback, obj);
    if (info[2]->BooleanValue())
    {
        worker->SaveToPersistent(0U, buffer);
        worker->SaveToPersistent(1U, obj->handle());
        Nan::AsyncQueueWorker(worker);
    }
    else
    {
        worker->Execute();
        worker->WorkComplete();
        worker->Destroy();
    }
}

NAN_METHOD(StreamDecode::Flush)
{
    StreamDecode *obj = ObjectWrap::Unwrap<StreamDecode>(info.Holder());

    Nan::Callback *callback = new Nan::Callback(info[0].As<Function>());
    StreamDecodeWorker *worker = new StreamDecodeWorker(callback, obj);
    if (info[1]->BooleanValue())
    {
        Nan::AsyncQueueWorker(worker);
    }
    else
    {
        worker->Execute();
        worker->WorkComplete();
        worker->Destroy();
    }
}

Nan::Persistent<Function> StreamDecode::constructor;

StreamEncode::StreamEncode(Local<Object> params)
{
    state = BrotliEncoderCreateInstance(Allocator::Alloc, Allocator::Free, &alloc);

    Local<String> key;
    uint32_t val;

    key = Nan::New<String>("mode").ToLocalChecked();
    if (Nan::Has(params, key).FromJust())
    {
        val = Nan::Get(params, key).ToLocalChecked()->Int32Value();
        BrotliEncoderSetParameter(state, BROTLI_PARAM_MODE, val);
    }

    key = Nan::New<String>("quality").ToLocalChecked();
    if (Nan::Has(params, key).FromJust())
    {
        val = Nan::Get(params, key).ToLocalChecked()->Int32Value();
        BrotliEncoderSetParameter(state, BROTLI_PARAM_QUALITY, val);
    }

    key = Nan::New<String>("lgwin").ToLocalChecked();
    if (Nan::Has(params, key).FromJust())
    {
        val = Nan::Get(params, key).ToLocalChecked()->Int32Value();
        BrotliEncoderSetParameter(state, BROTLI_PARAM_LGWIN, val);
    }

    key = Nan::New<String>("lgblock").ToLocalChecked();
    if (Nan::Has(params, key).FromJust())
    {
        val = Nan::Get(params, key).ToLocalChecked()->Int32Value();
        BrotliEncoderSetParameter(state, BROTLI_PARAM_LGBLOCK, val);
    }

    key = Nan::New<String>("dictionary").ToLocalChecked();
    if (Nan::Has(params, key).FromJust())
    {
        Local<Object> dictionary = Nan::Get(params, key).ToLocalChecked()->ToObject();
        const size_t dict_size = node::Buffer::Length(dictionary);
        const char *dict_buffer = node::Buffer::Data(dictionary);

        BrotliEncoderSetCustomDictionary(state, dict_size, (const uint8_t *)dict_buffer);
    }
}

StreamEncode::~StreamEncode()
{
    BrotliEncoderDestroyInstance(state);
}

void StreamEncode::Init(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target)
{
    Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(New);
    tpl->SetClassName(Nan::New("StreamEncode").ToLocalChecked());
    tpl->InstanceTemplate()->SetInternalFieldCount(1);

    Nan::SetPrototypeMethod(tpl, "getBlockSize", GetBlockSize);
    Nan::SetPrototypeMethod(tpl, "copy", Copy);
    Nan::SetPrototypeMethod(tpl, "encode", Encode);
    Nan::SetPrototypeMethod(tpl, "flush", Flush);

    constructor.Reset(Nan::GetFunction(tpl).ToLocalChecked());
    Nan::Set(target, Nan::New("StreamEncode").ToLocalChecked(),
             Nan::GetFunction(tpl).ToLocalChecked());
}

NAN_METHOD(StreamEncode::New)
{
    StreamEncode *obj = new StreamEncode(info[0]->ToObject());
    obj->Wrap(info.This());
    info.GetReturnValue().Set(info.This());
}

NAN_METHOD(StreamEncode::GetBlockSize)
{
    StreamEncode *obj = ObjectWrap::Unwrap<StreamEncode>(info.Holder());
    info.GetReturnValue().Set(Nan::New<Number>(BrotliEncoderInputBlockSize(obj->state)));
}

NAN_METHOD(StreamEncode::Copy)
{
    StreamEncode *obj = ObjectWrap::Unwrap<StreamEncode>(info.Holder());

    Local<Object> buffer = info[0]->ToObject();
    const size_t input_size = node::Buffer::Length(buffer);
    const char *input_buffer = node::Buffer::Data(buffer);

    BrotliEncoderCopyInputToRingBuffer(obj->state, input_size, (const uint8_t *)input_buffer);
}

NAN_METHOD(StreamEncode::Encode)
{
    StreamEncode *obj = ObjectWrap::Unwrap<StreamEncode>(info.Holder());

    bool is_last = info[0]->BooleanValue();
    Nan::Callback *callback = new Nan::Callback(info[1].As<Function>());
    StreamEncodeWorker *worker = new StreamEncodeWorker(callback, obj, is_last, false);
    if (info[2]->BooleanValue())
    {
        Nan::AsyncQueueWorker(worker);
    }
    else
    {
        worker->Execute();
        worker->WorkComplete();
        worker->Destroy();
    }
}

NAN_METHOD(StreamEncode::Flush)
{
    StreamEncode *obj = ObjectWrap::Unwrap<StreamEncode>(info.Holder());

    Nan::Callback *callback = new Nan::Callback(info[0].As<Function>());
    StreamEncodeWorker *worker = new StreamEncodeWorker(callback, obj, false, true);
    Nan::AsyncQueueWorker(worker);
}

Nan::Persistent<Function> StreamEncode::constructor;

StreamEncodeWorker::StreamEncodeWorker(Nan::Callback *callback, StreamEncode *obj, bool is_last, bool force_flush)
    : Nan::AsyncWorker(callback), obj(obj), is_last(is_last), force_flush(force_flush) {}

StreamEncodeWorker::~StreamEncodeWorker()
{
}

void StreamEncodeWorker::Execute()
{
    uint8_t *buffer = NULL;
    size_t output_size = 0;
    res = BrotliEncoderWriteData(obj->state, is_last, force_flush, &output_size, &buffer);

    if (output_size > 0)
    {
        uint8_t *output = static_cast<uint8_t *>(obj->alloc.Alloc(output_size));
        if (!output)
        {
            res = 0;
            return;
        }

        memcpy(output, buffer, output_size);
        Allocator::AllocatedBuffer *buf_info = Allocator::GetBufferInfo(output);
        buf_info->available = 0;
        obj->pending_output.push_back(output);
    }
}

void StreamEncodeWorker::HandleOKCallback()
{
    if (!res)
    {
        Local<Value> argv[] = {
            Nan::Error("Brotli failed to compress.")};
        callback->Call(1, argv);
    }
    else
    {
        Local<Value> argv[] = {
            Nan::Null(),
            obj->PendingChunksAsArray()};
        callback->Call(2, argv);
    }

    obj->alloc.ReportMemoryToV8();
}

StreamDecodeWorker::StreamDecodeWorker(Nan::Callback *callback, StreamDecode *obj)
    : Nan::AsyncWorker(callback), obj(obj) {}

StreamDecodeWorker::~StreamDecodeWorker()
{
}

void StreamDecodeWorker::Execute()
{
    Allocator::AllocatedBuffer *buf_info;

    do
    {
        void *buf = obj->alloc.Alloc(131072);
        if (!buf)
        {
            res = BROTLI_DECODER_RESULT_ERROR;
            return;
        }

        uint8_t *next_out = static_cast<uint8_t *>(buf);
        buf_info = Allocator::GetBufferInfo(buf);
        res = BrotliDecoderDecompressStream(obj->state,
                                            &obj->available_in,
                                            &obj->next_in,
                                            &buf_info->available,
                                            &next_out,
                                            NULL);

        obj->pending_output.push_back(static_cast<uint8_t *>(buf));
    } while (res == BROTLI_DECODER_RESULT_NEEDS_MORE_OUTPUT);
}

void StreamDecodeWorker::HandleOKCallback()
{
    if (res == BROTLI_DECODER_RESULT_ERROR || res == BROTLI_DECODER_RESULT_NEEDS_MORE_OUTPUT)
    {
        Local<Value> argv[] = {
            Nan::Error("Brotli failed to decompress.")};
        callback->Call(1, argv);
    }
    else
    {
        Local<Value> argv[] = {
            Nan::Null(),
            obj->PendingChunksAsArray()};
        callback->Call(2, argv);
    }

    obj->alloc.ReportMemoryToV8();
}

NAN_MODULE_INIT(init)
{
    StreamEncode::Init(target);
    StreamDecode::Init(target);
}

NODE_MODULE(brotli, init)
