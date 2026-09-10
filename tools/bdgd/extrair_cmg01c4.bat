```bat
@echo off
setlocal EnableExtensions EnableDelayedExpansion

title POWER GRID MONITOR - EXTRATOR BDGD

echo ============================================================
echo       POWER GRID MONITOR - EXTRATOR BDGD
echo ============================================================
echo.

REM ============================================================
REM CONFIGURACAO
REM ============================================================

set "GDAL=C:\Users\jaelc\AppData\Local\Programs\OSGeo4W\bin"

set "GDB=C:\Users\jaelc\Documents\Neoenergia_Pernambuco_43_2025-12-31_V11_20260825-0915.gdb"

set "ALIMENTADOR=CMG01C4"

set "CONJUNTO=16179"

REM ============================================================
REM DIRETORIO DO PROJETO
REM ============================================================

set "BASE=%~dp0"

set "OUT=%BASE%..\..\public\data\bdgd"

echo.
echo GDAL:
echo %GDAL%

echo.
echo GDB:
echo %GDB%

echo.
echo ALIMENTADOR:
echo %ALIMENTADOR%

echo.
echo CONJUNTO:
echo %CONJUNTO%

echo.
echo SAIDA:
echo %OUT%

echo.

REM ============================================================
REM VALIDAR GDAL
REM ============================================================

if not exist "%GDAL%\ogrinfo.exe" (
    echo.
    echo ❌ ERRO: ogrinfo.exe nao encontrado.
    echo.
    pause
    exit /b 1
)

if not exist "%GDAL%\ogr2ogr.exe" (
    echo.
    echo ❌ ERRO: ogr2ogr.exe nao encontrado.
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM VALIDAR GDB
REM ============================================================

if not exist "%GDB%" (
    echo.
    echo ❌ ERRO: GDB nao encontrada:
    echo.
    echo %GDB%
    echo.
    pause
    exit /b 1
)

REM ============================================================
REM CRIAR PASTA DE SAIDA
REM ============================================================

if not exist "%OUT%" (
    mkdir "%OUT%"
)

echo.
echo ============================================================
echo LIMPANDO ARQUIVOS ANTERIORES
echo ============================================================
echo.

del /q "%OUT%\CMG01C4.geojson" 2>nul
del /q "%OUT%\CMG01C4_ponnot.geojson" 2>nul
del /q "%OUT%\CMG01C4_equipamentos_novo.geojson" 2>nul
del /q "%OUT%\CMG01C4_eqse.geojson" 2>nul

REM ============================================================
REM 1 - SSDMT
REM ============================================================

echo.
echo ============================================================
echo [1/4] EXTRAINDO SSDMT
echo ============================================================
echo.

"%GDAL%\ogr2ogr.exe" ^
    -f GeoJSON ^
    "%OUT%\CMG01C4.geojson" ^
    "%GDB%" ^
    SSDMT ^
    -where "CT_COD_OP = '%ALIMENTADOR%'" ^
    -lco RFC7946=YES ^
    -overwrite

if errorlevel 1 (
    echo.
    echo ❌ ERRO AO EXTRAIR SSDMT
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ SSDMT gerado:
echo %OUT%\CMG01C4.geojson

REM ============================================================
REM 2 - PONNOT
REM ============================================================

echo.
echo ============================================================
echo [2/4] EXTRAINDO PONNOT
echo ============================================================
echo.

"%GDAL%\ogr2ogr.exe" ^
    -f GeoJSON ^
    "%OUT%\CMG01C4_ponnot.geojson" ^
    "%GDB%" ^
    PONNOT ^
    -where "CONJ = %CONJUNTO%" ^
    -lco RFC7946=YES ^
    -overwrite

if errorlevel 1 (
    echo.
    echo ❌ ERRO AO EXTRAIR PONNOT
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ PONNOT gerado:
echo %OUT%\CMG01C4_ponnot.geojson

REM ============================================================
REM 3 - EQUIPAMENTOS_NOVO
REM ============================================================
REM
REM Este arquivo e espacial e sera utilizado pelo CamadaBDGD.jsx
REM como ARQUIVO_UNSEMT.
REM
REM A geometria vem do PONNOT.
REM ============================================================

echo.
echo ============================================================
echo [3/4] GERANDO EQUIPAMENTOS_NOVO
echo ============================================================
echo.

"%GDAL%\ogr2ogr.exe" ^
    -f GeoJSON ^
    "%OUT%\CMG01C4_equipamentos_novo.geojson" ^
    "%GDB%" ^
    PONNOT ^
    -where "CONJ = %CONJUNTO% AND TIP_INST IS NOT NULL" ^
    -lco RFC7946=YES ^
    -overwrite

if errorlevel 1 (
    echo.
    echo ❌ ERRO AO GERAR EQUIPAMENTOS_NOVO
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ EQUIPAMENTOS_NOVO gerado:
echo %OUT%\CMG01C4_equipamentos_novo.geojson

REM ============================================================
REM 4 - EQSE
REM ============================================================
REM
REM EQSE nao possui geometria.
REM Portanto ele e exportado como tabela de atributos.
REM
REM O arquivo sera consumido pelo modelo para associacao
REM dos equipamentos.
REM ============================================================

echo.
echo ============================================================
echo [4/4] EXTRAINDO EQSE
echo ============================================================
echo.

"%GDAL%\ogr2ogr.exe" ^
    -f GeoJSON ^
    "%OUT%\CMG01C4_eqse.geojson" ^
    "%GDB%" ^
    EQSE ^
    -lco RFC7946=YES ^
    -overwrite

if errorlevel 1 (
    echo.
    echo ❌ ERRO AO EXTRAIR EQSE
    echo.
    pause
    exit /b 1
)

echo.
echo ✅ EQSE gerado:
echo %OUT%\CMG01C4_eqse.geojson

REM ============================================================
REM VERIFICACAO FINAL
REM ============================================================

echo.
echo ============================================================
echo VERIFICACAO DOS ARQUIVOS
echo ============================================================
echo.

if exist "%OUT%\CMG01C4.geojson" (
    for %%A in ("%OUT%\CMG01C4.geojson") do echo [OK] SSDMT        %%~zA bytes
) else (
    echo [ERRO] CMG01C4.geojson
)

if exist "%OUT%\CMG01C4_ponnot.geojson" (
    for %%A in ("%OUT%\CMG01C4_ponnot.geojson") do echo [OK] PONNOT       %%~zA bytes
) else (
    echo [ERRO] CMG01C4_ponnot.geojson
)

if exist "%OUT%\CMG01C4_equipamentos_novo.geojson" (
    for %%A in ("%OUT%\CMG01C4_equipamentos_novo.geojson") do echo [OK] EQUIPAMENTOS %%~zA bytes
) else (
    echo [ERRO] CMG01C4_equipamentos_novo.geojson
)

if exist "%OUT%\CMG01C4_eqse.geojson" (
    for %%A in ("%OUT%\CMG01C4_eqse.geojson") do echo [OK] EQSE          %%~zA bytes
) else (
    echo [ERRO] CMG01C4_eqse.geojson
)

echo.
echo ============================================================
echo EXTRACAO FINALIZADA
echo ============================================================
echo.

pause
endlocal
```
