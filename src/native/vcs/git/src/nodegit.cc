// This is a generated file, modify: generate/templates/templates/nodegit.cc

#include <node.h>
#include <v8.h>

#include <git2.h>
#include <map>
#include <algorithm>
#include <set>

#include <openssl/crypto.h>

#include "../include/init_ssh2.h"
#include "../include/lock_master.h"
#include "../include/nodegit.h"
#include "../include/wrapper.h"
#include "../include/promise_completion.h"
#include "../include/functions/copy.h"
    #include "../include/annotated_commit.h"
     #include "../include/attr.h"
      #include "../include/blame.h"
      #include "../include/blame_hunk.h"
     #include "../include/blame_options.h"
     #include "../include/blob.h"
     #include "../include/branch.h"
      #include "../include/branch_iterator.h"
     #include "../include/buf.h"
     #include "../include/cert.h"
      #include "../include/cert_hostkey.h"
      #include "../include/cert_x509.h"
     #include "../include/checkout.h"
      #include "../include/checkout_options.h"
      #include "../include/cherrypick.h"
     #include "../include/cherrypick_options.h"
     #include "../include/clone.h"
      #include "../include/clone_options.h"
     #include "../include/commit.h"
     #include "../include/config.h"
     #include "../include/config_entry.h"
     #include "../include/config_entry.h"
      #include "../include/cred.h"
     #include "../include/cred_default.h"
     #include "../include/cred_username.h"
     #include "../include/cred_userpass_payload.h"
       #include "../include/cvar_map.h"
      #include "../include/describe_format_options.h"
     #include "../include/describe_options.h"
     #include "../include/describe_result.h"
     #include "../include/diff.h"
     #include "../include/diff_binary.h"
      #include "../include/diff_binary_file.h"
     #include "../include/diff_delta.h"
     #include "../include/diff_file.h"
      #include "../include/diff_find_options.h"
        #include "../include/diff_hunk.h"
     #include "../include/diff_line.h"
       #include "../include/diff_options.h"
     #include "../include/diff_perfdata.h"
     #include "../include/diff_perfdata.h"
     #include "../include/diff_stats.h"
       #include "../include/error.h"
        #include "../include/fetch.h"
     #include "../include/fetch_options.h"
     #include "../include/fetch_options.h"
       #include "../include/filter.h"
     #include "../include/filter.h"
      #include "../include/filter_list.h"
      #include "../include/filter_source.h"
     #include "../include/giterr.h"
     #include "../include/graph.h"
     #include "../include/hashsig.h"
       #include "../include/ignore.h"
     #include "../include/index.h"
      #include "../include/index_conflict_iterator.h"
     #include "../include/index_entry.h"
     #include "../include/index_time.h"
      #include "../include/indexer.h"
      #include "../include/libgit2.h"
      #include "../include/mempack.h"
     #include "../include/merge.h"
      #include "../include/merge_driver_source.h"
       #include "../include/merge_file_input.h"
     #include "../include/merge_file_options.h"
     #include "../include/merge_file_result.h"
      #include "../include/merge_options.h"
      #include "../include/merge_result.h"
     #include "../include/message.h"
     #include "../include/note.h"
     #include "../include/note_iterator.h"
     #include "../include/object.h"
     #include "../include/odb.h"
     #include "../include/odb_expand_id.h"
     #include "../include/odb_object.h"
      #include "../include/oid.h"
     #include "../include/oid_shorten.h"
     #include "../include/oidarray.h"
     #include "../include/openssl.h"
      #include "../include/packbuilder.h"
      #include "../include/patch.h"
     #include "../include/pathspec.h"
      #include "../include/pathspec_match_list.h"
     #include "../include/proxy.h"
      #include "../include/proxy_options.h"
     #include "../include/push.h"
     #include "../include/push_options.h"
     #include "../include/push_update.h"
     #include "../include/rebase.h"
     #include "../include/rebase_operation.h"
      #include "../include/rebase_options.h"
      #include "../include/refdb.h"
     #include "../include/reference.h"
      #include "../include/reflog.h"
     #include "../include/reflog_entry.h"
     #include "../include/refspec.h"
     #include "../include/remote.h"
      #include "../include/remote_callbacks.h"
     #include "../include/remote_callbacks.h"
      #include "../include/remote_head.h"
     #include "../include/remote_head.h"
     #include "../include/repository.h"
       #include "../include/repository_init_options.h"
       #include "../include/reset.h"
      #include "../include/revert.h"
     #include "../include/revert_options.h"
     #include "../include/revparse.h"
      #include "../include/revwalk.h"
     #include "../include/signature.h"
     #include "../include/smart.h"
      #include "../include/stash.h"
      #include "../include/stash_apply_options.h"
       #include "../include/status.h"
      #include "../include/status_entry.h"
     #include "../include/status_list.h"
      #include "../include/status_options.h"
      #include "../include/strarray.h"
     #include "../include/submodule.h"
         #include "../include/submodule_update_options.h"
     #include "../include/tag.h"
     #include "../include/time.h"
     #include "../include/trace.h"
      #include "../include/transaction.h"
     #include "../include/transfer_progress.h"
     #include "../include/transport.h"
      #include "../include/tree.h"
     #include "../include/tree_entry.h"
     #include "../include/tree_update.h"
      #include "../include/treebuilder.h"
      #include "../include/writestream.h"
  #include "../include/convenient_patch.h"
#include "../include/convenient_hunk.h"
#include "../include/filter_registry.h"

#if (NODE_MODULE_VERSION > 48)
  v8::Local<v8::Value> GetPrivate(v8::Local<v8::Object> object,
                                      v8::Local<v8::String> key) {
    v8::Isolate* isolate = v8::Isolate::GetCurrent();
    v8::Local<v8::Context> context = isolate->GetCurrentContext();
    v8::Local<v8::Private> privateKey = v8::Private::ForApi(isolate, key);
    v8::Local<v8::Value> value;
    v8::Maybe<bool> result = object->HasPrivate(context, privateKey);
    if (!(result.IsJust() && result.FromJust()))
      return v8::Local<v8::Value>();
    if (object->GetPrivate(context, privateKey).ToLocal(&value))
      return value;
    return v8::Local<v8::Value>();
  }

  void SetPrivate(v8::Local<v8::Object> object,
                      v8::Local<v8::String> key,
                      v8::Local<v8::Value> value) {
    if (value.IsEmpty())
      return;
    v8::Isolate* isolate = v8::Isolate::GetCurrent();
    v8::Local<v8::Context> context = isolate->GetCurrentContext();
    v8::Local<v8::Private> privateKey = v8::Private::ForApi(isolate, key);
    object->SetPrivate(context, privateKey, value);
  }
#else
  v8::Local<v8::Value> GetPrivate(v8::Local<v8::Object> object,
                                      v8::Local<v8::String> key) {
    return object->GetHiddenValue(key);
  }

  void SetPrivate(v8::Local<v8::Object> object,
                      v8::Local<v8::String> key,
                      v8::Local<v8::Value> value) {
    object->SetHiddenValue(key, value);
  }
#endif

void LockMasterEnable(const FunctionCallbackInfo<Value>& info) {
  LockMaster::Enable();
}

void LockMasterSetStatus(const FunctionCallbackInfo<Value>& info) {
  Nan::HandleScope scope;

  // convert the first argument to Status
  if(info.Length() >= 0 && info[0]->IsNumber()) {
    v8::Local<v8::Int32> value = info[0]->ToInt32();
    LockMaster::Status status = static_cast<LockMaster::Status>(value->Value());
    if(status >= LockMaster::Disabled && status <= LockMaster::Enabled) {
      LockMaster::SetStatus(status);
      return;
    }
  }

  // argument error
  Nan::ThrowError("Argument must be one 0, 1 or 2");
}

void LockMasterGetStatus(const FunctionCallbackInfo<Value>& info) {
  info.GetReturnValue().Set(Nan::New(LockMaster::GetStatus()));
}

void LockMasterGetDiagnostics(const FunctionCallbackInfo<Value>& info) {
  LockMaster::Diagnostics diagnostics(LockMaster::GetDiagnostics());

  // return a plain JS object with properties
  v8::Local<v8::Object> result = Nan::New<v8::Object>();
  result->Set(Nan::New("storedMutexesCount").ToLocalChecked(), Nan::New(diagnostics.storedMutexesCount));
  info.GetReturnValue().Set(result);
}

static uv_mutex_t *opensslMutexes;

void OpenSSL_LockingCallback(int mode, int type, const char *, int) {
  if (mode & CRYPTO_LOCK) {
    uv_mutex_lock(&opensslMutexes[type]);
  } else {
    uv_mutex_unlock(&opensslMutexes[type]);
  }
}

unsigned long OpenSSL_IDCallback() {
  return (unsigned long)uv_thread_self();
}

void OpenSSL_ThreadSetup() {
  opensslMutexes=(uv_mutex_t *)malloc(CRYPTO_num_locks() * sizeof(uv_mutex_t));

  for (int i=0; i<CRYPTO_num_locks(); i++) {
    uv_mutex_init(&opensslMutexes[i]);
  }

  CRYPTO_set_locking_callback(OpenSSL_LockingCallback);
  CRYPTO_set_id_callback(OpenSSL_IDCallback);
}

ThreadPool libgit2ThreadPool(10, uv_default_loop());

extern "C" void init(v8::Local<v8::Object> target) {
  // Initialize thread safety in openssl and libssh2
  OpenSSL_ThreadSetup();
  init_ssh2();
  // Initialize libgit2.
  git_libgit2_init();

  Nan::HandleScope scope;

  Wrapper::InitializeComponent(target);
  PromiseCompletion::InitializeComponent();
      GitAnnotatedCommit::InitializeComponent(target);
       GitAttr::InitializeComponent(target);
        GitBlame::InitializeComponent(target);
        GitBlameHunk::InitializeComponent(target);
       GitBlameOptions::InitializeComponent(target);
       GitBlob::InitializeComponent(target);
       GitBranch::InitializeComponent(target);
        GitBranchIterator::InitializeComponent(target);
       GitBuf::InitializeComponent(target);
       GitCert::InitializeComponent(target);
        GitCertHostkey::InitializeComponent(target);
        GitCertX509::InitializeComponent(target);
       GitCheckout::InitializeComponent(target);
        GitCheckoutOptions::InitializeComponent(target);
        GitCherrypick::InitializeComponent(target);
       GitCherrypickOptions::InitializeComponent(target);
       GitClone::InitializeComponent(target);
        GitCloneOptions::InitializeComponent(target);
       GitCommit::InitializeComponent(target);
       GitConfig::InitializeComponent(target);
       GitConfigEntry::InitializeComponent(target);
       GitConfigEntry::InitializeComponent(target);
        GitCred::InitializeComponent(target);
       GitCredDefault::InitializeComponent(target);
       GitCredUsername::InitializeComponent(target);
       GitCredUserpassPayload::InitializeComponent(target);
         GitCvarMap::InitializeComponent(target);
        GitDescribeFormatOptions::InitializeComponent(target);
       GitDescribeOptions::InitializeComponent(target);
       GitDescribeResult::InitializeComponent(target);
       GitDiff::InitializeComponent(target);
       GitDiffBinary::InitializeComponent(target);
        GitDiffBinaryFile::InitializeComponent(target);
       GitDiffDelta::InitializeComponent(target);
       GitDiffFile::InitializeComponent(target);
        GitDiffFindOptions::InitializeComponent(target);
          GitDiffHunk::InitializeComponent(target);
       GitDiffLine::InitializeComponent(target);
         GitDiffOptions::InitializeComponent(target);
       GitDiffPerfdata::InitializeComponent(target);
       GitDiffPerfdata::InitializeComponent(target);
       GitDiffStats::InitializeComponent(target);
         GitError::InitializeComponent(target);
          GitFetch::InitializeComponent(target);
       GitFetchOptions::InitializeComponent(target);
       GitFetchOptions::InitializeComponent(target);
         GitFilter::InitializeComponent(target);
       GitFilter::InitializeComponent(target);
        GitFilterList::InitializeComponent(target);
        GitFilterSource::InitializeComponent(target);
       GitGiterr::InitializeComponent(target);
       GitGraph::InitializeComponent(target);
       GitHashsig::InitializeComponent(target);
         GitIgnore::InitializeComponent(target);
       GitIndex::InitializeComponent(target);
        GitIndexConflictIterator::InitializeComponent(target);
       GitIndexEntry::InitializeComponent(target);
       GitIndexTime::InitializeComponent(target);
        GitIndexer::InitializeComponent(target);
        GitLibgit2::InitializeComponent(target);
        GitMempack::InitializeComponent(target);
       GitMerge::InitializeComponent(target);
        GitMergeDriverSource::InitializeComponent(target);
         GitMergeFileInput::InitializeComponent(target);
       GitMergeFileOptions::InitializeComponent(target);
       GitMergeFileResult::InitializeComponent(target);
        GitMergeOptions::InitializeComponent(target);
        GitMergeResult::InitializeComponent(target);
       GitMessage::InitializeComponent(target);
       GitNote::InitializeComponent(target);
       GitNoteIterator::InitializeComponent(target);
       GitObject::InitializeComponent(target);
       GitOdb::InitializeComponent(target);
       GitOdbExpandId::InitializeComponent(target);
       GitOdbObject::InitializeComponent(target);
        GitOid::InitializeComponent(target);
       GitOidShorten::InitializeComponent(target);
       GitOidarray::InitializeComponent(target);
       GitOpenssl::InitializeComponent(target);
        GitPackbuilder::InitializeComponent(target);
        GitPatch::InitializeComponent(target);
       GitPathspec::InitializeComponent(target);
        GitPathspecMatchList::InitializeComponent(target);
       GitProxy::InitializeComponent(target);
        GitProxyOptions::InitializeComponent(target);
       GitPush::InitializeComponent(target);
       GitPushOptions::InitializeComponent(target);
       GitPushUpdate::InitializeComponent(target);
       GitRebase::InitializeComponent(target);
       GitRebaseOperation::InitializeComponent(target);
        GitRebaseOptions::InitializeComponent(target);
        GitRefdb::InitializeComponent(target);
       GitRefs::InitializeComponent(target);
        GitReflog::InitializeComponent(target);
       GitReflogEntry::InitializeComponent(target);
       GitRefspec::InitializeComponent(target);
       GitRemote::InitializeComponent(target);
        GitRemoteCallbacks::InitializeComponent(target);
       GitRemoteCallbacks::InitializeComponent(target);
        GitRemoteHead::InitializeComponent(target);
       GitRemoteHead::InitializeComponent(target);
       GitRepository::InitializeComponent(target);
         GitRepositoryInitOptions::InitializeComponent(target);
         GitReset::InitializeComponent(target);
        GitRevert::InitializeComponent(target);
       GitRevertOptions::InitializeComponent(target);
       GitRevparse::InitializeComponent(target);
        GitRevwalk::InitializeComponent(target);
       GitSignature::InitializeComponent(target);
       GitSmart::InitializeComponent(target);
        GitStash::InitializeComponent(target);
        GitStashApplyOptions::InitializeComponent(target);
         GitStatus::InitializeComponent(target);
        GitStatusEntry::InitializeComponent(target);
       GitStatusList::InitializeComponent(target);
        GitStatusOptions::InitializeComponent(target);
        GitStrarray::InitializeComponent(target);
       GitSubmodule::InitializeComponent(target);
           GitSubmoduleUpdateOptions::InitializeComponent(target);
       GitTag::InitializeComponent(target);
       GitTime::InitializeComponent(target);
       GitTrace::InitializeComponent(target);
        GitTransaction::InitializeComponent(target);
       GitTransferProgress::InitializeComponent(target);
       GitTransport::InitializeComponent(target);
        GitTree::InitializeComponent(target);
       GitTreeEntry::InitializeComponent(target);
       GitTreeUpdate::InitializeComponent(target);
        GitTreebuilder::InitializeComponent(target);
        GitWritestream::InitializeComponent(target);
  
  ConvenientHunk::InitializeComponent(target);
  ConvenientPatch::InitializeComponent(target);
  GitFilterRegistry::InitializeComponent(target);

  NODE_SET_METHOD(target, "enableThreadSafety", LockMasterEnable);
  NODE_SET_METHOD(target, "setThreadSafetyStatus", LockMasterSetStatus);
  NODE_SET_METHOD(target, "getThreadSafetyStatus", LockMasterGetStatus);
  NODE_SET_METHOD(target, "getThreadSafetyDiagnostics", LockMasterGetDiagnostics);

  v8::Local<v8::Object> threadSafety = Nan::New<v8::Object>();
  threadSafety->Set(Nan::New("DISABLED").ToLocalChecked(), Nan::New((int)LockMaster::Disabled));
  threadSafety->Set(Nan::New("ENABLED_FOR_ASYNC_ONLY").ToLocalChecked(), Nan::New((int)LockMaster::EnabledForAsyncOnly));
  threadSafety->Set(Nan::New("ENABLED").ToLocalChecked(), Nan::New((int)LockMaster::Enabled));

  target->Set(Nan::New("THREAD_SAFETY").ToLocalChecked(), threadSafety);

  LockMaster::Initialize();
}

NODE_MODULE(nodegit, init)
