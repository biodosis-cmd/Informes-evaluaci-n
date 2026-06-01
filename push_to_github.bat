@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
cd /d "F:\ANTIGRAVITY\PROYECTOS\Retroalimentación Evaluación\informe-evaluacion"

echo Configurando identidad Git...
%GIT% config --global user.name "biodosis-cmd"
%GIT% config --global user.email "biodosis@gmail.com"

echo Creando commit inicial...
%GIT% commit -m "feat: initial commit - Informe Evaluacion v1.0"

echo Subiendo a GitHub...
%GIT% push -u origin main

echo.
echo LISTO. Revisa el resultado arriba.
pause
