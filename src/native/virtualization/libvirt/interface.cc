// Copyright 2010, Camilo Aguilar. Cloudescape, LLC.

#include "hypervisor.h"
#include "interface.h"

namespace NLV {

Nan::Persistent<Function> Interface::constructor;
Nan::Persistent<FunctionTemplate> Interface::constructor_template;
void Interface::Initialize(Handle<Object> exports)
{
  Local<FunctionTemplate> t = Nan::New<FunctionTemplate>();
  t->SetClassName(Nan::New("Interface").ToLocalChecked());
  t->InstanceTemplate()->SetInternalFieldCount(1);

  Nan::SetPrototypeMethod(t, "start",         Start);
  Nan::SetPrototypeMethod(t, "stop",          Stop);
  Nan::SetPrototypeMethod(t, "getName",       GetName);
  Nan::SetPrototypeMethod(t, "getMacAddress", GetMacAddress);
  Nan::SetPrototypeMethod(t, "isActive",      IsActive);
  Nan::SetPrototypeMethod(t, "undefine",      Undefine);
  Nan::SetPrototypeMethod(t, "toXml",         ToXml);

  constructor_template.Reset(t);
  constructor.Reset(t->GetFunction());
  exports->Set(Nan::New("Interface").ToLocalChecked(), t->GetFunction());

  //Constants
  //virInterfaceXMLFlags
  NODE_DEFINE_CONSTANT(exports, VIR_INTERFACE_XML_INACTIVE);
}

Interface::Interface(virInterfacePtr handle) : NLVObject(handle) {}

NLV_WORKER_METHOD_NO_ARGS(Interface, Start)
NLV_WORKER_EXECUTE(Interface, Start)
{
  NLV_WORKER_ASSERT_INTERFACE();

  unsigned int flags = 0;
  int result = virInterfaceCreate(Handle(), flags);
  if (result == -1) {
    SET_ERROR_WITH_CONTEXT(virSaveLastError());
    return;
  }

  data_ = static_cast<bool>(result);
}

NLV_WORKER_METHOD_NO_ARGS(Interface, Stop)
NLV_WORKER_EXECUTE(Interface, Stop)
{
  NLV_WORKER_ASSERT_INTERFACE();

  unsigned int flags = 0;
  int result = virInterfaceDestroy(Handle(), flags);
  if (result == -1) {
    SET_ERROR_WITH_CONTEXT(virSaveLastError());
    return;
  }

  data_ = static_cast<bool>(result);
}

NLV_WORKER_METHOD_DEFINE(Interface)
NLV_WORKER_EXECUTE(Interface, Define)
{
  unsigned int flags = 0;
  lookupHandle_ = virInterfaceDefineXML(parent_->virHandle(), value_.c_str(), flags);
  if (lookupHandle_ == NULL) {
    SET_ERROR_WITH_CONTEXT(virSaveLastError());
    return;
  }
}

NLV_WORKER_METHOD_NO_ARGS(Interface, Undefine)
NLV_WORKER_EXECUTE(Interface, Undefine)
{
  NLV_WORKER_ASSERT_INTERFACE();
  int result = virInterfaceUndefine(Handle());
  if (result == -1) {
    SET_ERROR_WITH_CONTEXT(virSaveLastError());
    return;
  }

  data_ = true;
}

NLV_LOOKUP_BY_VALUE_EXECUTE_IMPL(Interface, LookupByName, virInterfaceLookupByName)
NAN_METHOD(Interface::LookupByName)
{
  Nan::HandleScope scope;
  if (info.Length() < 2 ||
      (!info[0]->IsString() && !info[1]->IsFunction())) {
    Nan::ThrowTypeError("You must specify a valid Interface name and callback.");
    return;
  }

  Local<Object> object = info.This();
  if (!Nan::New(Hypervisor::constructor_template)->HasInstance(object)) {
    Nan::ThrowTypeError("You must specify a Hypervisor instance");
    return;
  }

  Hypervisor *hv = Hypervisor::Unwrap(object);
  std::string name(*Nan::Utf8String(info[0]->ToString()));
  Nan::Callback *callback = new Nan::Callback(info[1].As<Function>());
  NLV::AsyncQueueWorker(new LookupByNameWorker(callback, hv, name), info.This());
  return;
}

NLV_LOOKUP_BY_VALUE_EXECUTE_IMPL(Interface, LookupByMacAddress, virInterfaceLookupByMACString)
NAN_METHOD(Interface::LookupByMacAddress)
{
  Nan::HandleScope scope;
  if (info.Length() < 2 ||
      (!info[0]->IsString() && !info[1]->IsFunction())) {
    Nan::ThrowTypeError("You must specify a valid Interface MAC address and callback.");
    return;
  }

  Local<Object> object = info.This();
  if (!Nan::New(Hypervisor::constructor_template)->HasInstance(object)) {
    Nan::ThrowTypeError("You must specify a Hypervisor instance");
    return;
  }

  Hypervisor *hv = Hypervisor::Unwrap(object);
  std::string uuid(*Nan::Utf8String(info[0]->ToString()));
  Nan::Callback *callback = new Nan::Callback(info[1].As<Function>());
  NLV::AsyncQueueWorker(new LookupByMacAddressWorker(callback, hv, uuid), info.This());
  return;
}

NLV_WORKER_METHOD_NO_ARGS(Interface, GetName)
NLV_WORKER_EXECUTE(Interface, GetName)
{
  NLV_WORKER_ASSERT_INTERFACE();
  const char *result = virInterfaceGetName(Handle());
  if (result == NULL) {
    SET_ERROR_WITH_CONTEXT(virSaveLastError());
    return;
  }

  data_ = result;
}

NLV_WORKER_METHOD_NO_ARGS(Interface, GetMacAddress)
NLV_WORKER_EXECUTE(Interface, GetMacAddress)
{
  NLV_WORKER_ASSERT_INTERFACE();
  const char *result = virInterfaceGetMACString(Handle());
  if (result == NULL) {
    SET_ERROR_WITH_CONTEXT(virSaveLastError());
    return;
  }

  data_ = result;
}

NLV_WORKER_METHOD_NO_ARGS(Interface, IsActive)
NLV_WORKER_EXECUTE(Interface, IsActive)
{
  NLV_WORKER_ASSERT_INTERFACE();
  int result = virInterfaceIsActive(Handle());
  if (result == -1) {
    SET_ERROR_WITH_CONTEXT(virSaveLastError());
    return;
  }

  data_ = static_cast<bool>(result);
}

NLV_WORKER_METHOD_NO_ARGS(Interface, ToXml)
NLV_WORKER_EXECUTE(Interface, ToXml)
{
  NLV_WORKER_ASSERT_INTERFACE();
  unsigned int flags = 0;
  char *result = virInterfaceGetXMLDesc(Handle(), flags);
  if (result == NULL) {
    SET_ERROR_WITH_CONTEXT(virSaveLastError());
    return;
  }

  data_ = strdup(result);
  free(result);
}

}   // namespace NLV
