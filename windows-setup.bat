@echo off
echo ================================================
echo   Real Casual Lease - Windows Setup
echo ================================================
echo.

echo [1/4] Installing dependencies...
call npm install
if errorlevel 1 (
    echo ERROR: npm install failed!
    pause
    exit /b 1
)
echo.

echo [2/4] Running database migrations...
call npm run db:push
if errorlevel 1 (
    echo WARNING: Database migration failed. Make sure PostgreSQL is running.
    echo You can skip this for now and run 'npm run db:push' later.
    pause
)
echo.

echo [3/4] Setup complete!
echo.
echo ================================================
echo   Ready to start!
echo ================================================
echo.
echo To start the development server, run:
echo     npm run dev
echo.
echo The server will start at http://localhost:5000
echo.
pause
