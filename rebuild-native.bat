@echo off
echo Setting up Visual Studio 2022 build environment...

call "D:\visualStudio\VC\Auxiliary\Build\vcvars64.bat"

if %ERRORLEVEL% NEQ 0 (
    echo Failed to initialize Visual Studio environment
    exit /b 1
)

echo.
echo Rebuilding better-sqlite3...
echo.

cd /d "%~dp0"
pnpm rebuild better-sqlite3

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Rebuild failed. Trying clean install...
    pnpm install better-sqlite3 --force
)

echo.
echo Done!
