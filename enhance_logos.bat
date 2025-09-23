@echo off
echo Installing required dependencies...
pip install -r requirements.txt

echo.
echo Running logo enhancement script...
python enhance_logos.py

echo.
echo Press any key to exit...
pause > nul

