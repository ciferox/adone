#include <adone.h>
#include <sys/types.h>

// Descriptions:
//
// u = UInt8Array;
// a = ArrayBuffer
//
// All functions have signature: (target, targetOffset, source, sourceStart, sourceEnd)

NAN_METHOD(utou)
{
    if (info.Length() < 5)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal number of arguments");
    }

    v8::Local<v8::Object> target = info[0]->ToObject();
    char *targetData = node::Buffer::Data(target);
    size_t targetLength = node::Buffer::Length(target);

    size_t targetOffset = info[1]->Int32Value();
    if (targetOffset < 0 || targetOffset > targetLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowRangeError("Illegal targetOffset: out of bounds");
    }

    v8::Local<v8::Object> source = info[2]->ToObject();
    char *sourceData = node::Buffer::Data(source);
    size_t sourceLength = node::Buffer::Length(source);

    size_t sourceStart = info[3]->Int32Value();
    if (sourceStart < 0 || sourceStart > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceStart: out of bounds");
    }

    size_t sourceEnd = info[4]->Int32Value();
    if (sourceEnd < sourceStart || sourceEnd > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceEnd: out of bounds");
    }

    size_t length = sourceEnd - sourceStart;
    if (length > 0)
    {
        if (targetOffset + length > targetLength)
        {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowTypeError("Illegal source range: target capacity overrun");
        }
        memmove(targetData + targetOffset, sourceData + sourceStart, length);
    }
    info.GetReturnValue().Set(Nan::New<v8::Number>(length));
}

NAN_METHOD(atoa)
{
    if (info.Length() < 5)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal number of arguments");
    }

    v8::Handle<v8::ArrayBuffer> target = v8::Handle<v8::ArrayBuffer>::Cast(info[0]);
    v8::ArrayBuffer::Contents targetContents = target->GetContents();
    char *targetData = static_cast<char *>(targetContents.Data());
    size_t targetLength = targetContents.ByteLength();

    size_t targetOffset = info[1]->Int32Value();
    if (targetOffset < 0 || targetOffset > targetLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowRangeError("Illegal targetOffset: out of bounds");
    }

    v8::Handle<v8::ArrayBuffer> source = v8::Handle<v8::ArrayBuffer>::Cast(info[2]);
    v8::ArrayBuffer::Contents sourceContents = source->GetContents();
    char *sourceData = static_cast<char *>(sourceContents.Data());
    size_t sourceLength = sourceContents.ByteLength();

    size_t sourceStart = info[3]->Int32Value();
    if (sourceStart < 0 || sourceStart > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceStart: out of bounds");
    }

    size_t sourceEnd = info[4]->Int32Value();
    if (sourceEnd < sourceStart || sourceEnd > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceEnd: out of bounds");
    }

    size_t length = sourceEnd - sourceStart;
    if (length > 0)
    {
        if (targetOffset + length > targetLength)
        {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowTypeError("Illegal source range: target capacity overrun");
        }
        memmove(targetData + targetOffset, sourceData + sourceStart, length);
    }
    info.GetReturnValue().Set(Nan::New<v8::Number>(length));
}

NAN_METHOD(atou)
{
    if (info.Length() < 5)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal number of arguments");
    }

    v8::Local<v8::Object> target = info[0]->ToObject();
    char *targetData = node::Buffer::Data(target);
    size_t targetLength = node::Buffer::Length(target);

    size_t targetOffset = info[1]->Int32Value();
    if (targetOffset < 0 || targetOffset > targetLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowRangeError("Illegal targetOffset: out of bounds");
    }

    v8::Handle<v8::ArrayBuffer> source = v8::Handle<v8::ArrayBuffer>::Cast(info[2]);
    v8::ArrayBuffer::Contents sourceContents = source->GetContents();
    char *sourceData = static_cast<char *>(sourceContents.Data());
    size_t sourceLength = sourceContents.ByteLength();

    size_t sourceStart = info[3]->Int32Value();
    if (sourceStart < 0 || sourceStart > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceStart: out of bounds");
    }

    size_t sourceEnd = info[4]->Int32Value();
    if (sourceEnd < sourceStart || sourceEnd > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceEnd: out of bounds");
    }

    size_t length = sourceEnd - sourceStart;
    if (length > 0)
    {
        if (targetOffset + length > targetLength)
        {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowTypeError("Illegal source range: target capacity overrun");
        }
        memmove(targetData + targetOffset, sourceData + sourceStart, length);
    }
    info.GetReturnValue().Set(Nan::New<v8::Number>(length));
}

NAN_METHOD(utoa)
{
    if (info.Length() < 5)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal number of arguments");
    }

    v8::Handle<v8::ArrayBuffer> target = v8::Handle<v8::ArrayBuffer>::Cast(info[0]);
    v8::ArrayBuffer::Contents targetContents = target->GetContents();
    char *targetData = static_cast<char *>(targetContents.Data());
    size_t targetLength = targetContents.ByteLength();

    size_t targetOffset = info[1]->Int32Value();
    if (targetOffset < 0 || targetOffset > targetLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowRangeError("Illegal targetOffset: out of bounds");
    }

    v8::Local<v8::Object> source = info[2]->ToObject();
    char *sourceData = node::Buffer::Data(source);
    size_t sourceLength = node::Buffer::Length(source);

    size_t sourceStart = info[3]->Int32Value();
    if (sourceStart < 0 || sourceStart > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceStart: out of bounds");
    }

    size_t sourceEnd = info[4]->Int32Value();
    if (sourceEnd < sourceStart || sourceEnd > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceEnd: out of bounds");
    }

    size_t length = sourceEnd - sourceStart;
    if (length > 0)
    {
        if (targetOffset + length > targetLength)
        {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowTypeError("Illegal source range: target capacity overrun");
        }
        memmove(targetData + targetOffset, sourceData + sourceStart, length);
    }
    info.GetReturnValue().Set(Nan::New<v8::Number>(length));
}

NAN_METHOD(copy)
{
    char *targetData;
    size_t targetOffset = 0;
    size_t targetLength;

    char *sourceData;
    size_t sourceStart = 0;
    size_t sourceEnd;
    size_t sourceLength;

    if (info.Length() < 5)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal number of arguments");
    }

    v8::Local<v8::Object> target = info[0]->ToObject();
    if (target->IsUint8Array())
    {
        targetData = node::Buffer::Data(target);
        targetLength = node::Buffer::Length(target);
    }
    else
    {
        v8::Handle<v8::ArrayBuffer> obj = v8::Handle<v8::ArrayBuffer>::Cast(info[0]);
        v8::ArrayBuffer::Contents contents = obj->GetContents();
        targetData = static_cast<char *>(contents.Data());
        targetLength = contents.ByteLength();
    }

    targetOffset = info[1]->Int32Value();
    if (targetOffset < 0 || targetOffset > targetLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowRangeError("Illegal targetOffset: out of bounds");
    }

    v8::Local<v8::Object> source = info[2]->ToObject();
    if (source->IsUint8Array())
    {
        sourceData = node::Buffer::Data(source);
        sourceLength = node::Buffer::Length(source);
    }
    else
    {
        v8::Handle<v8::ArrayBuffer> obj = v8::Handle<v8::ArrayBuffer>::Cast(info[2]);
        v8::ArrayBuffer::Contents contents = obj->GetContents();
        sourceData = static_cast<char *>(contents.Data());
        sourceEnd = sourceLength = contents.ByteLength();
    }

    sourceStart = info[3]->Int32Value();
    if (sourceStart < 0 || sourceStart > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceStart: out of bounds");
    }

    sourceEnd = info[4]->Int32Value();
    if (sourceEnd < sourceStart || sourceEnd > sourceLength)
    {
        info.GetReturnValue().SetUndefined();
        return Nan::ThrowTypeError("Illegal sourceEnd: out of bounds");
    }

    size_t length = sourceEnd - sourceStart;
    if (length > 0)
    {
        if (targetOffset + length > targetLength)
        {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowTypeError("Illegal source range: target capacity overrun");
        }
        memmove(targetData + targetOffset, sourceData + sourceStart, length);
    }
    info.GetReturnValue().Set(Nan::New<v8::Number>(length));
}

NAN_MODULE_INIT(init)
{
    NAN_EXPORT(target, utou);
    NAN_EXPORT(target, atoa);
    NAN_EXPORT(target, atou);
    NAN_EXPORT(target, utoa);
    NAN_EXPORT(target, copy);
}

NODE_MODULE(memcpy, init)
