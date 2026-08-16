@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0verify-task.ps1" %*
exit /b %ERRORLEVEL%
