@echo off
echo ========================================
echo   DEXrp Android Build Script
echo ========================================
echo.

echo [1/3] Building web app...
call npm run build
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Web build failed!
    pause
    exit /b 1
)
echo.

echo [2/3] Syncing to Android...
call npx cap sync android
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Capacitor sync failed!
    pause
    exit /b 1
)
echo.

echo [3/3] Opening Android Studio...
call npx cap open android
echo.

echo ========================================
echo   Build complete!
echo ========================================
echo.
echo Android Studio should now be open.
echo To create an APK: Build ^> Build Bundle(s) / APK(s) ^> Build APK(s)
echo.
pause
