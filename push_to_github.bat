@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
cd /d "F:\ANTIGRAVITY\PROYECTOS\Retroalimentación Evaluación\informe-evaluacion"

echo Iniciando repositorio...
%GIT% init

echo Agregando archivos...
%GIT% add .

echo Creando commit inicial...
%GIT% commit -m "feat: initial commit - Informe Evaluacion v1.0"

echo Configurando rama main...
%GIT% branch -M main

echo Agregando remote...
%GIT% remote add origin https://github.com/biodosis-cmd/Informes-evaluaci-n.git

echo Subiendo a GitHub...
%GIT% push -u origin main

echo.
echo LISTO. Revisa el resultado arriba.
pause
