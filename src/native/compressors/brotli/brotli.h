#ifndef __BROTLI_H_
#define __BROTLI_H_

#include "deps/include/brotli/encode.h"
#include "deps/include/brotli/decode.h"

struct Allocator
{
    Allocator() : allocated_unreported_memory(0) {}

    int64_t allocated_unreported_memory;

    struct AllocatedBuffer
    {
        size_t size;
        /* char data[...]; */
    };

    void *Alloc(size_t size);
    void Free(void *address);

    static AllocatedBuffer *GetBufferInfo(void *address);
    void ReportMemoryToV8();

    // Brotli-style parameter order.
    static void *Alloc(void *opaque, size_t size);
    static void Free(void *opaque, void *address);

    // Like Free, but in node::Buffer::FreeCallback style.
    static void NodeFree(char *address, void *opaque)
    {
        return Free(opaque, address);
    }
};

class StreamCoder : public Nan::ObjectWrap
{
  public:
    Allocator alloc;
    std::vector<uint8_t *> pending_output;

    Local<Array> PendingChunksAsArray();

  protected:
    explicit StreamCoder();
    ~StreamCoder();
};

class StreamDecode : public StreamCoder
{
  public:
    static void Init(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);

    const uint8_t *next_in;
    size_t available_in;

    BrotliDecoderState *state;

  private:
    explicit StreamDecode(Local<Object> params);
    ~StreamDecode();

    static NAN_METHOD(New);
    static NAN_METHOD(Transform);
    static NAN_METHOD(Flush);
    static Nan::Persistent<v8::Function> constructor;
};

class StreamEncode : public StreamCoder
{
  public:
    static void Init(Nan::ADDON_REGISTER_FUNCTION_ARGS_TYPE target);

    const uint8_t *next_in;
    size_t available_in;

    BrotliEncoderState *state;

  private:
    explicit StreamEncode(Local<Object> params);
    ~StreamEncode();

    static NAN_METHOD(New);
    static NAN_METHOD(Transform);
    static NAN_METHOD(Flush);
    static Nan::Persistent<v8::Function> constructor;
};

class StreamEncodeWorker : public Nan::AsyncWorker
{
  public:
    StreamEncodeWorker(Nan::Callback *callback, StreamEncode *obj, BrotliEncoderOperation op);

    void Execute();
    void HandleOKCallback();

  private:
    ~StreamEncodeWorker();
    StreamEncode *obj;
    BrotliEncoderOperation op;
    bool res;
};

class StreamDecodeWorker : public Nan::AsyncWorker
{
  public:
    StreamDecodeWorker(Nan::Callback *callback, StreamDecode *obj);

    void Execute();
    void HandleOKCallback();

  private:
    ~StreamDecodeWorker();
    StreamDecode *obj;
    BrotliDecoderResult res;
};

#endif // __BROTLI_H_
