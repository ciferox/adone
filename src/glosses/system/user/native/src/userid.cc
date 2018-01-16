#include <adone.h>
#include <sys/types.h>
#include <grp.h>
#include <pwd.h>

NAN_METHOD(uid)
{
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

NAN_METHOD(gid)
{
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

NAN_METHOD(gids)
{
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
        return Nan::ThrowError("You must supply the groupname");
    }

    String::Utf8Value utfname(info[0]->ToString());
#ifdef __APPLE__
    groups = new int[ngroups]; // malloc(ngroups * sizeof(gid_t));
#else                          // ifdef __APPLE__
    groups = new gid_t[ngroups]; // malloc(ngroups * sizeof(gid_t));
#endif                         // ifdef __APPLE__

    if (groups == NULL)
    {
        return Nan::ThrowError("Generating groups: ");
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

NAN_METHOD(username)
{
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

NAN_METHOD(groupname)
{
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

NAN_MODULE_INIT(init)
{
    NAN_EXPORT(target, uid);
    NAN_EXPORT(target, gid);
    NAN_EXPORT(target, gids);
    NAN_EXPORT(target, username);
    NAN_EXPORT(target, groupname);
}

NODE_MODULE(user, init)
