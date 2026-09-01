@echo off
title SmartCard es DigiSign Szolgaltatasok Inditasa
chcp 65001 >nul
echo ========================================================
echo   FleetCMD - DigiSign / SmartCard Szolgaltatasok Inditasa
echo ========================================================
echo.

echo [1/4] Intelligens kartya (SCardSvr) beallitasa Automatikusra...
sc config SCardSvr start= auto
net start SCardSvr

echo.
echo [2/4] Intelligens kartya eszkozek (ScDeviceEnum) beallitasa...
sc config ScDeviceEnum start= auto
net start ScDeviceEnum

echo.
echo [3/4] Ellenorzes:
sc query SCardSvr
sc query ScDeviceEnum

echo.
echo ========================================================
echo   SIKER! A szolgaltatasok elindultak.
echo   Nyomj meg egy billentyut a kilepeshez.
echo ========================================================
pause
