import os
import sys

def process_images(directory):
    try:
        from PIL import Image
    except ImportError:
        print("Error: Pillow library not found. Please install it using 'pip install Pillow'")
        sys.exit(1)

    print(f"Scanning directory: {directory}")
    
    extensions = {'.png', '.jpg', '.jpeg'}
    count = 0
    
    for root, dirs, files in os.walk(directory):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in extensions:
                file_path = os.path.join(root, file)
                try:
                    with Image.open(file_path) as img:
                        width, height = img.size
                        new_width = width + (1 if width % 2 != 0 else 0)
                        new_height = height + (1 if height % 2 != 0 else 0)
                        
                        if new_width != width or new_height != height:
                            print(f"Processing {file}: {width}x{height} -> {new_width}x{new_height}")
                            
                            new_img = Image.new("RGBA", (new_width, new_height), (0, 0, 0, 0))
                            new_img.paste(img, (0, 0))
                            
                            # Preserve original format settings where possible, but convert simple RGB to RGBA if transparent pixel added could be issue for JPG. 
                            # Actually JPG doesn't support transparency, so for JPG we might need to stick to RGB or accept it will be saved as PNG if we want transparency.
                            # But requirement says "add transparent pixel". If it's JPG, we can't add transparent pixel without changing format to PNG.
                            # However, to start simple, we will save as PNG if transparency is needed, or just warn? 
                            # Let's assume user works with PNGs mostly for sprites. If JPG, we probably shouldn't convert to PNG automatically as it changes file extension references.
                            # If JPG needs to be even, we might just have to pad with black or similar, OR just skip transparency logic for JPG and just stretch? 
                            # Request says "add transparent pixel". This implies potential format change or it's applied on PNGs.
                            # Let's stick to simple padding. If format doesn't support alpha, it will save as black background for that pixel (PIL default).
                            
                            # Re-saving in place.
                            if img.format == 'JPEG':
                                # For JPEG, we can't save alpha. We just pad.
                                new_img_rgb = new_img.convert("RGB")
                                new_img_rgb.save(file_path, quality=95)
                            else:
                                new_img.save(file_path)
                            
                            count += 1
                except Exception as e:
                    print(f"Failed to process {file_path}: {e}")

    print(f"Done. Processed {count} images.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python make_images_even.py <directory>")
        sys.exit(1)
    
    target_dir = sys.argv[1]
    if not os.path.exists(target_dir):
        print(f"Directory not found: {target_dir}")
        sys.exit(1)
        
    process_images(target_dir)
