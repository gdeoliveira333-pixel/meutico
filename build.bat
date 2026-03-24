@echo off
echo ============================================
echo  Meu Tico — Build Script
echo ============================================

echo.
echo [1/4] Buildando frontend React...
cd frontend
call npm run build
if errorlevel 1 ( echo ERRO no build do frontend & pause & exit /b 1 )
cd ..

echo.
echo [2/4] Empacotando backend Python com PyInstaller...
cd backend
pyinstaller --onefile --name meu-tico-server --noconsole ^
  --add-data "google_credentials.json;." ^
  --hidden-import=uvicorn.logging ^
  --hidden-import=uvicorn.loops ^
  --hidden-import=uvicorn.loops.auto ^
  --hidden-import=uvicorn.protocols ^
  --hidden-import=uvicorn.protocols.http ^
  --hidden-import=uvicorn.protocols.http.auto ^
  --hidden-import=uvicorn.protocols.websockets ^
  --hidden-import=uvicorn.protocols.websockets.auto ^
  --hidden-import=uvicorn.lifespan ^
  --hidden-import=uvicorn.lifespan.on ^
  --hidden-import=sqlalchemy.dialects.sqlite ^
  --hidden-import=passlib.handlers.bcrypt ^
  main.py
if errorlevel 1 ( echo ERRO no PyInstaller & pause & exit /b 1 )
cd ..

echo.
echo [3/4] Copiando exe para pasta do Electron...
if not exist electron\backend-dist mkdir electron\backend-dist
copy backend\dist\meu-tico-server.exe electron\backend-dist\
if errorlevel 1 ( echo ERRO ao copiar exe & pause & exit /b 1 )

echo.
echo [4/4] Gerando instalador Electron...
cd electron
call npm install
call npm run build
if errorlevel 1 ( echo ERRO no Electron build & pause & exit /b 1 )
cd ..

echo.
echo ============================================
echo  Build concluido! Instalador em:
echo  electron\dist\
echo ============================================
pause
