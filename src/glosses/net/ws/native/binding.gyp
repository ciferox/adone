{
  'targets': [
    {
      'target_name': 'utils',
      'include_dirs': [
        "<(adone_native_dir)/nan"
      ],
      'sources': [ 'src/utils.cc' ],
      'xcode_settings': {
        'MACOSX_DEPLOYMENT_TARGET': '10.8',
        'CLANG_CXX_LANGUAGE_STANDARD': 'c++11',
        'CLANG_CXX_LIBRARY': 'libc++'
      }
    }
  ]
}
