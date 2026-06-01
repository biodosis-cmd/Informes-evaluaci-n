@echo off
set GIT="C:\Program Files\Git\bin\git.exe"
cd /d "F:\ANTIGRAVITY\PROYECTOS\Retroalimentación Evaluación\informe-evaluacion"

echo Agregando cambios...
%GIT% add .

echo Creando commit...
%GIT% commit -m "feat: agrega fecha de evaluacion a cursos y reportes"

echo Subiendo a GitHub...
%GIT% push origin main

echo.
echo LISTO.
