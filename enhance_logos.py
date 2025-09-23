#!/usr/bin/env python3
"""
Dreamweaver Logo Enhancement Script

This script processes PNG images to:
1. Remove white backgrounds (make them transparent)
2. Trim whitespace around the images
3. Enhance image quality (optional)
4. Save processed images

Usage: python enhance_logos.py
"""

import os
import sys
from PIL import Image, ImageEnhance, ImageFilter
import argparse


def remove_white_background(image, threshold=240):
    """
    Remove white background from image by making it transparent.

    Args:
        image: PIL Image object
        threshold: RGB threshold for white detection (0-255)

    Returns:
        PIL Image with transparent background
    """
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Get image data
    data = image.getdata()

    # Create new data with transparent white pixels
    new_data = []
    for item in data:
        # If pixel is white (or near white), make it transparent
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            new_data.append((255, 255, 255, 0))  # Transparent
        else:
            new_data.append(item)

    # Update image data
    image.putdata(new_data)
    return image


def trim_whitespace(image):
    """
    Trim whitespace around the image.

    Args:
        image: PIL Image object

    Returns:
        PIL Image with trimmed whitespace
    """
    # Get the bounding box of non-transparent pixels
    bbox = image.getbbox()

    if bbox:
        # Crop to the bounding box
        return image.crop(bbox)
    else:
        # If no bounding box found, return original
        return image


def enhance_image(image, enhance_contrast=True, enhance_sharpness=True):
    """
    Enhance image quality.

    Args:
        image: PIL Image object
        enhance_contrast: Whether to enhance contrast
        enhance_sharpness: Whether to enhance sharpness

    Returns:
        Enhanced PIL Image
    """
    enhanced = image.copy()

    if enhance_contrast:
        # Enhance contrast slightly
        contrast_enhancer = ImageEnhance.Contrast(enhanced)
        enhanced = contrast_enhancer.enhance(1.1)

    if enhance_sharpness:
        # Enhance sharpness slightly
        sharpness_enhancer = ImageEnhance.Sharpness(enhanced)
        enhanced = sharpness_enhancer.enhance(1.1)

    return enhanced


def process_image(input_path, output_path=None, remove_bg=True, trim=True, enhance=True,
                 bg_threshold=240, create_backup=True):
    """
    Process a single image with all enhancements.

    Args:
        input_path: Path to input image
        output_path: Path to output image (if None, overwrites input)
        remove_bg: Whether to remove white background
        trim: Whether to trim whitespace
        enhance: Whether to enhance image quality
        bg_threshold: Threshold for white background detection
        create_backup: Whether to create backup of original

    Returns:
        Success status
    """
    try:
        # Check if input file exists
        if not os.path.exists(input_path):
            print(f"Error: Input file '{input_path}' not found.")
            return False

        # Create backup if requested
        if create_backup and output_path is None:
            backup_path = input_path.replace('.PNG', '_backup.PNG').replace('.png', '_backup.png')
            if not os.path.exists(backup_path):
                backup_image = Image.open(input_path)
                backup_image.save(backup_path)
                print(f"Created backup: {backup_path}")

        # Load image
        print(f"Processing: {input_path}")
        image = Image.open(input_path)
        original_size = image.size
        print(f"Original size: {original_size}")

        # Remove white background
        if remove_bg:
            print("Removing white background...")
            image = remove_white_background(image, bg_threshold)

        # Trim whitespace
        if trim:
            print("Trimming whitespace...")
            image = trim_whitespace(image)
            new_size = image.size
            print(f"New size after trimming: {new_size}")

        # Enhance image
        if enhance:
            print("Enhancing image quality...")
            image = enhance_image(image)

        # Determine output path
        if output_path is None:
            output_path = input_path

        # Save processed image
        image.save(output_path, 'PNG', optimize=True)
        print(f"Saved processed image: {output_path}")

        return True

    except Exception as e:
        print(f"Error processing {input_path}: {str(e)}")
        return False


def main():
    """Main function to process Dreamweaver logo images."""
    parser = argparse.ArgumentParser(description='Enhance Dreamweaver logo images')
    parser.add_argument('--input-dir', default='frontend/public',
                       help='Directory containing images (default: frontend/public)')
    parser.add_argument('--no-background-removal', action='store_true',
                       help='Skip white background removal')
    parser.add_argument('--no-trim', action='store_true',
                       help='Skip whitespace trimming')
    parser.add_argument('--no-enhance', action='store_true',
                       help='Skip image enhancement')
    parser.add_argument('--no-backup', action='store_true',
                       help='Skip creating backup files')
    parser.add_argument('--threshold', type=int, default=240,
                       help='White background detection threshold (0-255, default: 240)')
    parser.add_argument('--files', nargs='+',
                       default=['dreamweaver.PNG', 'title.PNG'],
                       help='Specific files to process')

    args = parser.parse_args()

    # Check if input directory exists
    if not os.path.exists(args.input_dir):
        print(f"Error: Input directory '{args.input_dir}' not found.")
        return 1

    # Process each specified file
    success_count = 0
    total_files = len(args.files)

    print("=" * 60)
    print("Dreamweaver Logo Enhancement Script")
    print("=" * 60)
    print(f"Processing {total_files} files from: {args.input_dir}")
    print(f"Background removal: {'Disabled' if args.no_background_removal else 'Enabled'}")
    print(f"Whitespace trimming: {'Disabled' if args.no_trim else 'Enabled'}")
    print(f"Image enhancement: {'Disabled' if args.no_enhance else 'Enabled'}")
    print(f"Create backups: {'Disabled' if args.no_backup else 'Enabled'}")
    print(f"Background threshold: {args.threshold}")
    print("=" * 60)

    for filename in args.files:
        input_path = os.path.join(args.input_dir, filename)

        if process_image(
            input_path,
            remove_bg=not args.no_background_removal,
            trim=not args.no_trim,
            enhance=not args.no_enhance,
            bg_threshold=args.threshold,
            create_backup=not args.no_backup
        ):
            success_count += 1
        print("-" * 40)

    print("=" * 60)
    print(f"Processing complete: {success_count}/{total_files} files processed successfully")

    if success_count == total_files:
        print("✅ All images processed successfully!")
        return 0
    else:
        print("❌ Some images failed to process.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

