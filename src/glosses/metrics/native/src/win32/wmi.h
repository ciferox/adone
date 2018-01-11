#ifndef __ADONE_WMI_H_
#define __ADONE_WMI_H_

typedef struct _wmi_class_property
{
    char identifierType;
    void* pResult;
    wchar_t* propertyName;
    char* propertyKey;
} wmi_class_property_t;

struct _wmi_class_info;

typedef struct _wmi_class_info
{
    wchar_t className[32];
    void *pStruct;
    uint32_t structSize;
    wmi_class_property_t *pClassProperties;
} wmi_class_info_t;

void wmi_obtain(IDispatch* pWmiService, wmi_class_info_t* pClassInfo, const wchar_t* query, Local<Object>& result);
void wmi_obtain_list(IDispatch* pWmiService, wmi_class_info_t *pClassInfo, const wchar_t* query, Local<Array>& list);

#endif // __ADONE_WMI_H_