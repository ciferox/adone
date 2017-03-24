#include "../adone.h"

#if ADONE_OS_WINDOWS

#pragma warning(disable : 4244)

#include <io.h>
#include <sys/utime.h>
#include <shlwapi.h>
#include <psapi.h>
#include "win32/wmi.h"

#pragma comment(lib, "shlwapi")
#pragma comment(lib, "psapi")

#define LOCK_SH 1
#define LOCK_EX 2
#define LOCK_NB 4
#define LOCK_UN 8


static SYSTEM_INFO systemInfo;
static char version[64];
static char codeName[128];
static uint32_t buildNumber;

int fcntl(int fildes, int cmd, ...) {
    return -1;
}

// Win32_Process class

struct {
    wchar_t* Name;
    wchar_t* CommandLine;
    uint16_t ExecutionState;
    uint32_t ProcessID;
    uint32_t ParentProcessId;
    uint32_t ThreadCount;
    uint32_t Priority;
    uint64_t VirtualSize;
    uint64_t WorkingSetSize;
    uint64_t KernelModeTime;
    uint64_t UserModeTime;
    uint64_t CreationDate;
    uint64_t ReadTransferCount;
    uint64_t WriteTransferCount;
} win32ProcessData;

wmi_class_property_t win32ProcessProps[] = {
    { 'S', &win32ProcessData.Name, L"Name", "name" },
    { 'S', &win32ProcessData.CommandLine, L"CommandLine", "commandLine" },
    { 'w', &win32ProcessData.ExecutionState, L"ExecutionState", "executionState" },
    { 'u', &win32ProcessData.ProcessID, L"ProcessID", "pid" },
    { 'u', &win32ProcessData.ParentProcessId, L"ParentProcessId", "parentPid" },
    { 'u', &win32ProcessData.ThreadCount, L"ThreadCount", "threadCount" },
    { 'u', &win32ProcessData.Priority, L"Priority", "priority" },
    { 'q', &win32ProcessData.VirtualSize, L"VirtualSize", "virtualSize" },
    { 'q', &win32ProcessData.WorkingSetSize, L"WorkingSetSize", "workingSetSize" },
    { 'q', &win32ProcessData.KernelModeTime, L"KernelModeTime", "kernelTime" },
    { 'q', &win32ProcessData.UserModeTime, L"UserModeTime", "userTime" },
    { 'D', &win32ProcessData.CreationDate, L"CreationDate", "creationDate" },
    { 'q', &win32ProcessData.ReadTransferCount, L"ReadTransferCount", "bytesRead" },
    { 'q', &win32ProcessData.WriteTransferCount, L"WriteTransferCount", "bytesWritten" },
    { 0, NULL, NULL }
};

wmi_class_info_t win32ProcessClassInfo = {
    L"Win32_Process",
    &win32ProcessData,
    sizeof(win32ProcessData),
    win32ProcessProps
};

static IDispatch* pWmiService = NULL;


#else

#include <sys/file.h>
#include <utime.h>
#include <sys/statvfs.h>

#if ADONE_OS_LINUX

#include <sys/sysinfo.h>

#elif ADONE_OS_FREEBSD

#include <sys/types.h>
#include <sys/sysctl.h>
#include <sys/param.h>
#include <sys/queue.h>
#include <sys/user.h>
#include <sys/socket.h>
#include <libprocstat.h>

Local<Object> createProcessObject(struct procstat* prstat, struct kinfo_proc *p, time_t now) {
    Local<Object> proc = Nan::New<Object>();
    proc->Set(NanStr("pid"), Nan::New<Integer>(p->ki_pid));
    proc->Set(NanStr("parentPid"), Nan::New<Integer>(p->ki_ppid));
    proc->Set(NanStr("name"), NanStr(p->ki_comm));

    char pathName[PATH_MAX];
    if (procstat_getpathname(prstat, p, pathName, sizeof(pathName)) == 0) {
        proc->Set(NanStr("path"), NanStr(pathName));
    } else {
        proc->Set(NanStr("path"), NanStr(""));
    }

    // ps'like state description
    int state = 6;
    long tdflags = p->ki_tdflags;

    switch (p->ki_stat) {
        case SSTOP:
            state = 5; // Process.STOPPED
            break;
        case SSLEEP:
            if (tdflags & TDF_SINTR) {
                state = 2; // Process.SLEEPING
            }
            else {
                state = 3; // Process.WAITING
            }
            break;
        case SRUN:
        case SIDL:
            state = 1; // Process.RUNNING
            break;
        case SWAIT:
            state = 3; // Process.WAITING
            break;
        case SLOCK:
            state = 3; // Process.WAITING
        case SZOMB:
            state = 4; // Process.ZOMBIE
            break;
    }
    proc->Set(NanStr("state"), Nan::New<Integer>(state));
    proc->Set(NanStr("priority"), Nan::New<Integer>(p->ki_pri.pri_level - PZERO));
    proc->Set(NanStr("threadCount"), Nan::New<Integer>(p->ki_numthreads));
    proc->Set(NanStr("virtualSize"), Nan::New<Number>(static_cast<unsigned long>(p->ki_size)));
    proc->Set(NanStr("residentSetSize"), Nan::New<Number>(p->ki_rssize * 1024));

    const struct rusage& usage = p->ki_rusage;
    proc->Set(NanStr("kernelTime"), Nan::New<Number>(((usage.ru_stime.tv_sec * 1000000) + usage.ru_stime.tv_usec) / 1000));
    proc->Set(NanStr("userTime"), Nan::New<Number>(((usage.ru_utime.tv_sec * 1000000) + usage.ru_utime.tv_usec) / 1000));
    proc->Set(NanStr("elapsedTime"), Nan::New<Number>((now - p->ki_start.tv_sec) * 1000));
    
    return proc;
}

#endif // ADONE_OS_LINUX

static Nan::Persistent<String> f_namemax_symbol;
static Nan::Persistent<String> f_bsize_symbol;
static Nan::Persistent<String> f_frsize_symbol;

static Nan::Persistent<String> f_blocks_symbol;
static Nan::Persistent<String> f_bavail_symbol;
static Nan::Persistent<String> f_bfree_symbol;

static Nan::Persistent<String> f_files_symbol;
static Nan::Persistent<String> f_favail_symbol;
static Nan::Persistent<String> f_ffree_symbol;


#endif

struct store_data_t
{
    Nan::Callback *cb;
    int fs_op; // operation type within this module
    int fd;
    int oper;
    int arg;
    off_t offset;
    struct utimbuf utime_buf;
#ifndef ADONE_OS_WINDOWS
    struct statvfs statvfs_buf;
#endif
    char *path;
    int error;
    int result;
};

enum
{
    FS_OP_FLOCK,
    FS_OP_SEEK,
    FS_OP_UTIME,
    FS_OP_STATVFS,
    FS_OP_FCNTL,
};

static void EIO_After(uv_work_t *req)
{
    Nan::HandleScope scope;

    store_data_t *store_data = static_cast<store_data_t *>(req->data);

    // there is always at least one argument. "error"
    int argc = 1;

    // Allocate space for two args: error plus possible additional result
    Local<Value> argv[2];
    Local<Object> statvfs_result;
    // NOTE: This may need to be changed if something returns a -1
    // for a success, which is possible.
    if (store_data->result == -1)
    {
        // If the request doesn't have a path parameter set.
        argv[0] = Nan::ErrnoException(store_data->error);
    }
    else
    {
        // error value is empty or null for non-error.
        argv[0] = Nan::Null();

        switch (store_data->fs_op)
        {
        // These operations have no data to pass other than "error".
        case FS_OP_FLOCK:
        case FS_OP_UTIME:
            argc = 1;
            break;

        case FS_OP_SEEK:
            argc = 2;
            argv[1] = Nan::New<Number>(store_data->offset);
            break;
        case FS_OP_STATVFS:
#ifndef ADONE_OS_WINDOWS
            argc = 2;
            statvfs_result = Nan::New<Object>();
            argv[1] = statvfs_result;
            statvfs_result->Set(Nan::New<String>(f_namemax_symbol), Nan::New<Integer>(static_cast<uint32_t>(store_data->statvfs_buf.f_namemax)));
            statvfs_result->Set(Nan::New<String>(f_bsize_symbol), Nan::New<Integer>(static_cast<uint32_t>(store_data->statvfs_buf.f_bsize)));
            statvfs_result->Set(Nan::New<String>(f_frsize_symbol), Nan::New<Integer>(static_cast<uint32_t>(store_data->statvfs_buf.f_frsize)));
            statvfs_result->Set(Nan::New<String>(f_blocks_symbol), Nan::New<Number>(store_data->statvfs_buf.f_blocks));
            statvfs_result->Set(Nan::New<String>(f_bavail_symbol), Nan::New<Number>(store_data->statvfs_buf.f_bavail));
            statvfs_result->Set(Nan::New<String>(f_bfree_symbol), Nan::New<Number>(store_data->statvfs_buf.f_bfree));
            statvfs_result->Set(Nan::New<String>(f_files_symbol), Nan::New<Number>(store_data->statvfs_buf.f_files));
            statvfs_result->Set(Nan::New<String>(f_favail_symbol), Nan::New<Number>(store_data->statvfs_buf.f_favail));
            statvfs_result->Set(Nan::New<String>(f_ffree_symbol), Nan::New<Number>(store_data->statvfs_buf.f_ffree));
#else
            argc = 1;
#endif
            break;
        case FS_OP_FCNTL:
            argc = 2;
            argv[1] = Nan::New<Number>(store_data->result);
            break;
        default:
            assert(0 && "Unhandled op type value");
        }
    }

    Nan::TryCatch try_catch;

    store_data->cb->Call(argc, argv);

    if (try_catch.HasCaught())
    {
        Nan::FatalException(try_catch);
    }

    // Dispose of the persistent handle
    delete store_data->cb;
    delete store_data;
    delete req;
}

static void EIO_StatVFS(uv_work_t *req)
{
    store_data_t *statvfs_data = static_cast<store_data_t *>(req->data);
    statvfs_data->result = 0;
#ifndef ADONE_OS_WINDOWS
    struct statvfs *data = &(statvfs_data->statvfs_buf);
    if (statvfs(statvfs_data->path, data))
    {
        statvfs_data->result = -1;
        memset(data, 0, sizeof(struct statvfs));
    };
#endif
    free(statvfs_data->path);
    ;
}

static void EIO_Seek(uv_work_t *req)
{
    store_data_t *seek_data = static_cast<store_data_t *>(req->data);

    off_t offs = lseek(seek_data->fd, seek_data->offset, seek_data->oper);

    if (offs == -1) {
        seek_data->result = -1;
        seek_data->error = errno;
    }
    else {
        seek_data->offset = offs;
    }
}

static void EIO_Fcntl(uv_work_t *req)
{
    store_data_t *data = static_cast<store_data_t *>(req->data);
    int result = data->result = fcntl(data->fd, data->oper, data->arg);
    if (result == -1)
    {
        data->error = errno;
    }
}

#if ADONE_OS_WINDOWS

static void uv__crt_invalid_parameter_handler(const wchar_t *expression, const wchar_t *function, const wchar_t *file, unsigned int line, uintptr_t reserved)
{
    /* No-op. */
}

#define LK_LEN 0xffff0000

static int _win32_flock(int fd, int oper)
{
    OVERLAPPED o;
    HANDLE fh;

    int i = -1;

    fh = (HANDLE)_get_osfhandle(fd);
    if (fh == (HANDLE)-1)
        return -1;

    memset(&o, 0, sizeof(o));

    switch (oper)
    {
    case LOCK_SH: /* shared lock */
        if (LockFileEx(fh, 0, 0, LK_LEN, 0, &o))
            i = 0;
        break;
    case LOCK_EX: /* exclusive lock */
        if (LockFileEx(fh, LOCKFILE_EXCLUSIVE_LOCK, 0, LK_LEN, 0, &o))
            i = 0;
        break;
    case LOCK_SH | LOCK_NB: /* non-blocking shared lock */
        if (LockFileEx(fh, LOCKFILE_FAIL_IMMEDIATELY, 0, LK_LEN, 0, &o))
            i = 0;
        break;
    case LOCK_EX | LOCK_NB: /* non-blocking exclusive lock */
        if (LockFileEx(fh, LOCKFILE_EXCLUSIVE_LOCK | LOCKFILE_FAIL_IMMEDIATELY,
                       0, LK_LEN, 0, &o))
            i = 0;
        break;
    case LOCK_UN: /* unlock lock */
        if (UnlockFileEx(fh, 0, LK_LEN, 0, &o))
            i = 0;
        break;
    default: /* unknown */
        errno = EINVAL;
        return -1;
    }
    if (i == -1)
    {
        if (GetLastError() == ERROR_LOCK_VIOLATION)
            errno = WSAEWOULDBLOCK;
        else
            errno = EINVAL;
    }
    return i;
}

#endif

static void EIO_Flock(uv_work_t *req)
{
    store_data_t *flock_data = static_cast<store_data_t *>(req->data);

#if ADONE_OS_WINDOWS
    int i = _win32_flock(flock_data->fd, flock_data->oper);
#else
    int i = flock(flock_data->fd, flock_data->oper);
#endif

    flock_data->result = i;
    flock_data->error = errno;
}

#ifdef _LARGEFILE_SOURCE
static inline int IsInt64(double x)
{
    return x == static_cast<double>(static_cast<int64_t>(x));
}
#endif

#ifndef _LARGEFILE_SOURCE
#define ASSERT_OFFSET(a)                                          \
    if (!(a)->IsUndefined() && !(a)->IsNull() && !(a)->IsInt32()) \
    {                                                             \
        return Nan::ThrowTypeError("Not an integer");             \
    }
#define GET_OFFSET(a) ((a)->IsNumber() ? (a)->Int32Value() : -1)
#else
#define ASSERT_OFFSET(a)                                                       \
    if (!(a)->IsUndefined() && !(a)->IsNull() && !IsInt64((a)->NumberValue())) \
    {                                                                          \
        return Nan::ThrowTypeError("Not an integer");                          \
    }
#define GET_OFFSET(a) ((a)->IsNumber() ? (a)->IntegerValue() : -1)
#endif

static void EIO_UTime(uv_work_t *req)
{
    store_data_t *utime_data = static_cast<store_data_t *>(req->data);

    off_t i = utime(utime_data->path, &utime_data->utime_buf);
    free(utime_data->path);

    if (i == (off_t)-1)
    {
        utime_data->result = -1;
        utime_data->error = errno;
    }
    else
    {
        utime_data->result = i;
    }
}


class System : public node::ObjectWrap
{
public:
    static void Initialize(Handle<Object> target)
    {
        Nan::HandleScope scope;
        Local<FunctionTemplate> t = Nan::New<FunctionTemplate>(New);
        t->InstanceTemplate()->SetInternalFieldCount(1);

        Nan::SetMethod(t, "getPageSize", System::GetPageSize);
        Nan::SetMethod(t, "getProcesses", System::GetProcesses);
        Nan::SetMethod(t, "getProcess", System::GetProcess);
        Nan::SetMethod(t, "getProcessCount", System::GetProcessCount);
        Nan::SetMethod(t, "getThreadCount", System::GetThreadCount);

        Nan::SetMethod(t, "seek", System::Seek);
        Nan::SetMethod(t, "fcntl", System::Fcntl);
        Nan::SetMethod(t, "flock", System::Flock);
        Nan::SetMethod(t, "utime", System::UTime);
        Nan::SetMethod(t, "statVFS", System::StatVFS);

#ifdef SEEK_SET
    NODE_DEFINE_CONSTANT(target, SEEK_SET);
#endif

#ifdef SEEK_CUR
    NODE_DEFINE_CONSTANT(target, SEEK_CUR);
#endif

#ifdef SEEK_END
    NODE_DEFINE_CONSTANT(target, SEEK_END);
#endif

#ifdef LOCK_SH
    NODE_DEFINE_CONSTANT(target, LOCK_SH);
#endif

#ifdef LOCK_EX
    NODE_DEFINE_CONSTANT(target, LOCK_EX);
#endif

#ifdef LOCK_NB
    NODE_DEFINE_CONSTANT(target, LOCK_NB);
#endif

#ifdef LOCK_UN
    NODE_DEFINE_CONSTANT(target, LOCK_UN);
#endif

#ifdef F_GETFD
    NODE_DEFINE_CONSTANT(target, F_GETFD);
#endif

#ifdef F_SETFD
    NODE_DEFINE_CONSTANT(target, F_SETFD);
#endif

#ifdef FD_CLOEXEC
    NODE_DEFINE_CONSTANT(target, FD_CLOEXEC);
#endif

#if ADONE_OS_WINDOWS
        SetErrorMode(SEM_FAILCRITICALERRORS);
        _set_invalid_parameter_handler(uv__crt_invalid_parameter_handler);

        GetNativeSystemInfo(&systemInfo);
        version[0] = '\0';

        Nan::SetMethod(t, "getVersionInfo", System::GetVersionInfo);
        Nan::SetMethod(t, "getLocalVolumes", System::GetLocalVolumes);
        
        HRESULT hres = CoInitializeEx(0, COINIT_MULTITHREADED);
        if (SUCCEEDED(hres)) {
            CoGetObject(L"winmgmts:{impersonationLevel=impersonate}!\\\\.\\root\\cimv2", NULL, IID_IDispatch, (void**)&pWmiService);
        }

        // pWmiService should be released on module unload...
        // if (pWmiService != NULL) {
        //     pWmiService->Release();
        // }
        // CoUninitialize();

#elif ADONE_OS_LINUX
        Nan::SetMethod(t, "diskCheck", System::DiskCheck);
        Nan::SetMethod(t, "sysinfo", System::SysInfo);
#elif ADONE_OS_FREEBSD
        Nan::SetMethod(t, "sysctl", System::SysCtl);
#endif

        Nan::Set(target, Nan::New<String>("System").ToLocalChecked(), t->GetFunction());
    }

protected:
    static NAN_METHOD(New)
    {
        Nan::HandleScope scope;
        System *system = new System();
        system->Wrap(info.This());
        info.GetReturnValue().Set(info.This());
    }

    static NAN_METHOD(GetPageSize)
    {
        Nan::HandleScope scope;
        uint32_t pageSize;

#if ADONE_OS_WINDOWS

        pageSize = systemInfo.dwPageSize;

#elif ADONE_OS_FREEBSD

        size_t size = 4;

        if (sysctlbyname("hw.pagesize", (void*)&pageSize, &size, NULL, 0) != 0) {                                                                                                                              
            pageSize = 4096;
        }

#elif ADONE_OS_LINUX

        pageSize = getpagesize();

#endif

        info.GetReturnValue().Set(Nan::New<Integer>(pageSize));
    }

    static NAN_METHOD(GetProcesses)
    {
        Nan::HandleScope scope;
        Local<Array> processes = Nan::New<Array>();

#if ADONE_OS_WINDOWS

        wmi_obtain_list(pWmiService, &win32ProcessClassInfo, NULL, processes);

#elif ADONE_OS_FREEBSD

        struct procstat* prstat;
        struct kinfo_proc *p, *kip;
        unsigned int cnt = 0;
        time_t now;
        
        time(&now);
        prstat = procstat_open_sysctl();
        kip = p = procstat_getprocs(prstat, KERN_PROC_PROC, 0, &cnt);

        for (unsigned int i = 0; i < cnt; ++i, p++) {
            processes->Set(Nan::New<Integer>(i), createProcessObject(prstat, p, now));
        }
        
        procstat_freeprocs(prstat, kip);
        procstat_close(prstat);

#endif

        info.GetReturnValue().Set(processes);
    }

    static NAN_METHOD(GetProcess)
    {
        Nan::HandleScope scope;
        Local<Object> process;

        if (info.Length() < 1) {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowError("Illegal number of arguments");
        }

#if ADONE_OS_WINDOWS

        uint32_t pid = info[0]->Uint32Value();
        wchar_t query[32];
        wsprintfW(query, L" WHERE ProcessId=%u", pid);

        Local<Array> processes = Nan::New<Array>();
        wmi_obtain_list(pWmiService, &win32ProcessClassInfo, query, processes);

        process = processes->Get(0)->ToObject();

#elif ADONE_OS_FREEBSD

        struct procstat* prstat;
        struct kinfo_proc *p, *kip;
        unsigned int cnt = 0;
        time_t now;
        
        
        time(&now);
        prstat = procstat_open_sysctl();
        kip = p = procstat_getprocs(prstat, KERN_PROC_PROC, 0, &cnt);
        
        int pid = info[0]->Uint32Value();
        unsigned int i = 0;
        
        
        for ( ; i < cnt; ++i, p++) {
            if (pid == p->ki_pid) {
                process = createProcessObject(prstat, p, now);
                break;
            }
        }
        
        procstat_freeprocs(prstat, kip);
        procstat_close(prstat);
        
        if (i == cnt) {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowError("Unknown process");
        }

#endif

        info.GetReturnValue().Set(process);
    }

    static NAN_METHOD(GetProcessCount)
    {
        Nan::HandleScope scope;
        uint32_t processCount;

#if ADONE_OS_WINDOWS

        PERFORMANCE_INFORMATION perfInfo;
        GetPerformanceInfo(&perfInfo, sizeof(perfInfo));
        processCount = perfInfo.ProcessCount;

#elif ADONE_OS_FREEBSD

        struct procstat* prstat;
        struct kinfo_proc* p;

        prstat = procstat_open_sysctl();
        p = procstat_getprocs(prstat, KERN_PROC_PROC, 0, &processCount);
        procstat_freeprocs(prstat, p);
        procstat_close(prstat);

#elif ADONE_OS_LINUX

        processCount = 0;

#endif

        info.GetReturnValue().Set(Nan::New<Integer>(processCount));
    }

    static NAN_METHOD(GetThreadCount)
    {
        Nan::HandleScope scope;
        uint32_t threadCount = 0;

#if ADONE_OS_WINDOWS

        PERFORMANCE_INFORMATION perfInfo;
        GetPerformanceInfo(&perfInfo, sizeof(perfInfo));
        threadCount = perfInfo.ThreadCount;

#elif ADONE_OS_FREEBSD

        unsigned int cnt;
        struct procstat* prstat;
        struct kinfo_proc *p, *kip;
        
        prstat = procstat_open_sysctl();
        kip = p = procstat_getprocs(prstat, KERN_PROC_PROC, 0, &cnt);
        for (unsigned int i = 0; i < cnt; ++i, p++) {;
            threadCount += p->ki_numthreads;
        }
        
        procstat_freeprocs(prstat, kip);
        procstat_close(prstat);

#elif ADONE_OS_LINUX


#endif
        info.GetReturnValue().Set(Nan::New<Integer>(threadCount));
    }

    static NAN_METHOD(Flock)
    {
        if (info.Length() < 2 || !info[0]->IsInt32() || !info[1]->IsInt32()) {
            return THROW_BAD_ARGS;
        }

        store_data_t *flock_data = new store_data_t();

        flock_data->fs_op = FS_OP_FLOCK;
        flock_data->fd = info[0]->Int32Value();
        flock_data->oper = info[1]->Int32Value();

        if (info[2]->IsFunction()) {
            flock_data->cb = new Nan::Callback((Local<Function>)info[2].As<Function>());
            uv_work_t *req = new uv_work_t;
            req->data = flock_data;
            uv_queue_work(uv_default_loop(), req, EIO_Flock, (uv_after_work_cb)EIO_After);
            info.GetReturnValue().SetUndefined();
        }
        else {
    #ifdef _WIN32
            int i = _win32_flock(flock_data->fd, flock_data->oper);
    #else
            int i = flock(flock_data->fd, flock_data->oper);
    #endif
            delete flock_data;
            if (i != 0) return Nan::ThrowError(Nan::ErrnoException(errno));
            info.GetReturnValue().SetUndefined();
        }
    }

    static NAN_METHOD(Seek)
    {
        if (info.Length() < 3 || !info[0]->IsInt32() || !info[2]->IsInt32()) {
            return THROW_BAD_ARGS;
        }

        int fd = info[0]->Int32Value();
        ASSERT_OFFSET(info[1]);
        off_t offs = GET_OFFSET(info[1]);
        int whence = info[2]->Int32Value();

        if (!info[3]->IsFunction()) {
            off_t offs_result = lseek(fd, offs, whence);
            if (offs_result == -1) return Nan::ThrowError(Nan::ErrnoException(errno));
            info.GetReturnValue().Set(Nan::New<Number>(offs_result));
            return;
        }

        store_data_t *seek_data = new store_data_t();

        seek_data->cb = new Nan::Callback((Local<Function>)info[3].As<Function>());
        seek_data->fs_op = FS_OP_SEEK;
        seek_data->fd = fd;
        seek_data->offset = offs;
        seek_data->oper = whence;

        uv_work_t *req = new uv_work_t;
        req->data = seek_data;
        uv_queue_work(uv_default_loop(), req, EIO_Seek, (uv_after_work_cb)EIO_After);

        info.GetReturnValue().SetUndefined();
    }

    //  fs.fcntl(fd, cmd, [arg])

    static NAN_METHOD(Fcntl)
    {
        if (info.Length() < 3 ||
            !info[0]->IsInt32() ||
            !info[1]->IsInt32() ||
            !info[2]->IsInt32())
        {
            return THROW_BAD_ARGS;
        }

        int fd = info[0]->Int32Value();
        int cmd = info[1]->Int32Value();
        int arg = info[2]->Int32Value();

        if (!info[3]->IsFunction())
        {
            int result = fcntl(fd, cmd, arg);
            if (result == -1)
                return Nan::ThrowError(Nan::ErrnoException(errno));
            info.GetReturnValue().Set(Nan::New<Number>(result));
            return;
        }

        store_data_t *data = new store_data_t();

        data->cb = new Nan::Callback((Local<Function>)info[3].As<Function>());
        data->fs_op = FS_OP_FCNTL;
        data->fd = fd;
        data->oper = cmd;
        data->arg = arg;

        uv_work_t *req = new uv_work_t;
        req->data = data;
        uv_queue_work(uv_default_loop(), req, EIO_Fcntl, (uv_after_work_cb)EIO_After);

        info.GetReturnValue().SetUndefined();
    }

    // Wrapper for utime(2).
    //   fs.utime( path, atime, mtime, [callback] )

    static NAN_METHOD(UTime)
    {
        if (info.Length() < 3 || info.Length() > 4 || !info[0]->IsString() || !info[1]->IsNumber() || !info[2]->IsNumber()) {
            return THROW_BAD_ARGS;
        }

        String::Utf8Value path(info[0]->ToString());
        time_t atime = info[1]->IntegerValue();
        time_t mtime = info[2]->IntegerValue();

        // Synchronous call needs much less work
        if (!info[3]->IsFunction()) {
            struct utimbuf buf;
            buf.actime = atime;
            buf.modtime = mtime;
            int ret = utime(*path, &buf);
            if (ret != 0)
                return Nan::ThrowError(Nan::ErrnoException(errno, "utime", "", *path));
            info.GetReturnValue().SetUndefined();
            return;
        }

        store_data_t *utime_data = new store_data_t();

        utime_data->cb = new Nan::Callback((Local<Function>)info[3].As<Function>());
        utime_data->fs_op = FS_OP_UTIME;
        utime_data->path = strdup(*path);
        utime_data->utime_buf.actime = atime;
        utime_data->utime_buf.modtime = mtime;

        uv_work_t *req = new uv_work_t;
        req->data = utime_data;
        uv_queue_work(uv_default_loop(), req, EIO_UTime, (uv_after_work_cb)EIO_After);

        info.GetReturnValue().SetUndefined();
    }

    // Wrapper for statvfs(2).
    //   fs.statVFS( path, [callback] )

    static NAN_METHOD(StatVFS)
    {
        if (info.Length() < 1 || !info[0]->IsString()) {
            return THROW_BAD_ARGS;
        }

        String::Utf8Value path(info[0]->ToString());

        // Synchronous call needs much less work
        if (!info[1]->IsFunction()) {
    #ifndef ADONE_OS_WINDOWS
            struct statvfs buf;
            int ret = statvfs(*path, &buf);
            if (ret != 0) {
                return Nan::ThrowError(Nan::ErrnoException(errno, "statvfs", "", *path));
            }
            Local<Object> result = Nan::New<Object>();
            result->Set(Nan::New<String>(f_namemax_symbol), Nan::New<Integer>(static_cast<uint32_t>(buf.f_namemax)));
            result->Set(Nan::New<String>(f_bsize_symbol), Nan::New<Integer>(static_cast<uint32_t>(buf.f_bsize)));
            result->Set(Nan::New<String>(f_frsize_symbol), Nan::New<Integer>(static_cast<uint32_t>(buf.f_frsize)));

            result->Set(Nan::New<String>(f_blocks_symbol), Nan::New<Number>(buf.f_blocks));
            result->Set(Nan::New<String>(f_bavail_symbol), Nan::New<Number>(buf.f_bavail));
            result->Set(Nan::New<String>(f_bfree_symbol), Nan::New<Number>(buf.f_bfree));

            result->Set(Nan::New<String>(f_files_symbol), Nan::New<Number>(buf.f_files));
            result->Set(Nan::New<String>(f_favail_symbol), Nan::New<Number>(buf.f_favail));
            result->Set(Nan::New<String>(f_ffree_symbol), Nan::New<Number>(buf.f_ffree));
            info.GetReturnValue().Set(result);
    #else
            info.GetReturnValue().SetUndefined();
    #endif
            return;
        }

        store_data_t *statvfs_data = new store_data_t();

        statvfs_data->cb = new Nan::Callback((Local<Function>)info[1].As<Function>());
        statvfs_data->fs_op = FS_OP_STATVFS;
        statvfs_data->path = strdup(*path);

        uv_work_t *req = new uv_work_t;
        req->data = statvfs_data;
        uv_queue_work(uv_default_loop(), req, EIO_StatVFS, (uv_after_work_cb)EIO_After);

        info.GetReturnValue().SetUndefined();
    }


#if ADONE_OS_WINDOWS

    static NAN_METHOD(GetVersionInfo)
    {
        Nan::HandleScope scope;

        if (version[0] == '\0') {
            OSVERSIONINFOEXA osInfo;

            ZeroMemory(&osInfo, sizeof(OSVERSIONINFOEXA));
            osInfo.dwOSVersionInfoSize = sizeof(OSVERSIONINFOEXA);
            GetVersionExA(reinterpret_cast<LPOSVERSIONINFO>(&osInfo));

            boolean ntWorkstation = osInfo.wProductType == VER_NT_WORKSTATION;
            uint32_t major = osInfo.dwMajorVersion;
            uint32_t minor = osInfo.dwMinorVersion;
            uint16_t suiteMask = osInfo.wSuiteMask;

            if (major == 10) {
                if (minor == 0) {
                    lstrcpyA(version, ntWorkstation ? "10" : "Server 2016");
                }
            }
            else if (major == 6) {
                if (minor == 3) {
                    lstrcpyA(version, ntWorkstation ? "8.1" : "Server 2012 R2");
                }
                else if (minor == 2) {
                    lstrcpyA(version, ntWorkstation ? "8" : "Server 2012");
                }
                else if (minor == 1) {
                    lstrcpyA(version, ntWorkstation ? "7" : "Server 2008 R2");
                }
                else if (minor == 0) {
                    lstrcpyA(version, ntWorkstation ? "Vista" : "Server 2008");
                }
            }
            else if (major == 5) {
                if (minor == 2) {
                    if ((suiteMask & 0x8000) != 0) {
                        lstrcpyA(version, "Home Server");
                    }
                    else if (ntWorkstation) {
                        lstrcpyA(version, "XP"); // 64 bits
                    }
                    else {
                        lstrcpyA(version, GetSystemMetrics(SM_SERVERR2) != 0 ? "Server 2003" : "Server 2003 R2");
                    }
                }
                else if (minor == 1) {
                    lstrcpyA(version, "XP"); // 32 bits
                }
            }

            if (osInfo.wServicePackMajor != 0) {
                char spVer[8];
                lstrcatA(version, " SP ");
                wsprintfA(spVer, "%u", (uint32_t)osInfo.wServicePackMajor);
                lstrcatA(version, spVer);
            }

            codeName[0] = 0;

            if ((suiteMask & 0x00000002) != 0) {
                lstrcatA(codeName, "Enterprise,");
            }
            if ((suiteMask & 0x00000004) != 0) {
                lstrcatA(codeName, "BackOffice,");
            }
            if ((suiteMask & 0x00000008) != 0) {
                lstrcatA(codeName, "Communication Server,");
            }
            if ((suiteMask & 0x00000080) != 0) {
                lstrcatA(codeName, "Datacenter,");
            }
            if ((suiteMask & 0x00000200) != 0) {
                lstrcatA(codeName, "Home,");
            }
            if ((suiteMask & 0x00000400) != 0) {
                lstrcatA(codeName, "Web Server,");
            }
            if ((suiteMask & 0x00002000) != 0) {
                lstrcatA(codeName, "Storage Server,");
            }
            if ((suiteMask & 0x00004000) != 0) {
                lstrcatA(codeName, "Compute Cluster,");
            }

            int len = lstrlenA(codeName);
            if (len > 0) {
                codeName[len - 1] = '\0';
            }

            buildNumber = osInfo.dwBuildNumber;
        }

        Local<Object> versionInfo = Nan::New<Object>();
        versionInfo->Set(NanStr("version"), NanStr(version));
        versionInfo->Set(NanStr("codeName"), NanStr(codeName));
        versionInfo->Set(NanStr("buildNumber"), Nan::New<Integer>(buildNumber));

        info.GetReturnValue().Set(versionInfo);
    }

    static NAN_METHOD(GetLocalVolumes)
    {
#define BUF_SIZE 255
        Local<Array> result = Nan::New<Array>();
        char volumeName[BUF_SIZE];

        HANDLE hVol = FindFirstVolumeA(volumeName, BUF_SIZE);
        if (hVol != INVALID_HANDLE_VALUE) {
            int i = 0;

            while (true) {
                char fsType[16];
                char name[BUF_SIZE];
                char mount[BUF_SIZE];
                ULARGE_INTEGER userFreeBytes;
                ULARGE_INTEGER totalBytes;
                ULARGE_INTEGER systemFreeBytes;

                int index = lstrlenA(volumeName) - 1;
                if (volumeName[0] != '\\' || volumeName[1] != '\\' || volumeName[2] != '?' || volumeName[3] != '\\' || volumeName[index] != '\\') {
                    info.GetReturnValue().SetUndefined();
                    char errStr[BUF_SIZE];
                    wsprintfA(errStr, "FindFirstVolume/FindNextVolume returned a bad path: %s", volumeName);
                    return Nan::ThrowError(errStr);
                    break;
                }

                StrTrimA(volumeName, "\t ");

                ZeroMemory(mount, BUF_SIZE);
                GetVolumePathNamesForVolumeNameA(volumeName, mount, BUF_SIZE, NULL);
                StrTrimA(mount, "\t ");

                if (lstrlenA(mount) > 0) {
                    Local<Object> volume = Nan::New<Object>();

                    ZeroMemory(name, BUF_SIZE);
                    ZeroMemory(fsType, 16);
                    GetVolumeInformationA(volumeName, name, BUF_SIZE, NULL, NULL, NULL, fsType, 16);
                    StrTrimA(name, "\t ");
                    StrTrimA(fsType, "\t ");

                    ZeroMemory(&userFreeBytes, sizeof(userFreeBytes));
                    ZeroMemory(&totalBytes, sizeof(totalBytes));
                    ZeroMemory(&systemFreeBytes, sizeof(systemFreeBytes));
                    GetDiskFreeSpaceExA(volumeName, &userFreeBytes, &totalBytes, &systemFreeBytes);
                    char* description;
                    uint32_t type = GetDriveTypeA(mount);
                    switch (type) {
                        case 2:
                            description = "Removable drive"; break;
                        case 3:
                            description = "Fixed drive"; break;
                        case 4:
                            description = "Network drive"; break;
                        case 5:
                            description = "CD-ROM"; break;
                        case 6:
                            description = "RAM drive"; break;
                        default:
                            description = "Unknown drive type"; break;
                    }
                    
                    volume->Set(NanStr("volume"), NanStr(volumeName));
                    volume->Set(NanStr("name"), NanStr(name));
                    volume->Set(NanStr("mount"), NanStr(mount));
                    volume->Set(NanStr("fsType"), NanStr(fsType));
                    volume->Set(NanStr("description"), NanStr(description));
                    volume->Set(NanStr("freeSpace"), Nan::New<Number>(systemFreeBytes.QuadPart));
                    volume->Set(NanStr("totalSpace"), Nan::New<Number>(totalBytes.QuadPart));


                    
                    result->Set(Nan::New<Integer>(i++), volume);
                }
                
                if (!FindNextVolumeA(hVol, volumeName, BUF_SIZE)) {
                    FindVolumeClose(hVol);
                    break;
                }
            }
        }
        info.GetReturnValue().Set(result);
    }

#elif ADONE_OS_LINUX

    static NAN_METHOD(DiskCheck)
    {
        Nan::HandleScope scope;
        
        if (info.Length() < 1 || !info[0]->IsString()) {
            return THROW_BAD_ARGS;
        }

        String::Utf8Value path(info[0]->ToString());

        struct statvfs buf;
        int ret = statvfs(*path, &buf);
        if (ret != 0) {
            return Nan::ThrowError(Nan::ErrnoException(errno, "statvfs", "", *path));
        }

        Local<Object> result = Nan::New<Object>();
        result->Set(NanStr("available"), Nan::New<Number>(buf.f_bavail * buf.f_frsize));
        result->Set(NanStr("free"), Nan::New<Number>(buf.f_bfree * buf.f_frsize));
        result->Set(NanStr("total"), Nan::New<Number>(buf.f_blocks * buf.f_frsize));
        info.GetReturnValue().Set(result);
    }

    static NAN_METHOD(SysInfo)
    {
        Nan::HandleScope scope;
        struct sysinfo si;
        if (sysinfo(&si) != 0) {
            return Nan::ThrowError(Nan::ErrnoException(errno, "sysinfo"));
        }

        Local<Object> result = Nan::New<Object>();

        result->Set(NanStr("uptime"), Nan::New<Integer>(static_cast<uint32_t>(si.uptime)));

        Local<Array> loads = Nan::New<Array>();
        for (int i = 0; i < 3; ++i) {
            loads->Set(Nan::New<Integer>(i), Nan::New<Number>(si.loads[i]));
        }
        result->Set(NanStr("loads"), loads);

        result->Set(NanStr("totalram"), Nan::New<Number>(si.totalram));
        result->Set(NanStr("freeram"), Nan::New<Number>(si.freeram));
        result->Set(NanStr("sharedram"), Nan::New<Number>(si.sharedram));
        result->Set(NanStr("bufferram"), Nan::New<Number>(si.bufferram));
        result->Set(NanStr("totalswap"), Nan::New<Number>(si.totalswap));
        result->Set(NanStr("freeswap"), Nan::New<Number>(si.freeswap));
        result->Set(NanStr("procs"), Nan::New<Integer>(static_cast<uint32_t>(si.procs)));
        result->Set(NanStr("totalhigh"), Nan::New<Number>(si.totalhigh));
        result->Set(NanStr("freehigh"), Nan::New<Number>(si.freehigh));
        result->Set(NanStr("mem_unit"), Nan::New<Integer>(static_cast<uint32_t>(si.mem_unit)));

        info.GetReturnValue().Set(result);
    }

#elif ADONE_OS_FREEBSD

    static NAN_METHOD(SysCtl)
    {
        Nan::HandleScope scope;
        
        if (info.Length() < 1) {
            return THROW_BAD_ARGS;
        }
        
        String::Utf8Value keyNameStr(info[0]);
        const char* keyName = *keyNameStr;
        size_t size = 0;
        
        if (sysctlbyname(keyName, NULL, &size, NULL, 0) != 0) {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowError(Nan::ErrnoException(errno, "sysctlbyname"));
        }
        
        char* buff = (char*)calloc(size + 1, 1);
        
        if (sysctlbyname(keyName, (void*)buff, &size, NULL, 0) != 0) {
            info.GetReturnValue().SetUndefined();
            return Nan::ThrowError(Nan::ErrnoException(errno, "sysctlbyname"));
        }
        
        Local<String> result = NanStr(buff);
        
        info.GetReturnValue().Set(result);
    }

#endif
};

void init(Handle<Object> target)
{
    Nan::HandleScope scope;
#ifndef ADONE_OS_WINDOWS
    f_namemax_symbol.Reset(Nan::New<String>("f_namemax").ToLocalChecked());
    f_bsize_symbol.Reset(Nan::New<String>("f_bsize").ToLocalChecked());
    f_frsize_symbol.Reset(Nan::New<String>("f_frsize").ToLocalChecked());

    f_blocks_symbol.Reset(Nan::New<String>("f_blocks").ToLocalChecked());
    f_bavail_symbol.Reset(Nan::New<String>("f_bavail").ToLocalChecked());
    f_bfree_symbol.Reset(Nan::New<String>("f_bfree").ToLocalChecked());

    f_files_symbol.Reset(Nan::New<String>("f_files").ToLocalChecked());
    f_favail_symbol.Reset(Nan::New<String>("f_favail").ToLocalChecked());
    f_ffree_symbol.Reset(Nan::New<String>("f_ffree").ToLocalChecked());
#endif

    System::Initialize(target);
}
NODE_MODULE(system, init)