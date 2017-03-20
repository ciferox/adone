@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe"  "{{ targetPath }}" %*
) ELSE (
  @SETLOCAL
  @SET PATHEXT=%PATHEXT:;.JS;=;%
  node  "{{ targetPath }}" %*
)