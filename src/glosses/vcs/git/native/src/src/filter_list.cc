// This is a generated file, modify: generate/templates/templates/class_content.cc

#include <nan.h>
#include <string.h>

extern "C" {
  #include <git2.h>
 }

#include "../include/nodegit.h"
#include "../include/lock_master.h"
#include "../include/functions/copy.h"
#include "../include/filter_list.h"
#include "nodegit_wrapper.cc"
#include "../include/async_libgit2_queue_worker.h"

  #include "../include/buf.h"
  #include "../include/blob.h"
  #include "../include/repository.h"
 
#include <iostream>

using namespace std;
using namespace v8;
using namespace node;

  GitFilterList::~GitFilterList() {
    // this will cause an error if you have a non-self-freeing object that also needs
    // to save values. Since the object that will eventually free the object has no
    // way of knowing to free these values.
                              }

  void GitFilterList::InitializeComponent(v8::Local<v8::Object> target) {
    Nan::HandleScope scope;

    v8::Local<FunctionTemplate> tpl = Nan::New<FunctionTemplate>(JSNewFunction);

    tpl->InstanceTemplate()->SetInternalFieldCount(1);
    tpl->SetClassName(Nan::New("FilterList").ToLocalChecked());

          Nan::SetPrototypeMethod(tpl, "applyToBlob", ApplyToBlob);
            Nan::SetPrototypeMethod(tpl, "applyToData", ApplyToData);
            Nan::SetPrototypeMethod(tpl, "applyToFile", ApplyToFile);
            Nan::SetPrototypeMethod(tpl, "free", Free);
             Nan::SetMethod(tpl, "load", Load);
    
    InitializeTemplate(tpl);

    v8::Local<Function> _constructor_template = Nan::GetFunction(tpl).ToLocalChecked();
    constructor_template.Reset(_constructor_template);
    Nan::Set(target, Nan::New("FilterList").ToLocalChecked(), _constructor_template);
  }

 
/*
    * @param Blob blob
    * @param Buf callback
   */
NAN_METHOD(GitFilterList::ApplyToBlob) {

  if (info.Length() == 0 || !info[0]->IsObject()) {
    return Nan::ThrowError("Blob blob is required.");
  }

  if (info.Length() == 1 || !info[1]->IsFunction()) {
    return Nan::ThrowError("Callback is required and must be a Function.");
  }

  ApplyToBlobBaton* baton = new ApplyToBlobBaton;

  baton->error_code = GIT_OK;
  baton->error = NULL;

      baton->out = (git_buf *)malloc(sizeof(git_buf ));  
        baton->out->ptr = NULL;
        baton->out->size = baton->out->asize = 0;
  baton->filters = Nan::ObjectWrap::Unwrap<GitFilterList>(info.This())->GetValue();
// start convert_from_v8 block
  git_blob * from_blob = NULL;
from_blob = Nan::ObjectWrap::Unwrap<GitBlob>(info[0]->ToObject())->GetValue();
// end convert_from_v8 block
  baton->blob = from_blob;

  Nan::Callback *callback = new Nan::Callback(v8::Local<Function>::Cast(info[1]));
  ApplyToBlobWorker *worker = new ApplyToBlobWorker(baton, callback);
  worker->SaveToPersistent("filters", info.This());
  if (!info[0]->IsUndefined() && !info[0]->IsNull())
    worker->SaveToPersistent("blob", info[0]->ToObject());

  AsyncLibgit2QueueWorker(worker);
  return;
}

void GitFilterList::ApplyToBlobWorker::Execute() {
  giterr_clear();

  {
    LockMaster lockMaster(/*asyncAction: */true        ,baton->out
        ,baton->filters
        ,baton->blob
);

  int result = git_filter_list_apply_to_blob(
baton->out,baton->filters,baton->blob    );

    baton->error_code = result;

    if (result != GIT_OK && giterr_last() != NULL) {
      baton->error = git_error_dup(giterr_last());
    }

  }
}

void GitFilterList::ApplyToBlobWorker::HandleOKCallback() {
  if (baton->error_code == GIT_OK) {
    v8::Local<v8::Value> to;
// start convert_to_v8 block
   if (baton->out) {
    to = Nan::New<String>(baton->out->ptr, baton->out->size).ToLocalChecked();
  }
  else {
    to = Nan::Null();
  }
  // end convert_to_v8 block
    v8::Local<v8::Value> result = to;
    v8::Local<v8::Value> argv[2] = {
      Nan::Null(),
      result
    };
    callback->Call(2, argv);
  } else {
    if (baton->error) {
      v8::Local<v8::Object> err;
      if (baton->error->message) {
        err = Nan::Error(baton->error->message)->ToObject();
      } else {
        err = Nan::Error("Method applyToBlob has thrown an error.")->ToObject();
      }
      err->Set(Nan::New("errno").ToLocalChecked(), Nan::New(baton->error_code));
      err->Set(Nan::New("errorFunction").ToLocalChecked(), Nan::New("FilterList.applyToBlob").ToLocalChecked());
      v8::Local<v8::Value> argv[1] = {
        err
      };
      callback->Call(1, argv);
      if (baton->error->message)
        free((void *)baton->error->message);
      free((void *)baton->error);
    } else if (baton->error_code < 0) {
      std::queue< v8::Local<v8::Value> > workerArguments;
      workerArguments.push(GetFromPersistent("blob"));
      bool callbackFired = false;
      while(!workerArguments.empty()) {
        v8::Local<v8::Value> node = workerArguments.front();
        workerArguments.pop();

        if (
          !node->IsObject()
          || node->IsArray()
          || node->IsBooleanObject()
          || node->IsDate()
          || node->IsFunction()
          || node->IsNumberObject()
          || node->IsRegExp()
          || node->IsStringObject()
        ) {
          continue;
        }

        v8::Local<v8::Object> nodeObj = node->ToObject();
        v8::Local<v8::Value> checkValue = GetPrivate(nodeObj, Nan::New("NodeGitPromiseError").ToLocalChecked());

        if (!checkValue.IsEmpty() && !checkValue->IsNull() && !checkValue->IsUndefined()) {
          v8::Local<v8::Value> argv[1] = {
            checkValue->ToObject()
          };
          callback->Call(1, argv);
          callbackFired = true;
          break;
        }

        v8::Local<v8::Array> properties = nodeObj->GetPropertyNames();
        for (unsigned int propIndex = 0; propIndex < properties->Length(); ++propIndex) {
          v8::Local<v8::String> propName = properties->Get(propIndex)->ToString();
          v8::Local<v8::Value> nodeToQueue = nodeObj->Get(propName);
          if (!nodeToQueue->IsUndefined()) {
            workerArguments.push(nodeToQueue);
          }
        }
      }

      if (!callbackFired) {
        v8::Local<v8::Object> err = Nan::Error("Method applyToBlob has thrown an error.")->ToObject();
        err->Set(Nan::New("errno").ToLocalChecked(), Nan::New(baton->error_code));
        err->Set(Nan::New("errorFunction").ToLocalChecked(), Nan::New("FilterList.applyToBlob").ToLocalChecked());
        v8::Local<v8::Value> argv[1] = {
          err
        };
        callback->Call(1, argv);
      }
    } else {
      callback->Call(0, NULL);
    }

  }

        git_buf_free(baton->out);
        free((void *)baton->out);

  delete baton;
}

  
/*
    * @param Buf in
    * @param Buf callback
   */
NAN_METHOD(GitFilterList::ApplyToData) {

  if (info.Length() == 0 || !info[0]->IsObject()) {
    return Nan::ThrowError("Buf in is required.");
  }

  if (info.Length() == 1 || !info[1]->IsFunction()) {
    return Nan::ThrowError("Callback is required and must be a Function.");
  }

  ApplyToDataBaton* baton = new ApplyToDataBaton;

  baton->error_code = GIT_OK;
  baton->error = NULL;

      baton->out = (git_buf *)malloc(sizeof(git_buf ));  
        baton->out->ptr = NULL;
        baton->out->size = baton->out->asize = 0;
  baton->filters = Nan::ObjectWrap::Unwrap<GitFilterList>(info.This())->GetValue();
// start convert_from_v8 block
  git_buf * from_in = NULL;

  from_in = GitBufConverter::Convert(info[0]);
// end convert_from_v8 block
  baton->in = from_in;

  Nan::Callback *callback = new Nan::Callback(v8::Local<Function>::Cast(info[1]));
  ApplyToDataWorker *worker = new ApplyToDataWorker(baton, callback);
  worker->SaveToPersistent("filters", info.This());
  if (!info[0]->IsUndefined() && !info[0]->IsNull())
    worker->SaveToPersistent("in", info[0]->ToObject());

  AsyncLibgit2QueueWorker(worker);
  return;
}

void GitFilterList::ApplyToDataWorker::Execute() {
  giterr_clear();

  {
    LockMaster lockMaster(/*asyncAction: */true        ,baton->out
        ,baton->filters
        ,baton->in
);

  int result = git_filter_list_apply_to_data(
baton->out,baton->filters,baton->in    );

    baton->error_code = result;

    if (result != GIT_OK && giterr_last() != NULL) {
      baton->error = git_error_dup(giterr_last());
    }

  }
}

void GitFilterList::ApplyToDataWorker::HandleOKCallback() {
  if (baton->error_code == GIT_OK) {
    v8::Local<v8::Value> to;
// start convert_to_v8 block
   if (baton->out) {
    to = Nan::New<String>(baton->out->ptr, baton->out->size).ToLocalChecked();
  }
  else {
    to = Nan::Null();
  }
  // end convert_to_v8 block
    v8::Local<v8::Value> result = to;
    v8::Local<v8::Value> argv[2] = {
      Nan::Null(),
      result
    };
    callback->Call(2, argv);
  } else {
    if (baton->error) {
      v8::Local<v8::Object> err;
      if (baton->error->message) {
        err = Nan::Error(baton->error->message)->ToObject();
      } else {
        err = Nan::Error("Method applyToData has thrown an error.")->ToObject();
      }
      err->Set(Nan::New("errno").ToLocalChecked(), Nan::New(baton->error_code));
      err->Set(Nan::New("errorFunction").ToLocalChecked(), Nan::New("FilterList.applyToData").ToLocalChecked());
      v8::Local<v8::Value> argv[1] = {
        err
      };
      callback->Call(1, argv);
      if (baton->error->message)
        free((void *)baton->error->message);
      free((void *)baton->error);
    } else if (baton->error_code < 0) {
      std::queue< v8::Local<v8::Value> > workerArguments;
      workerArguments.push(GetFromPersistent("in"));
      bool callbackFired = false;
      while(!workerArguments.empty()) {
        v8::Local<v8::Value> node = workerArguments.front();
        workerArguments.pop();

        if (
          !node->IsObject()
          || node->IsArray()
          || node->IsBooleanObject()
          || node->IsDate()
          || node->IsFunction()
          || node->IsNumberObject()
          || node->IsRegExp()
          || node->IsStringObject()
        ) {
          continue;
        }

        v8::Local<v8::Object> nodeObj = node->ToObject();
        v8::Local<v8::Value> checkValue = GetPrivate(nodeObj, Nan::New("NodeGitPromiseError").ToLocalChecked());

        if (!checkValue.IsEmpty() && !checkValue->IsNull() && !checkValue->IsUndefined()) {
          v8::Local<v8::Value> argv[1] = {
            checkValue->ToObject()
          };
          callback->Call(1, argv);
          callbackFired = true;
          break;
        }

        v8::Local<v8::Array> properties = nodeObj->GetPropertyNames();
        for (unsigned int propIndex = 0; propIndex < properties->Length(); ++propIndex) {
          v8::Local<v8::String> propName = properties->Get(propIndex)->ToString();
          v8::Local<v8::Value> nodeToQueue = nodeObj->Get(propName);
          if (!nodeToQueue->IsUndefined()) {
            workerArguments.push(nodeToQueue);
          }
        }
      }

      if (!callbackFired) {
        v8::Local<v8::Object> err = Nan::Error("Method applyToData has thrown an error.")->ToObject();
        err->Set(Nan::New("errno").ToLocalChecked(), Nan::New(baton->error_code));
        err->Set(Nan::New("errorFunction").ToLocalChecked(), Nan::New("FilterList.applyToData").ToLocalChecked());
        v8::Local<v8::Value> argv[1] = {
          err
        };
        callback->Call(1, argv);
      }
    } else {
      callback->Call(0, NULL);
    }

  }

        git_buf_free(baton->out);
        free((void *)baton->out);
        git_buf_free(baton->in);
        free((void *)baton->in);

  delete baton;
}

  
/*
    * @param Repository repo
   * @param String path
    * @param Buf callback
   */
NAN_METHOD(GitFilterList::ApplyToFile) {

  if (info.Length() == 0 || !info[0]->IsObject()) {
    return Nan::ThrowError("Repository repo is required.");
  }

  if (info.Length() == 1 || !info[1]->IsString()) {
    return Nan::ThrowError("String path is required.");
  }

  if (info.Length() == 2 || !info[2]->IsFunction()) {
    return Nan::ThrowError("Callback is required and must be a Function.");
  }

  ApplyToFileBaton* baton = new ApplyToFileBaton;

  baton->error_code = GIT_OK;
  baton->error = NULL;

      baton->out = (git_buf *)malloc(sizeof(git_buf ));  
        baton->out->ptr = NULL;
        baton->out->size = baton->out->asize = 0;
  baton->filters = Nan::ObjectWrap::Unwrap<GitFilterList>(info.This())->GetValue();
// start convert_from_v8 block
  git_repository * from_repo = NULL;
from_repo = Nan::ObjectWrap::Unwrap<GitRepository>(info[0]->ToObject())->GetValue();
// end convert_from_v8 block
  baton->repo = from_repo;
// start convert_from_v8 block
  const char * from_path = NULL;

  String::Utf8Value path(info[1]->ToString());
  // malloc with one extra byte so we can add the terminating null character C-strings expect:
  from_path = (const char *) malloc(path.length() + 1);
  // copy the characters from the nodejs string into our C-string (used instead of strdup or strcpy because nulls in
  // the middle of strings are valid coming from nodejs):
  memcpy((void *)from_path, *path, path.length());
  // ensure the final byte of our new string is null, extra casts added to ensure compatibility with various C types
  // used in the nodejs binding generation:
  memset((void *)(((char *)from_path) + path.length()), 0, 1);
// end convert_from_v8 block
  baton->path = from_path;

  Nan::Callback *callback = new Nan::Callback(v8::Local<Function>::Cast(info[2]));
  ApplyToFileWorker *worker = new ApplyToFileWorker(baton, callback);
  worker->SaveToPersistent("filters", info.This());
  if (!info[0]->IsUndefined() && !info[0]->IsNull())
    worker->SaveToPersistent("repo", info[0]->ToObject());
  if (!info[1]->IsUndefined() && !info[1]->IsNull())
    worker->SaveToPersistent("path", info[1]->ToObject());

  AsyncLibgit2QueueWorker(worker);
  return;
}

void GitFilterList::ApplyToFileWorker::Execute() {
  giterr_clear();

  {
    LockMaster lockMaster(/*asyncAction: */true        ,baton->out
        ,baton->filters
        ,baton->repo
        ,baton->path
);

  int result = git_filter_list_apply_to_file(
baton->out,baton->filters,baton->repo,baton->path    );

    baton->error_code = result;

    if (result != GIT_OK && giterr_last() != NULL) {
      baton->error = git_error_dup(giterr_last());
    }

  }
}

void GitFilterList::ApplyToFileWorker::HandleOKCallback() {
  if (baton->error_code == GIT_OK) {
    v8::Local<v8::Value> to;
// start convert_to_v8 block
   if (baton->out) {
    to = Nan::New<String>(baton->out->ptr, baton->out->size).ToLocalChecked();
  }
  else {
    to = Nan::Null();
  }
  // end convert_to_v8 block
    v8::Local<v8::Value> result = to;
    v8::Local<v8::Value> argv[2] = {
      Nan::Null(),
      result
    };
    callback->Call(2, argv);
  } else {
    if (baton->error) {
      v8::Local<v8::Object> err;
      if (baton->error->message) {
        err = Nan::Error(baton->error->message)->ToObject();
      } else {
        err = Nan::Error("Method applyToFile has thrown an error.")->ToObject();
      }
      err->Set(Nan::New("errno").ToLocalChecked(), Nan::New(baton->error_code));
      err->Set(Nan::New("errorFunction").ToLocalChecked(), Nan::New("FilterList.applyToFile").ToLocalChecked());
      v8::Local<v8::Value> argv[1] = {
        err
      };
      callback->Call(1, argv);
      if (baton->error->message)
        free((void *)baton->error->message);
      free((void *)baton->error);
    } else if (baton->error_code < 0) {
      std::queue< v8::Local<v8::Value> > workerArguments;
      workerArguments.push(GetFromPersistent("repo"));
      workerArguments.push(GetFromPersistent("path"));
      bool callbackFired = false;
      while(!workerArguments.empty()) {
        v8::Local<v8::Value> node = workerArguments.front();
        workerArguments.pop();

        if (
          !node->IsObject()
          || node->IsArray()
          || node->IsBooleanObject()
          || node->IsDate()
          || node->IsFunction()
          || node->IsNumberObject()
          || node->IsRegExp()
          || node->IsStringObject()
        ) {
          continue;
        }

        v8::Local<v8::Object> nodeObj = node->ToObject();
        v8::Local<v8::Value> checkValue = GetPrivate(nodeObj, Nan::New("NodeGitPromiseError").ToLocalChecked());

        if (!checkValue.IsEmpty() && !checkValue->IsNull() && !checkValue->IsUndefined()) {
          v8::Local<v8::Value> argv[1] = {
            checkValue->ToObject()
          };
          callback->Call(1, argv);
          callbackFired = true;
          break;
        }

        v8::Local<v8::Array> properties = nodeObj->GetPropertyNames();
        for (unsigned int propIndex = 0; propIndex < properties->Length(); ++propIndex) {
          v8::Local<v8::String> propName = properties->Get(propIndex)->ToString();
          v8::Local<v8::Value> nodeToQueue = nodeObj->Get(propName);
          if (!nodeToQueue->IsUndefined()) {
            workerArguments.push(nodeToQueue);
          }
        }
      }

      if (!callbackFired) {
        v8::Local<v8::Object> err = Nan::Error("Method applyToFile has thrown an error.")->ToObject();
        err->Set(Nan::New("errno").ToLocalChecked(), Nan::New(baton->error_code));
        err->Set(Nan::New("errorFunction").ToLocalChecked(), Nan::New("FilterList.applyToFile").ToLocalChecked());
        v8::Local<v8::Value> argv[1] = {
          err
        };
        callback->Call(1, argv);
      }
    } else {
      callback->Call(0, NULL);
    }

  }

        git_buf_free(baton->out);
        free((void *)baton->out);

  delete baton;
}

   
/*
     */
NAN_METHOD(GitFilterList::Free) {
  Nan::EscapableHandleScope scope;

if (Nan::ObjectWrap::Unwrap<GitFilterList>(info.This())->GetValue() != NULL) {
 
  giterr_clear();

  {
    LockMaster lockMaster(/*asyncAction: */false        ,    Nan::ObjectWrap::Unwrap<GitFilterList>(info.This())->GetValue()
);

git_filter_list_free(
  Nan::ObjectWrap::Unwrap<GitFilterList>(info.This())->GetValue()
    );

    Nan::ObjectWrap::Unwrap<GitFilterList>(info.This())->ClearValue();
  }
     return info.GetReturnValue().Set(scope.Escape(Nan::Undefined()));
  }
}
  
/*
  * @param Repository repo
   * @param Blob blob
   * @param String path
   * @param Number mode
   * @param Number flags
    * @param FilterList callback
   */
NAN_METHOD(GitFilterList::Load) {

  if (info.Length() == 0 || !info[0]->IsObject()) {
    return Nan::ThrowError("Repository repo is required.");
  }

  if (info.Length() == 2 || !info[2]->IsString()) {
    return Nan::ThrowError("String path is required.");
  }

  if (info.Length() == 3 || !info[3]->IsNumber()) {
    return Nan::ThrowError("Number mode is required.");
  }

  if (info.Length() == 4 || !info[4]->IsNumber()) {
    return Nan::ThrowError("Number flags is required.");
  }

  if (info.Length() == 5 || !info[5]->IsFunction()) {
    return Nan::ThrowError("Callback is required and must be a Function.");
  }

  LoadBaton* baton = new LoadBaton;

  baton->error_code = GIT_OK;
  baton->error = NULL;

// start convert_from_v8 block
  git_repository * from_repo = NULL;
from_repo = Nan::ObjectWrap::Unwrap<GitRepository>(info[0]->ToObject())->GetValue();
// end convert_from_v8 block
  baton->repo = from_repo;
// start convert_from_v8 block
  git_blob * from_blob = NULL;
    if (info[1]->IsObject()) {
from_blob = Nan::ObjectWrap::Unwrap<GitBlob>(info[1]->ToObject())->GetValue();
  }
  else {
    from_blob = 0;
  }
// end convert_from_v8 block
  baton->blob = from_blob;
// start convert_from_v8 block
  const char * from_path = NULL;

  String::Utf8Value path(info[2]->ToString());
  // malloc with one extra byte so we can add the terminating null character C-strings expect:
  from_path = (const char *) malloc(path.length() + 1);
  // copy the characters from the nodejs string into our C-string (used instead of strdup or strcpy because nulls in
  // the middle of strings are valid coming from nodejs):
  memcpy((void *)from_path, *path, path.length());
  // ensure the final byte of our new string is null, extra casts added to ensure compatibility with various C types
  // used in the nodejs binding generation:
  memset((void *)(((char *)from_path) + path.length()), 0, 1);
// end convert_from_v8 block
  baton->path = from_path;
// start convert_from_v8 block
  git_filter_mode_t from_mode;
  from_mode = (git_filter_mode_t)  (int) info[3]->ToNumber()->Value();
// end convert_from_v8 block
  baton->mode = from_mode;
// start convert_from_v8 block
  uint32_t from_flags;
  from_flags = (uint32_t)   info[4]->ToNumber()->Value();
// end convert_from_v8 block
  baton->flags = from_flags;

  Nan::Callback *callback = new Nan::Callback(v8::Local<Function>::Cast(info[5]));
  LoadWorker *worker = new LoadWorker(baton, callback);
  if (!info[0]->IsUndefined() && !info[0]->IsNull())
    worker->SaveToPersistent("repo", info[0]->ToObject());
  if (!info[1]->IsUndefined() && !info[1]->IsNull())
    worker->SaveToPersistent("blob", info[1]->ToObject());
  if (!info[2]->IsUndefined() && !info[2]->IsNull())
    worker->SaveToPersistent("path", info[2]->ToObject());
  if (!info[3]->IsUndefined() && !info[3]->IsNull())
    worker->SaveToPersistent("mode", info[3]->ToObject());
  if (!info[4]->IsUndefined() && !info[4]->IsNull())
    worker->SaveToPersistent("flags", info[4]->ToObject());

  AsyncLibgit2QueueWorker(worker);
  return;
}

void GitFilterList::LoadWorker::Execute() {
  giterr_clear();

  {
    LockMaster lockMaster(/*asyncAction: */true        ,baton->repo
        ,baton->blob
        ,baton->path
);

  int result = git_filter_list_load(
&baton->filters,baton->repo,baton->blob,baton->path,baton->mode,baton->flags    );

    baton->error_code = result;

    if (result != GIT_OK && giterr_last() != NULL) {
      baton->error = git_error_dup(giterr_last());
    }

  }
}

void GitFilterList::LoadWorker::HandleOKCallback() {
  if (baton->error_code == GIT_OK) {
    v8::Local<v8::Value> to;
// start convert_to_v8 block
  
  if (baton->filters != NULL) {
    // GitFilterList baton->filters
       to = GitFilterList::New(baton->filters, false  );
   }
  else {
    to = Nan::Null();
  }

 // end convert_to_v8 block
    v8::Local<v8::Value> result = to;
    v8::Local<v8::Value> argv[2] = {
      Nan::Null(),
      result
    };
    callback->Call(2, argv);
  } else {
    if (baton->error) {
      v8::Local<v8::Object> err;
      if (baton->error->message) {
        err = Nan::Error(baton->error->message)->ToObject();
      } else {
        err = Nan::Error("Method load has thrown an error.")->ToObject();
      }
      err->Set(Nan::New("errno").ToLocalChecked(), Nan::New(baton->error_code));
      err->Set(Nan::New("errorFunction").ToLocalChecked(), Nan::New("FilterList.load").ToLocalChecked());
      v8::Local<v8::Value> argv[1] = {
        err
      };
      callback->Call(1, argv);
      if (baton->error->message)
        free((void *)baton->error->message);
      free((void *)baton->error);
    } else if (baton->error_code < 0) {
      std::queue< v8::Local<v8::Value> > workerArguments;
      workerArguments.push(GetFromPersistent("repo"));
      workerArguments.push(GetFromPersistent("blob"));
      workerArguments.push(GetFromPersistent("path"));
      workerArguments.push(GetFromPersistent("mode"));
      workerArguments.push(GetFromPersistent("flags"));
      bool callbackFired = false;
      while(!workerArguments.empty()) {
        v8::Local<v8::Value> node = workerArguments.front();
        workerArguments.pop();

        if (
          !node->IsObject()
          || node->IsArray()
          || node->IsBooleanObject()
          || node->IsDate()
          || node->IsFunction()
          || node->IsNumberObject()
          || node->IsRegExp()
          || node->IsStringObject()
        ) {
          continue;
        }

        v8::Local<v8::Object> nodeObj = node->ToObject();
        v8::Local<v8::Value> checkValue = GetPrivate(nodeObj, Nan::New("NodeGitPromiseError").ToLocalChecked());

        if (!checkValue.IsEmpty() && !checkValue->IsNull() && !checkValue->IsUndefined()) {
          v8::Local<v8::Value> argv[1] = {
            checkValue->ToObject()
          };
          callback->Call(1, argv);
          callbackFired = true;
          break;
        }

        v8::Local<v8::Array> properties = nodeObj->GetPropertyNames();
        for (unsigned int propIndex = 0; propIndex < properties->Length(); ++propIndex) {
          v8::Local<v8::String> propName = properties->Get(propIndex)->ToString();
          v8::Local<v8::Value> nodeToQueue = nodeObj->Get(propName);
          if (!nodeToQueue->IsUndefined()) {
            workerArguments.push(nodeToQueue);
          }
        }
      }

      if (!callbackFired) {
        v8::Local<v8::Object> err = Nan::Error("Method load has thrown an error.")->ToObject();
        err->Set(Nan::New("errno").ToLocalChecked(), Nan::New(baton->error_code));
        err->Set(Nan::New("errorFunction").ToLocalChecked(), Nan::New("FilterList.load").ToLocalChecked());
        v8::Local<v8::Value> argv[1] = {
          err
        };
        callback->Call(1, argv);
      }
    } else {
      callback->Call(0, NULL);
    }

  }


  delete baton;
}

    // force base class template instantiation, to make sure we get all the
// methods, statics, etc.
template class NodeGitWrapper<GitFilterListTraits>;
 