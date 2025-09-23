#!/usr/bin/env python3
"""
Advanced Background Removal Script for Dreamweaver Logos

This script uses multiple techniques to aggressively remove white backgrounds:
1. Multiple threshold levels
2. Edge detection
3. Color-based masking
4. Morphological operations
"""

import os
import sys
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
import numpy as np
from PIL import ImageChops
import argparse


def remove_background_advanced(image, threshold=150):
    """
    Advanced background removal using multiple techniques.
    """
    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Get image data as numpy array for processing
    data = np.array(image)

    # Method 1: Simple threshold
    # Create mask for white/light pixels
    white_mask = (data[:, :, 0] > threshold) & (data[:, :, 1] > threshold) & (data[:, :, 2] > threshold)

    # Method 2: Edge detection to preserve edges
    gray = image.convert('L')
    edges = gray.filter(ImageFilter.FIND_EDGES)
    edge_data = np.array(edges)
    edge_mask = edge_data > 30  # Pixels near edges

    # Method 3: Color distance from pure white
    white = np.array([255, 255, 255])
    color_distances = np.sqrt(np.sum((data[:, :, :3] - white) ** 2, axis=2))
    color_mask = color_distances < (255 - threshold) * 1.5

    # Combine masks - keep pixels that are NOT white AND (near edges OR far from white)
    final_mask = ~white_mask & (edge_mask | ~color_mask)

    # Apply the mask
    data[:, :, 3] = np.where(final_mask, data[:, :, 3], 0)

    return Image.fromarray(data, 'RGBA')


def remove_background_aggressive(image, threshold=120):
    """
    Very aggressive background removal.
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    data = image.getdata()
    new_data = []

    for item in data:
        r, g, b, a = item

        # Very aggressive white detection
        if r > threshold and g > threshold and b > threshold:
            # Check if it's close to white
            if abs(r - g) < 20 and abs(g - b) < 20 and abs(r - b) < 20:
                new_data.append((255, 255, 255, 0))  # Transparent
            else:
                new_data.append(item)
        else:
            new_data.append(item)

    image.putdata(new_data)
    return image


def remove_background_ultra_aggressive(image):
    """
    Ultra aggressive background removal - removes anything that looks like background.
    """
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Convert to numpy for processing
    data = np.array(image)

    # Find the most common color (likely background)
    pixels = data.reshape(-1, 4)
    unique_colors, counts = np.unique(pixels, axis=0, return_counts=True)

    # Get the most common color
    most_common_color = unique_colors[np.argmax(counts)]

    # Create mask for pixels similar to the most common color
    tolerance = 30
    mask = np.all(np.abs(data[:, :, :3] - most_common_color[:3]) < tolerance, axis=2)

    # Make those pixels transparent
    data[mask, 3] = 0

    return Image.fromarray(data, 'RGBA')


def process_image_advanced(input_path, output_path=None, method='aggressive'):
    """
    Process image with advanced background removal.
    """
    try:
        print(f"Processing: {input_path}")
        image = Image.open(input_path)
        original_size = image.size
        print(f"Original size: {original_size}")

        # Apply different methods based on choice
        if method == 'aggressive':
            print("Using aggressive background removal...")
            image = remove_background_aggressive(image, threshold=120)
        elif method == 'ultra':
            print("Using ultra aggressive background removal...")
            image = remove_background_ultra_aggressive(image)
        else:
            print("Using advanced background removal...")
            image = remove_background_advanced(image, threshold=120)

        # Trim whitespace
        print("Trimming whitespace...")
        bbox = image.getbbox()
        if bbox:
            image = image.crop(bbox)
            new_size = image.size
            print(f"New size after trimming: {new_size}")

        # Determine output path
        if output_path is None:
            output_path = input_path

        # Save with maximum compression and transparency
        image.save(output_path, 'PNG', optimize=True, compress_level=9)
        print(f"Saved processed image: {output_path}")

        return True

    except Exception as e:
        print(f"Error processing {input_path}: {str(e)}")
        return False


def main():
    """Main function to process images with advanced background removal."""
    parser = argparse.ArgumentParser(description='Advanced background removal for Dreamweaver logos')
    parser.add_argument('--input-dir', default='frontend/public',
                       help='Directory containing images')
    parser.add_argument('--method', choices=['aggressive', 'ultra', 'advanced'],
                       default='aggressive', help='Background removal method')
    parser.add_argument('--files', nargs='+',
                       default=['dreamweaver.PNG', 'title.PNG'],
                       help='Specific files to process')

    args = parser.parse_args()

    if not os.path.exists(args.input_dir):
        print(f"Error: Input directory '{args.input_dir}' not found.")
        return 1

    print("=" * 60)
    print("Advanced Background Removal Script")
    print("=" * 60)
    print(f"Processing {len(args.files)} files from: {args.input_dir}")
    print(f"Method: {args.method}")
    print("=" * 60)

    success_count = 0

    for filename in args.files:
        input_path = os.path.join(args.input_dir, filename)

        if process_image_advanced(input_path, method=args.method):
            success_count += 1
        print("-" * 40)

    print("=" * 60)
    print(f"Processing complete: {success_count}/{len(args.files)} files processed successfully")

    if success_count == len(args.files):
        print("✅ All images processed successfully!")
        return 0
    else:
        print("❌ Some images failed to process.")
        return 1


if __name__ == "__main__":
    sys.exit(main())

