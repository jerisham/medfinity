"""
Google Gen AI SDK client for Medfinity.
Uses the new google-genai package (not the deprecated google-generativeai).
Install: pip install google-genai
"""
import os
from google import genai
from google.genai import types
from django.conf import settings

class GeminiClient:
    """Wrapper for Google Gen AI SDK interactions."""

    def __init__(self, api_key=None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        if not self.api_key:
            raise ValueError("Gemini API key is required. Set GEMINI_API_KEY in .env")
        self.client = genai.Client(api_key=self.api_key)
        # Default model - use gemini-3.5-flash (current stable as of June 2026)
        self.model = 'gemini-3.5-flash'

    def generate_text(self, prompt, system_instruction=None, temperature=0.7, max_tokens=2048):
        """Generate text from a prompt."""
        try:
            contents = []
            if system_instruction:
                contents.append(types.Content(
                    role='system',
                    parts=[types.Part(text=system_instruction)]
                ))
            contents.append(types.Content(
                role='user',
                parts=[types.Part(text=prompt)]
            ))

            response = self.client.models.generate_content(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig(
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )
            return {
                'text': response.text,
                'success': True
            }
        except Exception as e:
            return {
                'text': f"Error: {str(e)}",
                'success': False,
                'error': str(e)
            }

    def chat(self, messages, system_instruction=None, temperature=0.7):
        """Multi-turn chat with Gemini."""
        try:
            chat = self.client.chats.create(
                model=self.model,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=temperature,
                )
            )

            for msg in messages:
                if msg['role'] == 'user':
                    response = chat.send_message(msg['content'])

            return {
                'text': response.text,
                'success': True
            }
        except Exception as e:
            return {
                'text': f"Error: {str(e)}",
                'success': False,
                'error': str(e)
            }

    def analyze_image(self, image_path, prompt):
        """Analyze an image with Gemini (multimodal)."""
        try:
            with open(image_path, 'rb') as f:
                image_data = f.read()

            response = self.client.models.generate_content(
                model=self.model,
                contents=[
                    types.Content(
                        role='user',
                        parts=[
                            types.Part(text=prompt),
                            types.Part(inline_data=types.Blob(data=image_data, mime_type='image/jpeg'))
                        ]
                    )
                ]
            )
            return {
                'text': response.text,
                'success': True
            }
        except Exception as e:
            return {
                'text': f"Error: {str(e)}",
                'success': False,
                'error': str(e)
            }

    def generate_structured(self, prompt, response_schema, system_instruction=None):
        """Generate structured JSON output using response_schema."""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[types.Content(
                    role='user',
                    parts=[types.Part(text=prompt)]
                )],
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type='application/json',
                    response_schema=response_schema,
                )
            )
            return {
                'text': response.text,
                'success': True
            }
        except Exception as e:
            return {
                'text': f"Error: {str(e)}",
                'success': False,
                'error': str(e)
            }
