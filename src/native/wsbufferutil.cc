#include "adone.h"

class BufferUtil : public ObjectWrap
{
  public:
    static NAN_MODULE_INIT(Initialize)
    {
        Nan::HandleScope scope;
        Local<FunctionTemplate> t = Nan::New<FunctionTemplate>(New);
        t->InstanceTemplate()->SetInternalFieldCount(1);
        Nan::SetMethod(t, "unmask", BufferUtil::Unmask);
        Nan::SetMethod(t, "mask", BufferUtil::Mask);
        Nan::Set(target, Nan::New<String>("BufferUtil").ToLocalChecked(), t->GetFunction());
    }

  protected:
    static NAN_METHOD(New)
    {
        Nan::HandleScope scope;
        BufferUtil *bufferUtil = new BufferUtil();
        bufferUtil->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    }

    static NAN_METHOD(Mask)
    {
        char *from = node::Buffer::Data(info[0]);
        char *mask = node::Buffer::Data(info[1]);
        char *to = node::Buffer::Data(info[2]) + info[3]->Int32Value();
        size_t length = info[4]->Int32Value();
        size_t index = 0;

        //
        // Alignment preamble.
        //
        while (index < length && (reinterpret_cast<size_t>(from) & 0x07))
        {
            *to++ = *from++ ^ mask[index % 4];
            index++;
        }
        length -= index;
        if (!length)
            return;

        //
        // Realign mask and convert to 64 bit.
        //
        char maskAlignedArray[8];

        for (size_t i = 0; i < 8; i++, index++)
        {
            maskAlignedArray[i] = mask[index % 4];
        }

        //
        // Apply 64 bit mask in 8 byte chunks.
        //
        size_t loop = length / 8;
        uint64_t *pMask8 = reinterpret_cast<uint64_t *>(maskAlignedArray);

        while (loop--)
        {
            uint64_t *pFrom8 = reinterpret_cast<uint64_t *>(from);
            uint64_t *pTo8 = reinterpret_cast<uint64_t *>(to);
            *pTo8 = *pFrom8 ^ *pMask8;
            from += 8;
            to += 8;
        }

        //
        // Apply mask to remaining data.
        //
        char *pmaskAlignedArray = maskAlignedArray;

        length &= 0x7;
        while (length--)
        {
            *to++ = *from++ ^ *pmaskAlignedArray++;
        }
    }

    static NAN_METHOD(Unmask)
    {
        char *from = node::Buffer::Data(info[0]);
        size_t length = node::Buffer::Length(info[0]);
        char *mask = node::Buffer::Data(info[1]);
        size_t index = 0;

        //
        // Alignment preamble.
        //
        while (index < length && (reinterpret_cast<size_t>(from) & 0x07))
        {
            *from++ ^= mask[index % 4];
            index++;
        }
        length -= index;
        if (!length)
            return;

        //
        // Realign mask and convert to 64 bit.
        //
        char maskAlignedArray[8];

        for (size_t i = 0; i < 8; i++, index++)
        {
            maskAlignedArray[i] = mask[index % 4];
        }

        //
        // Apply 64 bit mask in 8 byte chunks.
        //
        size_t loop = length / 8;
        uint64_t *pMask8 = reinterpret_cast<uint64_t *>(maskAlignedArray);

        while (loop--)
        {
            uint64_t *pSource8 = reinterpret_cast<uint64_t *>(from);
            *pSource8 ^= *pMask8;
            from += 8;
        }

        //
        // Apply mask to remaining data.
        //
        char *pmaskAlignedArray = maskAlignedArray;

        length &= 0x7;
        while (length--)
        {
            *from++ ^= *pmaskAlignedArray++;
        }
    }
};

NODE_MODULE(bufferutil, BufferUtil::Initialize)
