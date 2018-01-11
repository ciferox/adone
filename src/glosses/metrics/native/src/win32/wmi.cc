#include <adone.h>
#include "wmi.h"

#include <wbemdisp.h>
#include "win32/wmi.h"

#pragma comment(lib, "wbemuuid")

/* Maximum number of arguments for a member */
#define DH_MAX_ARGS 25

/* Maximum length of a member string */
#define DH_MAX_MEMBER 512



/*
* Number of 100 nanosecond units from 1/1/1601 to 1/1/1970
*/
#define EPOCH_BIAS  116444736000000000i64

#define _MAX__TIME32_T     0x7fffd27f           /* number of seconds from
00:00:00, 01/01/1970 UTC to
23:59:59, 01/18/2038 UTC */

/*
* Union to facilitate converting from FILETIME to unsigned __int64
*/
typedef union {
    unsigned __int64 ft_scalar;
    FILETIME ft_struct;
} FT;

__time64_t CIMDateToUnix(LPCWSTR cimdatetime, const bool blocaltime = false)
{
    ISWbemDateTime *pSWbemDateTime = NULL;
    HRESULT hr = CoCreateInstance(CLSID_SWbemDateTime, NULL, CLSCTX_INPROC_SERVER, IID_PPV_ARGS(&pSWbemDateTime));
    FT ft;
    __time64_t unixTime = 0;
    if (SUCCEEDED(hr)) {
        BSTR timebstr = SysAllocString(cimdatetime);
        if (timebstr) {
            // Set time value.
            hr = pSWbemDateTime->put_Value(timebstr);
            if (SUCCEEDED(hr)) {
                BSTR bstrFileTime;
                // Get a FILETIME.
                hr = pSWbemDateTime->GetFileTime(blocaltime ? VARIANT_TRUE : VARIANT_FALSE, &bstrFileTime);
                if (SUCCEEDED(hr)) {
                    ULARGE_INTEGER tempFT;
                    // 64-bit value representing the number of 100-nanosecond intervals since January 1, 1601 (UTC).
                    tempFT.QuadPart = _wtoi64(bstrFileTime);
                    // FILETIME is a structure of two 32-bit integers.
                    ft.ft_struct.dwLowDateTime = tempFT.LowPart;
                    ft.ft_struct.dwHighDateTime = tempFT.HighPart;
#if ADONE_ARCH_AMD64
                    unixTime = (__time64_t)((ft.ft_scalar - EPOCH_BIAS) / 10000i64);
#else
                    unixTime = (__time64_t)fn__aulldiv(nt_time.ft_scalar - EPOCH_BIAS, 10000i64);
#endif
                    if (unixTime > (__time64_t)(_MAX__TIME32_T) * 1000L) {
                        unixTime = (__time64_t)-1;
                    }
                    SysFreeString(bstrFileTime);
                }
            }
            SysFreeString(timebstr);
        }
        pSWbemDateTime->Release();
    }
    return unixTime;
}

HRESULT __cdecl wmi_extract_arg(VARIANT* pvArg, char vType, BOOL* pbFreeArg, va_list* marker)
{
    HRESULT hr = NOERROR;

    *pbFreeArg = FALSE;

    switch (vType) {
        case 'w':
            V_VT(pvArg) = VT_UI2;
            V_UI2(pvArg) = va_arg(*marker, WORD);
            break;
        case 'd':
            V_VT(pvArg) = VT_I4;
            V_I4(pvArg) = va_arg(*marker, LONG);
            break;
        case 'u':
            V_VT(pvArg) = VT_UI4;
            V_UI4(pvArg) = va_arg(*marker, ULONG);
            break;
        case 'q':
            V_VT(pvArg) = VT_UI8;
            V_UI8(pvArg) = va_arg(*marker, ULONG64);
            break;
        case 'e':
            V_VT(pvArg) = VT_R8;
            V_R8(pvArg) = va_arg(*marker, DOUBLE);
            break;
        case 'b':
            V_VT(pvArg) = VT_BOOL;
            V_BOOL(pvArg) = ( va_arg(*marker, BOOL) ? VARIANT_TRUE : VARIANT_FALSE );
            break;
        case 'm':
            V_VT(pvArg) = VT_ERROR;
            V_ERROR(pvArg) = DISP_E_PARAMNOTFOUND;
            break;
        case 'D':
        case 'S':
            {
                LPOLESTR szTemp = va_arg(*marker, LPOLESTR);

                V_VT(pvArg) = VT_BSTR;
                V_BSTR(pvArg) = SysAllocString(szTemp);

                if (V_BSTR(pvArg) == NULL && szTemp != NULL) hr = E_OUTOFMEMORY;

                *pbFreeArg = TRUE;
                break;
            }
        case 'o':
            V_VT(pvArg) = VT_DISPATCH;
            V_DISPATCH(pvArg) = va_arg(*marker, IDispatch *);
            break;
        case 'p':
#ifndef ADONE_ARCH_AMD64
            V_VT(pvArg) = VT_I4;
            V_I4(pvArg) = (LONG) va_arg(*marker, LPVOID);
#else
            V_VT(pvArg) = VT_I8;
            V_I8(pvArg) = (LONGLONG) va_arg(*marker, LPVOID);
#endif
            break;
        default:
            hr = E_INVALIDARG;
            break;
    }

    return hr;
}

HRESULT __cdecl wmi_get_value(char vType, void* pResult, IDispatch* pDisp, LPCOLESTR szMember, ...)
{
    HRESULT hr = NOERROR;
    va_list marker;
    VARIANT vtResult;
    VARTYPE returnType;
    wchar_t szCopy[DH_MAX_MEMBER];
    LPWSTR szTemp = szCopy;
    SIZE_T cchDest = ARRAYSIZE(szCopy);
    VARIANT vtArgs[DH_MAX_ARGS];
    BOOL bFreeList[DH_MAX_ARGS];
    UINT cArgs, iArg = DH_MAX_ARGS;
    BOOL bInArguments = FALSE;
    DISPPARAMS dp  = { 0 };
    DISPID dispID;
    UINT uiArgErr;

    va_start(marker, szMember);

    if (pResult == NULL || pDisp == NULL || szMember == NULL) {
        return E_INVALIDARG;
    }

    switch (vType) {
        case 'w': returnType = VT_UI2; break;
        case 'd': returnType = VT_I4; break;
        case 'u': returnType = VT_UI4; break;
        case 'q': returnType = VT_UI8; break;
        case 'e': returnType = VT_R8; break;
        case 'b': returnType = VT_BOOL; break;
        case 'D':
        case 'S': returnType = VT_BSTR; break;
        case 'o': returnType = VT_DISPATCH; break;
#ifndef ADONE_ARCH_AMD64
        case 'p': returnType = VT_I4; break;
#else
        case 'p': returnType = VT_I8; break;
#endif
        default:
            return E_INVALIDARG;
    }

    do {
        if (cchDest-- == 0) {
            return E_INVALIDARG;
        }
    } while (*szTemp++ = *szMember++);

    pDisp->AddRef();

    for (szTemp = szCopy; *szTemp; ++szTemp) {
        if (!bInArguments && (*szTemp == L'(' || *szTemp == L' ' || *szTemp == L'=') ) {
            bInArguments = TRUE;

            *szTemp = L'\0';
        }
        else if  (*szTemp == L'%') {
            if (!bInArguments) {
                bInArguments = TRUE;
                *szTemp = L'\0';
            }

            if (--iArg == -1) {
                hr = E_INVALIDARG;
                break;
            }

            ++szTemp;

            hr = wmi_extract_arg(&vtArgs[iArg], (char)*szTemp, &bFreeList[iArg], &marker);

            if (FAILED(hr)) {
                break;
            }
        }
    }

    if (SUCCEEDED(hr)) {
        cArgs = DH_MAX_ARGS - iArg;
        szTemp = szCopy;
        hr = pDisp->GetIDsOfNames(IID_NULL, (LPOLESTR*)&szTemp, 1, LOCALE_USER_DEFAULT, &dispID);

        if (SUCCEEDED(hr)) {
            VariantInit(&vtResult);

            dp.cArgs  = cArgs;
            dp.rgvarg = &vtArgs[DH_MAX_ARGS - cArgs];

            hr = pDisp->Invoke(dispID, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_PROPERTYGET|DISPATCH_METHOD, &dp, &vtResult, NULL, &uiArgErr);
        }

        for (iArg = DH_MAX_ARGS - cArgs; iArg < DH_MAX_ARGS; ++iArg) {
            if (bFreeList[iArg]) {
                VariantClear(&vtArgs[iArg]);
            }
        }

        if (SUCCEEDED(hr) && vtResult.vt != returnType && returnType != VT_EMPTY) {
            hr = VariantChangeType(&vtResult, &vtResult, 16 , returnType);
            if (FAILED(hr)) {
                VariantClear(&vtResult);
            }
        }
    }
    else {
        for (++iArg; iArg < DH_MAX_ARGS; ++iArg) {
            if (bFreeList[iArg]) {
                VariantClear(&vtArgs[iArg]);
            }
        }
    }

    pDisp->Release();

    if (FAILED(hr)) {
        return hr;
    }

    switch (vType) {
        case 'w':
            *((WORD*)pResult) = V_UI2(&vtResult);
            break;
        case 'd':
            *((LONG*) pResult) = V_I4(&vtResult);
            break;
        case 'u':
            *((ULONG*)pResult) = V_UI4(&vtResult);
            break;
        case 'q':
            *((ULONG64*)pResult) = V_UI8(&vtResult);
            break;
        case 'e':
            *((DOUBLE*)pResult) = V_R8(&vtResult);
            break;
        case 'b':
            *((BOOL*)pResult) = V_BOOL(&vtResult);
            break;
        case 'S':
            *((LPWSTR*)pResult) = V_BSTR(&vtResult);
            break;
        case 'D':
            *((ULONG64*)pResult) = CIMDateToUnix(V_BSTR(&vtResult));
            break;
        case 'o':
            *((IDispatch**)pResult) = V_DISPATCH(&vtResult);
            
            if (V_DISPATCH(&vtResult) == NULL) hr = E_NOINTERFACE;
            break;
        case 'p':
#ifndef ADONE_ARCH_AMD64
            *((LPVOID *)pResult) = (LPVOID) V_I4(&vtResult);
#else
            *((LPVOID *)pResult) = (LPVOID) V_I8(&vtResult);
#endif
            break;
    }

    va_end(marker);

    return hr;
}

HRESULT wmi_enum_begin(IEnumVARIANT** ppEnum, IDispatch* pDisp)
{
    HRESULT hr;
    DISPPARAMS dp = {0};
    VARIANT vtResult;

    if (pDisp == NULL) {
        return E_INVALIDARG;
    }

    hr = pDisp->Invoke(DISPID_NEWENUM, IID_NULL, LOCALE_USER_DEFAULT, DISPATCH_METHOD | DISPATCH_PROPERTYGET, &dp, &vtResult, NULL, NULL);

    if (FAILED(hr)) {
        return hr;
    }

    if (vtResult.vt == VT_DISPATCH) {
        hr = vtResult.pdispVal->QueryInterface(IID_IEnumVARIANT, (void **) ppEnum);
    }
    else if (vtResult.vt == VT_UNKNOWN) {
        hr = vtResult.punkVal->QueryInterface(IID_IEnumVARIANT, (void **) ppEnum);
    }
    else {
        hr = E_NOINTERFACE;
    }

    VariantClear(&vtResult);

    return hr;
}

HRESULT wmi_enum_next(IEnumVARIANT* pEnum, IDispatch** ppDisp)
{
    VARIANT vtResult;
    HRESULT hr;

    if (pEnum == NULL) {
        return E_INVALIDARG;
    }

    hr = pEnum->Next(1, &vtResult, NULL);

    if (hr == S_OK) {
        if (vtResult.vt == VT_DISPATCH) {
            *ppDisp = vtResult.pdispVal;
        }
        else {
            hr = VariantChangeType(&vtResult, &vtResult, 0, VT_DISPATCH);
            if (SUCCEEDED(hr)) {
                *ppDisp = vtResult.pdispVal;
            }
            else {
                VariantClear(&vtResult);
            }
        }
    }

    return hr;
}

IDispatch* wmi_get_service(const wchar_t* name)
{
    IDispatch* pWmiService = NULL;
    if (FAILED(CoGetObject(name, NULL, IID_IDispatch, (void**)&pWmiService))) {
        return NULL;
    }
    return pWmiService;
}

char* utf16_to_utf8(const wchar_t* wStr, int* pSize = NULL) {
    int size = WideCharToMultiByte(CP_UTF8, 0, wStr, -1, NULL, 0, NULL, NULL);
    char* str = NULL;
    if (size) {
        str = (char*)calloc(size, 1);
        size = WideCharToMultiByte(CP_UTF8, 0, wStr, -1, str, size, NULL, NULL);
        if (size == 0) {
            free(str);
            str = NULL;
        } else if (pSize != NULL) {
            *pSize = size - 1;
        }
    }
    return str;
}

IEnumVARIANT* wmi_get_service_enumerator(IDispatch* pWmiService, wmi_class_info_t *pClassInfo, const wchar_t* query)
{
    wchar_t selectBuffer[128];
    IDispatch* pServiceLocator = NULL;
    IEnumVARIANT* pServiceEnumerator = NULL;

    lstrcpyW(selectBuffer, L"SELECT * FROM ");
    lstrcatW(selectBuffer, pClassInfo->className);
    if (query != NULL) {
        lstrcatW(selectBuffer, query);
    }

    if (SUCCEEDED(wmi_get_value('o', &pServiceLocator, pWmiService, L"ExecQuery(%S)", selectBuffer))) {
        if (FAILED(wmi_enum_begin(&pServiceEnumerator, pServiceLocator))) {
            pServiceEnumerator = NULL;
        }
    }

    if (pServiceLocator != NULL) {
        pServiceLocator->Release();
    }

    return pServiceEnumerator;
}

void wmi_collect_values(IDispatch* pServiceItem, wmi_class_info_t* pClassInfo, Local<Object>& result)
{
    wmi_class_property_t* pClassPropInfo;

    __stosb((uint8_t*)pClassInfo->pStruct, 0, pClassInfo->structSize);

    for (pClassPropInfo = pClassInfo->pClassProperties; pClassPropInfo->identifierType != 0; ++pClassPropInfo) {
        wmi_get_value(pClassPropInfo->identifierType, pClassPropInfo->pResult, pServiceItem, pClassPropInfo->propertyName);

        switch (pClassPropInfo->identifierType) {
            case 'w': {
                result->Set(NanStr(pClassPropInfo->propertyKey), Nan::New<Integer>(*(static_cast<uint32_t*>(pClassPropInfo->pResult))));
                break;
            }
            case 'u': {
                result->Set(NanStr(pClassPropInfo->propertyKey), Nan::New<Number>(*(static_cast<long*>(pClassPropInfo->pResult))));
                break;
            }
            case 'D':
            case 'q': {
                result->Set(NanStr(pClassPropInfo->propertyKey), Nan::New<Number>(*(static_cast<uint64_t*>(pClassPropInfo->pResult))));
                break;
            }
            case 'S': {
                const wchar_t* const wStr = *(static_cast<wchar_t**>(pClassPropInfo->pResult));
                if (wStr == NULL) {
                    result->Set(NanStr(pClassPropInfo->propertyKey), Unmaybe(Nan::New<String>("", 0)));
                }
                else {
                    int size = 0;
                    char* str = utf16_to_utf8(wStr, &size);
                    result->Set(NanStr(pClassPropInfo->propertyKey), Unmaybe(Nan::New<String>(str, size)));
                    free((void*)str);
                    SysFreeString(*(BSTR*)pClassPropInfo->pResult);
                }
                break;
            }
        }
    }
}

void wmi_obtain(IDispatch* pWmiService, wmi_class_info_t* pClassInfo, const wchar_t* query, Local<Object>& result)
{
    IEnumVARIANT* pServiceEnumerator = wmi_get_service_enumerator(pWmiService, pClassInfo, query);
    if (pServiceEnumerator != NULL) {
        IDispatch* pServiceItem = NULL;
        if (wmi_enum_next(pServiceEnumerator, &pServiceItem) == NOERROR) {
            wmi_collect_values(pServiceItem, pClassInfo, result);

            pServiceItem->Release();
            pServiceItem = NULL;

        }
        if (pServiceItem != NULL) {
            pServiceItem->Release();
        }
        pServiceEnumerator->Release();
    }
}
 
void wmi_obtain_list(IDispatch* pWmiService, wmi_class_info_t *pClassInfo, const wchar_t* query, Local<Array>& list)
{
    IEnumVARIANT* pServiceEnumerator = wmi_get_service_enumerator(pWmiService, pClassInfo, query);
    if (pServiceEnumerator != NULL) {
        int i = 0;
        IDispatch* pServiceItem = NULL;
        while (wmi_enum_next(pServiceEnumerator, &pServiceItem) == NOERROR) {
            Local<Object> result = Nan::New<Object>();
            wmi_collect_values(pServiceItem, pClassInfo, result);
            list->Set(Nan::New<Integer>(i++), result);

            pServiceItem->Release();
            pServiceItem = NULL;
                
        }
        if (pServiceItem != NULL) {
            pServiceItem->Release();
        }
        pServiceEnumerator->Release();
    }
}