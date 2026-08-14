@echo off
setlocal EnableExtensions EnableDelayedExpansion

title EXTRATOR BDGD - COI MONITORAMENTO

echo.
echo ==========================================================
echo              EXTRATOR BDGD - COI
echo ==========================================================
echo.
echo Alimentador: CMG01C4
echo.

REM ==========================================================
REM CONFIGURACAO
REM ==========================================================

set "BASE=%~dp0"

set "GDAL=C:\Users\vitor\AppData\Local\Programs\OSGeo4W\bin"

set "GDB=C:\Users\vitor\Downloads\Neoenergia_Pernambuco_43_2024-12-31_V11_20250902-1359.gdb"

set "OUT=%BASE%..\..\public\data\bdgd"

set "ALIMENTADOR=CMG01C4"

set "SSDMT=%OUT%\%ALIMENTADOR%.geojson"

set "PONTOS=%OUT%\%ALIMENTADOR%_ponnot.geojson"

set "CODID=%OUT%\%ALIMENTADOR%_codid.txt"

set "PYTHON_SCRIPT=%BASE%gerar_pontos_ponnot.py"

set "LOG=%OUT%\%ALIMENTADOR%_extracao.log"

REM ==========================================================
REM VALIDACAO
REM ==========================================================

echo ==========================================================
echo [1/5] VALIDANDO AMBIENTE
echo ==========================================================
echo.

if not exist "%GDAL%\ogr2ogr.exe" (
    echo ERRO:
    echo ogr2ogr.exe nao encontrado.
    echo.
    echo %GDAL%\ogr2ogr.exe
    echo.
    pause
    exit /b 1
)

if not exist "%GDAL%\ogrinfo.exe" (
    echo ERRO:
    echo ogrinfo.exe nao encontrado.
    echo.
    pause
    exit /b 1
)

if not exist "%GDB%" (
    echo ERRO:
    echo GDB nao encontrada:
    echo.
    echo %GDB%
    echo.
    pause
    exit /b 1
)

if not exist "%PYTHON_SCRIPT%" (
    echo ERRO:
    echo Script Python nao encontrado.
    echo.
    echo Procurado em:
    echo %PYTHON_SCRIPT%
    echo.
    echo Estrutura esperada:
    echo.
    echo tools\bdgd\extrair_cmg01c4.bat
    echo tools\bdgd\gerar_pontos_ponnot.py
    echo.
    pause
    exit /b 1
)

if not exist "%OUT%" (
    echo Criando pasta:
    echo %OUT%
    mkdir "%OUT%"
)

echo GDAL encontrado.
echo.

"%GDAL%\gdalinfo.exe" --version

echo.

echo ==========================================================
echo VALIDANDO PYTHON
echo ==========================================================
echo.

py --version

if errorlevel 1 (
    echo.
    echo ERRO:
    echo Python nao encontrado.
    echo.
    pause
    exit /b 1
)

echo.

echo Python encontrado:
echo %PYTHON_SCRIPT%
echo.

REM ==========================================================
REM LIMPEZA
REM ==========================================================

echo ==========================================================
echo [2/5] LIMPEZA
echo ==========================================================
echo.

if exist "%SSDMT%" (
    echo Removendo SSDMT anterior...
    del /q "%SSDMT%"
)

if exist "%PONTOS%" (
    echo Removendo pontos anteriores...
    del /q "%PONTOS%"
)

if exist "%CODID%" (
    echo Removendo lista anterior...
    del /q "%CODID%"
)

echo.
echo Limpeza concluida.
echo.

REM ==========================================================
REM EXTRAIR SSDMT
REM ==========================================================

echo ==========================================================
echo [3/5] EXTRAINDO SSDMT
echo ==========================================================
echo.

"%GDAL%\ogr2ogr.exe" ^
    -f GeoJSON ^
    "%SSDMT%" ^
    "%GDB%" ^
    SSDMT ^
    -where "CT_COD_OP = '%ALIMENTADOR%'" ^
    -t_srs EPSG:4326 ^
    -lco RFC7946=YES

if errorlevel 1 (
    echo.
    echo ==========================================================
    echo ERRO NA EXTRACAO DO SSDMT
    echo ==========================================================
    echo.
    pause
    exit /b 1
)

echo.
echo SSDMT extraido com sucesso.
echo.

"%GDAL%\ogrinfo.exe" "%SSDMT%" -so

echo.

REM ==========================================================
REM GERAR LISTA DE COD_ID
REM ==========================================================

echo ==========================================================
echo GERANDO LISTA DE CONEXOES
echo ==========================================================
echo.

echo Extraindo PN_CON_1 e PN_CON_2...

"%GDAL%\ogrinfo.exe" ^
    "%SSDMT%" ^
    -dialect SQLite ^
    -sql "SELECT PN_CON_1 FROM SSDMT WHERE PN_CON_1 IS NOT NULL UNION SELECT PN_CON_2 FROM SSDMT WHERE PN_CON_2 IS NOT NULL" ^
    -al ^
    -geom=no ^
    > "%CODID%"

if errorlevel 1 (
    echo.
    echo ERRO ao gerar lista de conexoes.
    echo.
    pause
    exit /b 1
)

echo.
echo Lista criada:
echo %CODID%
echo.

REM ==========================================================
REM FILTRAR LISTA
REM ==========================================================

echo ==========================================================
echo PREPARANDO LISTA DE COD_ID
echo ==========================================================
echo.

REM O ogrinfo possui cabecalhos.
REM O Python fara a leitura e extracao dos COD_ID.

echo Lista preparada.
echo.

REM ==========================================================
REM GERAR PONTOS PONNOT
REM ==========================================================

echo ==========================================================
echo [4/5] EXTRAINDO PONTOS PONNOT
echo ==========================================================
echo.

echo Executando Python:
echo.
echo py "%PYTHON_SCRIPT%"
echo.

py "%PYTHON_SCRIPT%" ^
    "%SSDMT%" ^
    "%GDB%" ^
    "%PONTOS%"
    
if errorlevel 1 (
    echo.
    echo ==========================================================
    echo ERRO AO GERAR PONTOS PONNOT
    echo ==========================================================
    echo.
    echo O Python retornou erro.
    echo.
    pause
    exit /b 1
)

echo.
echo Pontos PONNOT gerados com sucesso.
echo.

REM ==========================================================
REM VALIDACAO FINAL
REM ==========================================================

echo ==========================================================
echo [5/5] VALIDACAO FINAL
echo ==========================================================
echo.

if not exist "%SSDMT%" (
    echo ERRO:
    echo SSDMT nao foi criado.
    echo.
    pause
    exit /b 1
)

if not exist "%PONTOS%" (
    echo ERRO:
    echo Arquivo PONNOT nao foi criado.
    echo.
    pause
    exit /b 1
)

echo ==========================================================
echo SSDMT
echo ==========================================================
echo.

"%GDAL%\ogrinfo.exe" "%SSDMT%" -so

echo.

echo ==========================================================
echo PONNOT
echo ==========================================================
echo.

"%GDAL%\ogrinfo.exe" "%PONTOS%" -so

echo.

echo ==========================================================
echo             EXTRACAO CONCLUIDA
echo ==========================================================
echo.

echo Alimentador:
echo %ALIMENTADOR%
echo.

echo SSDMT:
echo %SSDMT%
echo.

echo PONNOT:
echo %PONTOS%
echo.

echo ==========================================================
echo Os dados estao prontos para o COI Monitoramento.
echo ==========================================================
echo.

pause

endlocal