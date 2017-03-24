#ifndef __ADONE_H_
#define __ADONE_H_

#undef ADONE_OS_LINUX
#undef ADONE_OS_WINDOWS
#undef ADONE_OS_MACOS
#undef ADONE_OS_FREEBSD
#undef ADONE_OS_SOLARIS

#undef ADONE_ARCH_IA32
#undef ADONE_ARCH_AMD64

// os detection
#if defined(linux) || defined(__linux) || defined(__linux__) || defined(__TOS_LINUX__)
#define ADONE_OS_LINUX 1
#elif defined(_WIN32) || defined(__WIN64)
#define ADONE_OS_WINDOWS 1
#elif defined(__FreeBSD__) || defined(__FreeBSD__kernel__)
#define ADONE_OS_FREEBSD 1
#elif defined(__APPLE__) || (__TOC_MACOS__)
#define ADONE_OS_MACOS 1
#elif defined(sun) || defined(__sun)
#define ADONE_OS_SOLARIS 1
#endif

// arch detection
#if defined(i386) || defined(__i386) || defined(__i386__) || defined(_M_IX86)
#define ADONE_ARCH_IA32 1
#elif defined(__x86_64__) || defined(_M_X64)
#define ADONE_ARCH_AMD64 1
#endif

#include <v8.h>
#include <node.h>
#include <node_version.h>
#include <node_buffer.h>
#include <node_object_wrap.h>
#include <stdlib.h>
#include <fcntl.h>
#include <errno.h>
#include <sys/types.h>
#include <string.h>
#include <wchar.h>
#include <stdio.h>
#include <nan.h>

using namespace v8;
using namespace node;

// Unmaybe overloading to conviniently convert from Local/MaybeLocal/Maybe to Local/plain value
template <class T>
inline Local<T> Unmaybe(Local<T> h) {
    return h;
}
template <class T>
inline Local<T> Unmaybe(Nan::MaybeLocal<T> h) {
    assert(!h.IsEmpty());
    return h.ToLocalChecked();
}
template <class T>
inline T Unmaybe(Nan::Maybe<T> h) {
    assert(h.IsJust());
    return h.FromJust();
}

#define NanStr(x) (Unmaybe(Nan::New<String>(x)))

#define THROW_BAD_ARGS Nan::ThrowTypeError("Bad argument")

#if ADONE_OS_WINDOWS
#pragma warning( disable : 4244 )
#include <windows.h>
#else
#include <unistd.h>
#endif // ADONE_OS_WINDOWS

#include <cstdio>
#include <cstdlib>
#include <cstring>
#include <wchar.h>
#include <v8.h>
#include <node.h>
#include <node_version.h>
#include <node_buffer.h>
#include <node_object_wrap.h>
#include <nan.h>

#endif // __ADONE_H_
