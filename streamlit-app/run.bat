@echo off
REM ================================================
REM run.bat — 앱 실행 (매일 사용)
REM ================================================
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".venv\Scripts\activate.bat" (
    echo [ERROR] .venv가 없습니다. 먼저 setup.bat을 실행하세요.
    pause & exit /b 1
)

call ".venv\Scripts\activate.bat"
echo [INFO] 앱 실행 중... (http://localhost:8501)
echo.
python -m streamlit run BDS_app.py

pause
