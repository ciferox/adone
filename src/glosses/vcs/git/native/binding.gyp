{
  'targets': [
    {
      "target_name": "git",
      "dependencies": [
        "src/deps/libgit2.gyp:libgit2"
      ],
      "variables": {
        "coverage%": 0
      },
      "sources": [
        "src/src/async_baton.cc",
        "src/src/lock_master.cc",
        "src/src/nodegit.cc",
        "src/src/init_ssh2.cc",
        "src/src/promise_completion.cc",
        "src/src/wrapper.cc",
        "src/src/functions/copy.cc",
        "src/src/functions/free.cc",
        "src/src/convenient_patch.cc",
        "src/src/convenient_hunk.cc",
        "src/src/filter_registry.cc",
        "src/src/git_buf_converter.cc",
        "src/src/str_array_converter.cc",
        "src/src/thread_pool.cc",
        "src/src/annotated_commit.cc",
        "src/src/attr.cc",
        "src/src/blame.cc",
        "src/src/blame_hunk.cc",
        "src/src/blame_options.cc",
        "src/src/blob.cc",
        "src/src/branch.cc",
        "src/src/branch_iterator.cc",
        "src/src/buf.cc",
        "src/src/cert.cc",
        "src/src/cert_hostkey.cc",
        "src/src/cert_x509.cc",
        "src/src/checkout.cc",
        "src/src/checkout_options.cc",
        "src/src/cherrypick.cc",
        "src/src/cherrypick_options.cc",
        "src/src/clone.cc",
        "src/src/clone_options.cc",
        "src/src/commit.cc",
        "src/src/config.cc",
        "src/src/config_entry.cc",
        "src/src/config_entry.cc",
        "src/src/cred.cc",
        "src/src/cred_default.cc",
        "src/src/cred_username.cc",
        "src/src/cred_userpass_payload.cc",
        "src/src/cvar_map.cc",
        "src/src/describe_format_options.cc",
        "src/src/describe_options.cc",
        "src/src/describe_result.cc",
        "src/src/diff.cc",
        "src/src/diff_binary.cc",
        "src/src/diff_binary_file.cc",
        "src/src/diff_delta.cc",
        "src/src/diff_file.cc",
        "src/src/diff_find_options.cc",
        "src/src/diff_hunk.cc",
        "src/src/diff_line.cc",
        "src/src/diff_options.cc",
        "src/src/diff_perfdata.cc",
        "src/src/diff_perfdata.cc",
        "src/src/diff_stats.cc",
        "src/src/error.cc",
        "src/src/fetch.cc",
        "src/src/fetch_options.cc",
        "src/src/fetch_options.cc",
        "src/src/filter.cc",
        "src/src/filter.cc",
        "src/src/filter_list.cc",
        "src/src/filter_source.cc",
        "src/src/giterr.cc",
        "src/src/graph.cc",
        "src/src/hashsig.cc",
        "src/src/ignore.cc",
        "src/src/index.cc",
        "src/src/index_conflict_iterator.cc",
        "src/src/index_entry.cc",
        "src/src/index_time.cc",
        "src/src/indexer.cc",
        "src/src/libgit2.cc",
        "src/src/mempack.cc",
        "src/src/merge.cc",
        "src/src/merge_driver_source.cc",
        "src/src/merge_file_input.cc",
        "src/src/merge_file_options.cc",
        "src/src/merge_file_result.cc",
        "src/src/merge_options.cc",
        "src/src/merge_result.cc",
        "src/src/message.cc",
        "src/src/note.cc",
        "src/src/note_iterator.cc",
        "src/src/object.cc",
        "src/src/odb.cc",
        "src/src/odb_expand_id.cc",
        "src/src/odb_object.cc",
        "src/src/oid.cc",
        "src/src/oid_shorten.cc",
        "src/src/oidarray.cc",
        "src/src/openssl.cc",
        "src/src/packbuilder.cc",
        "src/src/patch.cc",
        "src/src/pathspec.cc",
        "src/src/pathspec_match_list.cc",
        "src/src/proxy.cc",
        "src/src/proxy_options.cc",
        "src/src/push.cc",
        "src/src/push_options.cc",
        "src/src/push_update.cc",
        "src/src/rebase.cc",
        "src/src/rebase_operation.cc",
        "src/src/rebase_options.cc",
        "src/src/refdb.cc",
        "src/src/reference.cc",
        "src/src/reflog.cc",
        "src/src/reflog_entry.cc",
        "src/src/refspec.cc",
        "src/src/remote.cc",
        "src/src/remote_callbacks.cc",
        "src/src/remote_callbacks.cc",
        "src/src/remote_head.cc",
        "src/src/remote_head.cc",
        "src/src/repository.cc",
        "src/src/repository_init_options.cc",
        "src/src/reset.cc",
        "src/src/revert.cc",
        "src/src/revert_options.cc",
        "src/src/revparse.cc",
        "src/src/revwalk.cc",
        "src/src/signature.cc",
        "src/src/smart.cc",
        "src/src/stash.cc",
        "src/src/stash_apply_options.cc",
        "src/src/status.cc",
        "src/src/status_entry.cc",
        "src/src/status_list.cc",
        "src/src/status_options.cc",
        "src/src/strarray.cc",
        "src/src/submodule.cc",
        "src/src/submodule_update_options.cc",
        "src/src/tag.cc",
        "src/src/time.cc",
        "src/src/trace.cc",
        "src/src/transaction.cc",
        "src/src/transfer_progress.cc",
        "src/src/transport.cc",
        "src/src/tree.cc",
        "src/src/tree_entry.cc",
        "src/src/tree_update.cc",
        "src/src/treebuilder.cc",
        "src/src/writestream.cc",
      ],
      "include_dirs": [
        "src/deps/libv8-convert",
        "src/deps/libssh2/include",
        "src/deps/openssl/openssl/include",
        "<(adone_native_dir)/nan"
      ],
      "cflags": [
        "-Wall"
      ],
      "conditions": [
        [
            "coverage==1", {
            "cflags": [
                "-ftest-coverage",
                "-fprofile-arcs"
            ],
            "link_settings": {
                "libraries": [
                "-lgcov"
                ]
            },
            }
        ],
        [
            "OS=='mac'", {
            "xcode_settings": {
                "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
                "MACOSX_DEPLOYMENT_TARGET": "10.7",

                "WARNING_CFLAGS": [
                "-Wno-unused-variable",
                "-Wint-conversions",
                "-Wmissing-field-initializers",
                "-Wno-c++11-extensions"
                ]
            }
            }
        ],
        [
            "OS=='win'", {
            "defines": [
                "_HAS_EXCEPTIONS=1"
            ],
            "msvs_settings": {
                "VCCLCompilerTool": {
                "AdditionalOptions": [
                    "/EHsc"
                ]
                },
                "VCLinkerTool": {
                "AdditionalOptions": [
                    "/FORCE:MULTIPLE"
                ]
                }
            }
            }
        ],
        [
          "OS=='linux' or OS=='mac'", {
            "libraries": [
              "-lcurl"
            ]
          }
        ],
        [
          "OS=='linux' or OS.endswith('bsd')", {
            "cflags": [
              "-std=c++11"
            ]
          }
        ]
      ]
    }
  ]
}
