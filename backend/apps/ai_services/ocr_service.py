"""
OCR Service using Tesseract + Gemini for prescription extraction.
"""
from PIL import Image
import re
from django.conf import settings
from .gemini_client import GeminiClient

class OCRService:
    """Extract text from prescription images and parse medicines."""

    def __init__(self):
        self.gemini = GeminiClient()

    def extract_text(self, image_path):
        """Extract text using Tesseract OCR."""
        try:
            import pytesseract
        except Exception:
            return {'text': 'OCR unavailable on this server.', 'confidence': 0.0, 'word_count': 0, 'medicines': []}
        try:
            image = Image.open(image_path)
            text = pytesseract.image_to_string(image)

            # Calculate confidence (rough estimate based on word count)
            words = text.split()
            confidence = min(95.0, len(words) * 2.0) if words else 0.0

            return {
                'text': text,
                'confidence': round(confidence, 2),
                'word_count': len(words)
            }
        except Exception as e:
            return {
                'text': f"OCR Error: {str(e)}",
                'confidence': 0.0,
                'word_count': 0
            }

    def extract_text_from_image(self, image_file):
        """Extract text from an uploaded image file (InMemoryUploadedFile)."""
        try:
            import pytesseract
        except Exception:
            return {'text': 'OCR unavailable on this server.', 'confidence': 0.0, 'word_count': 0, 'medicines': []}
        try:
            image = Image.open(image_file)
            text = pytesseract.image_to_string(image)

            # Parse medicines using regex patterns
            medicines = self._parse_medicines(text)

            words = text.split()
            confidence = min(95.0, len(words) * 2.0) if words else 0.0

            return {
                'text': text,
                'confidence': round(confidence, 2),
                'medicines': medicines,
                'word_count': len(words)
            }
        except Exception as e:
            return {
                'text': f"OCR Error: {str(e)}",
                'confidence': 0.0,
                'medicines': [],
                'word_count': 0
            }

    def extract_with_gemini(self, image_path):
        """Use Gemini for advanced prescription parsing."""
        prompt = """Analyze this prescription image and extract the following information in a structured format:
        - Patient name
        - Doctor name
        - Date
        - Medicines (name, dosage, frequency, duration)
        - Diagnosis
        - Special instructions

        Return as JSON."""

        return self.gemini.analyze_image(image_path, prompt)

    def _parse_medicines(self, text):
        """Parse medicine names and dosages from OCR text."""
        medicines = []

        # Common patterns for medicine extraction
        lines = text.split('\n')
        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Look for patterns like: Medicine Name - 1 tablet - 2x daily - 7 days
            parts = re.split(r'[-–—\s]+', line)
            if len(parts) >= 2 and len(parts[0]) > 2:
                medicine = {
                    'name': parts[0].strip(),
                    'dosage': parts[1].strip() if len(parts) > 1 else '',
                    'frequency': parts[2].strip() if len(parts) > 2 else '',
                    'duration': parts[3].strip() if len(parts) > 3 else ''
                }
                medicines.append(medicine)

        return medicines
