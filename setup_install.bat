@echo off
cd /d %~dp0

:: Virtual env activate (agar use karte ho)
:: call venv\Scripts\activate.bat

:: FastAPI app run karo using uvicorn
start "" uvicorn MercuryApi:app --host 0.0.0.0 --port 8000
