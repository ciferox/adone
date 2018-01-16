{
  'targets': [
    {
      'target_name': 'snappy',
      'include_dirs': [
        "<(adone_native_dir)/nan",
        "<(adone_native_dir)/adone"
      ],
      'dependencies': [ 'src/deps/snappy.gyp:libsnappy' ],
      'sources': [ 'src/snappy.cc' ]
    }
  ]
}
