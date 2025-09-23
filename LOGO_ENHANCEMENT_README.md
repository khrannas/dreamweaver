# Dreamweaver Logo Enhancement Script

This script enhances your Dreamweaver logo images by removing white backgrounds, trimming whitespace, and improving image quality.

## Features

- ✅ **White Background Removal**: Makes white backgrounds transparent
- ✅ **Whitespace Trimming**: Removes unnecessary whitespace around images
- ✅ **Image Enhancement**: Improves contrast and sharpness
- ✅ **Backup Creation**: Automatically creates backups of original files
- ✅ **Batch Processing**: Processes multiple images at once
- ✅ **Configurable**: Customizable thresholds and options

## Quick Start

### Option 1: Use the Batch Scripts (Recommended)

**Windows:**
```bash
enhance_logos.bat
```

**Linux/Mac:**
```bash
chmod +x enhance_logos.sh
./enhance_logos.sh
```

### Option 2: Manual Installation

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the script:**
   ```bash
   python enhance_logos.py
   ```

## Usage Examples

### Basic Usage (Processes both dreamweaver.PNG and title.PNG)
```bash
python enhance_logos.py
```

### Process Specific Files
```bash
python enhance_logos.py --files dreamweaver.PNG title.PNG
```

### Skip Background Removal
```bash
python enhance_logos.py --no-background-removal
```

### Skip Whitespace Trimming
```bash
python enhance_logos.py --no-trim
```

### Skip Image Enhancement
```bash
python enhance_logos.py --no-enhance
```

### Custom Background Threshold
```bash
python enhance_logos.py --threshold 220
```

### Process Different Directory
```bash
python enhance_logos.py --input-dir path/to/your/images
```

### No Backup Creation
```bash
python enhance_logos.py --no-backup
```

## Command Line Options

| Option | Description | Default |
|--------|-------------|---------|
| `--input-dir` | Directory containing images | `frontend/public` |
| `--files` | Specific files to process | `['dreamweaver.PNG', 'title.PNG']` |
| `--no-background-removal` | Skip white background removal | `False` |
| `--no-trim` | Skip whitespace trimming | `False` |
| `--no-enhance` | Skip image enhancement | `False` |
| `--no-backup` | Skip creating backup files | `False` |
| `--threshold` | White background detection threshold (0-255) | `240` |

## What the Script Does

### 1. White Background Removal
- Detects white or near-white pixels (configurable threshold)
- Makes them transparent (alpha = 0)
- Preserves all other colors and details

### 2. Whitespace Trimming
- Finds the bounding box of non-transparent pixels
- Crops the image to remove unnecessary whitespace
- Reduces file size and improves visual appearance

### 3. Image Enhancement
- Slightly increases contrast (1.1x)
- Slightly increases sharpness (1.1x)
- Maintains natural appearance while improving quality

### 4. Backup Creation
- Creates `_backup.PNG` versions of original files
- Ensures you can restore originals if needed
- Only creates backups if they don't already exist

## Output

The script will:
- Process `frontend/public/dreamweaver.PNG`
- Process `frontend/public/title.PNG`
- Create backups: `dreamweaver_backup.PNG` and `title_backup.PNG`
- Overwrite the original files with enhanced versions

## Example Output

```
============================================================
Dreamweaver Logo Enhancement Script
============================================================
Processing 2 files from: frontend/public
Background removal: Enabled
Whitespace trimming: Enabled
Image enhancement: Enabled
Create backups: Enabled
Background threshold: 240
============================================================
Created backup: frontend/public/dreamweaver_backup.PNG
Processing: frontend/public/dreamweaver.PNG
Original size: (800, 600)
Removing white background...
Trimming whitespace...
New size after trimming: (750, 550)
Enhancing image quality...
Saved processed image: frontend/public/dreamweaver.PNG
----------------------------------------
Created backup: frontend/public/title_backup.PNG
Processing: frontend/public/title.PNG
Original size: (1200, 400)
Removing white background...
Trimming whitespace...
New size after trimming: (1100, 350)
Enhancing image quality...
Saved processed image: frontend/public/title.PNG
----------------------------------------
============================================================
Processing complete: 2/2 files processed successfully
✅ All images processed successfully!
```

## Troubleshooting

### "Input file not found"
- Ensure the images exist in `frontend/public/`
- Check file names are exactly `dreamweaver.PNG` and `title.PNG`

### "PIL not found" or "Pillow not found"
- Run: `pip install -r requirements.txt`
- Or: `pip install Pillow`

### Images look too dark/light after processing
- Adjust the threshold: `--threshold 200` (lower = more sensitive)
- Or skip enhancement: `--no-enhance`

### Want to restore original images
- The script creates `_backup.PNG` files
- Simply rename them back to the original names

## Requirements

- Python 3.6+
- Pillow (PIL) library
- Images in PNG format

## Files Created

- `enhance_logos.py` - Main script
- `requirements.txt` - Python dependencies
- `enhance_logos.bat` - Windows batch script
- `enhance_logos.sh` - Linux/Mac shell script
- `LOGO_ENHANCEMENT_README.md` - This documentation

