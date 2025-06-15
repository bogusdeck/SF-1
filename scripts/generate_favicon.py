from PIL import Image
import cairosvg
import os

def generate_favicon():
    # Create output directory if it doesn't exist
    os.makedirs("static", exist_ok=True)
    
    # Convert SVG to PNG
    png_path = "static/favicon.png"
    svg_path = "static/images/logo.svg"
    
    # Convert SVG to PNG using cairosvg
    cairosvg.svg2png(url=svg_path, write_to=png_path, output_width=32, output_height=32)
    
    # Convert PNG to ICO
    img = Image.open(png_path)
    ico_path = "static/favicon.ico"
    img.save(ico_path, format='ICO')
    
    # Clean up temporary PNG
    os.remove(png_path)
    
    print(f"Favicon generated at {ico_path}")

if __name__ == "__main__":
    generate_favicon()
