#include "adone.h"
#include <sys/types.h>
#include <grp.h>
#include <pwd.h>

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
#else                              // ifdef __APPLE__
        groups = new gid_t[ngroups]; // malloc(ngroups * sizeof(gid_t));
#endif                             // ifdef __APPLE__

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

void init(v8::Handle<v8::Object> target)
{
    Nan::HandleScope scope;
    UserId::Initialize(target);
}

NODE_MODULE(userid, init)