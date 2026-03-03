@echo off
REM ================================================
REM setup.bat — 최초 1회 실행 (venv 생성 + 패키지 설치)
REM ================================================
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul

cd /d "%~dp0"

where python >nul 2>&1
if %errorlevel%==0 (set "PY=python") else (
    where py >nul 2>&1
    if %errorlevel%==0 (set "PY=py") else (
        echo [ERROR] Python을 찾을 수 없습니다. PATH를 확인하세요.
        pause & exit /b 1
    )
)

if exist ".venv\Scripts\python.exe" (
    echo [INFO] .venv 이미 존재 — pip 업데이트 및 패키지 재설치만 진행합니다.
) else (
    echo [INFO] 가상환경 생성 중...
    %PY% -m venv .venv
    if errorlevel 1 (echo [ERROR] venv 생성 실패 & pause & exit /b 1)
)

echo [INFO] pip 업그레이드...
".venv\Scripts\python.exe" -m pip install --upgrade pip -q

echo [INFO] 패키지 설치 중...
".venv\Scripts\python.exe" -m pip install -r requirements.txt -q
if errorlevel 1 (echo [ERROR] 설치 실패. requirements.txt를 확인하세요. & pause & exit /b 1)

echo.
echo [완료] 설치 성공! 이제 run.bat을 실행하세요.
pause
