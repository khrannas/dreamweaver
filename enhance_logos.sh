#!/bin/bash

echo "Installing required dependencies..."
pip install -r requirements.txt

echo ""
echo "Running logo enhancement script..."
python enhance_logos.py

echo ""
echo "Script completed. Press Enter to exit..."
read

