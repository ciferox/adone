{
  'targets': [
    {
      'target_name': 'snappy',
      'include_dirs': [
        "<(adone_root_dir)/nan",
        "<(adone_root_dir)/src/native"
      ],
      'dependencies': [ 'src/deps/snappy.gyp:libsnappy' ],
      'sources': [ 'src/snappy.cc' ]
    }
  ]
}
