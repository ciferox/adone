#include <adone.h>
#include <sys/types.h>

#if ADONE_OS_WINDOWS == 0

#include <grp.h>
#include <pwd.h>
// #include <errno.h>
// #include <sys/time.h>
// #include <fcntl.h>
// #include <termios.h>

class UserId : public node::ObjectWrap
{
  public:
    static void Initialize(v8::Handle<v8::Object> target)
    {
        Nan::HandleScope scope;
        v8::Local<v8::FunctionTemplate> t = Nan::New<v8::FunctionTemplate>(New);
        t->InstanceTemplate()->SetInternalFieldCount(1);
        Nan::SetMethod(t, "uid", UserId::Uid);
        Nan::SetMethod(t, "gid", UserId::Gid);
        Nan::SetMethod(t, "gids", UserId::Gids);
        Nan::SetMethod(t, "username", UserId::UserName);
        Nan::SetMethod(t, "groupname", UserId::GroupName);
        Nan::Set(target, Nan::New<v8::String>("UserId").ToLocalChecked(), t->GetFunction());
    }

  protected:
    static NAN_METHOD(New)
    {
        Nan::HandleScope scope;
        UserId *userId = new UserId();
        userId->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    }

    static NAN_METHOD(Uid)
    {
        Nan::HandleScope scope;
        struct passwd *user = NULL;

        if ((info.Length() > 0) && info[0]->IsString())
        {
            String::Utf8Value name(info[0]->ToString());
            user = getpwnam(*name);
        }
        else
        {
            user = getpwnam(getlogin());
        }

        if (user)
        {
            v8::Local<v8::Object> obj = Nan::New<v8::Object>();
            obj->Set(NanStr("uid"), Nan::New(user->pw_uid));
            obj->Set(NanStr("gid"), Nan::New(user->pw_gid));
            info.GetReturnValue().Set(obj);
        }
        else
        {
            return Nan::ThrowError("Username not found");
        }
    }

    static NAN_METHOD(Gid)
    {
        Nan::HandleScope scope;
        struct group *group = NULL;

        if ((info.Length() > 0) && info[0]->IsString())
        {
            String::Utf8Value name(info[0]->ToString());
            group = getgrnam(*name);
        }
        else
        {
            group = getgrnam(getlogin());
        }

        if (group)
        {
            info.GetReturnValue().Set(group->gr_gid);
        }
        else
        {
            return Nan::ThrowError("Groupname not found");
        }
    }

    static NAN_METHOD(Gids)
    {
        Nan::HandleScope scope;
        int j, ngroups = 4;

#ifdef __APPLE__
        int *groups;
#else  // ifdef __APPLE__
        gid_t *groups;
#endif // ifdef __APPLE__
        struct passwd *pw;
        Local<Array> jsGroups = Nan::New<Array>();

        if (!((info.Length() > 0) && info[0]->IsString()))
        {
            return Nan::ThrowError("you must supply the groupname");
        }

        String::Utf8Value utfname(info[0]->ToString());
#ifdef __APPLE__
        groups = new int[ngroups]; // malloc(ngroups * sizeof(gid_t));
#else  // ifdef __APPLE__
        groups = new gid_t[ngroups]; // malloc(ngroups * sizeof(gid_t));
#endif // ifdef __APPLE__

        if (groups == NULL)
        {
            return Nan::ThrowError("generating groups: ");
        }

        pw = getpwnam(*utfname);

        if (pw == NULL)
        {
            return Nan::ThrowError("getpwnam");
        }

        if (getgrouplist(*utfname, pw->pw_gid, groups, &ngroups) == -1)
        {
            delete[] groups;
#ifdef __APPLE__
            groups = new int[ngroups];
#else  // ifdef __APPLE__
            groups = new gid_t[ngroups];
#endif // ifdef __APPLE__

            if (getgrouplist(*utfname, pw->pw_gid, groups, &ngroups) == -1)
            {
                return Nan::ThrowError("getgrouplist");
            }
        }

        for (j = 0; j < ngroups; j++)
        {
            Nan::Set(jsGroups, j, Nan::New(groups[j]));
        }

        delete[] groups;
        info.GetReturnValue().Set(jsGroups);
    }

    static NAN_METHOD(UserName)
    {
        Nan::HandleScope scope;
        struct passwd *user = NULL;

        if ((info.Length() > 0) && info[0]->IsInt32())
        {
            user = getpwuid(info[0]->Int32Value());
        }
        else
        {
            user = getpwuid(getuid());
        }

        if (user)
        {
            info.GetReturnValue().Set(NanStr(user->pw_name));
        }
        else
        {
            return Nan::ThrowError("UID not found");
        }
    }

    static NAN_METHOD(GroupName)
    {
        Nan::HandleScope scope;
        struct group *group = NULL;

        if ((info.Length() > 0) && info[0]->IsInt32())
        {
            group = getgrgid(info[0]->Int32Value());
        }
        else
        {
            group = getgrgid(getgid());
        }

        if (group)
        {
            info.GetReturnValue().Set(NanStr(group->gr_name));
        }
        else
        {
            return Nan::ThrowError("GID not found");
        }
    }
};

#endif // ADONE_OS_WINDOWS

// Descriptions:
//
// U = UInt8Array;
// A = ArrayBuffer
//
// All copy methods have  signature: (target, targetOffset, source, sourceStart, sourceEnd)

class Memory : public node::ObjectWrap
{
  public:
    static void Initialize(v8::Handle<v8::Object> target)
    {
        Nan::HandleScope scope;
        v8::Local<v8::FunctionTemplate> t = Nan::New<v8::FunctionTemplate>(New);
        t->InstanceTemplate()->SetInternalFieldCount(1);
        Nan::SetMethod(t, "copy", Memory::Copy);
        Nan::SetMethod(t, "utou", Memory::UToU);
        Nan::SetMethod(t, "atoa", Memory::AToA);
        Nan::SetMethod(t, "utoa", Memory::UToA);
        Nan::SetMethod(t, "atou", Memory::AToU);
        Nan::Set(target, Nan::New<v8::String>("Memory").ToLocalChecked(), t->GetFunction());
    }

  protected:
    static NAN_METHOD(New)
    {
        Nan::HandleScope scope;
        Memory *memory = new Memory();
        memory->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    }

    static NAN_METHOD(UToU)
    {
        Nan::HandleScope scope;

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

    static NAN_METHOD(AToA)
    {
        Nan::HandleScope scope;

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

    static NAN_METHOD(AToU)
    {
        Nan::HandleScope scope;

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

    static NAN_METHOD(UToA)
    {
        Nan::HandleScope scope;

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

    static NAN_METHOD(Copy)
    {
        Nan::HandleScope scope;

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
};

NAN_MODULE_INIT(init)
{
    Nan::HandleScope scope;

#if ADONE_OS_WINDOWS == 0

    UserId::Initialize(target);

#endif
    Memory::Initialize(target);
}

NODE_MODULE(common, init)