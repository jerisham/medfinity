"""
Google Gen AI SDK client for Medfinity.
Uses the new google-genai package.
"""
import os
import json
from google import genai
from google.genai import types
from django.conf import settings

class GeminiClient:
    """Wrapper for Google Gen AI SDK interactions."""

    def __init__(self, api_key=None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        if not self.api_key or self.api_key == 'your-gemini-api-key-here':
            self.is_mock = True
            self.client = None
        else:
            self.is_mock = False
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception:
                self.is_mock = True
                self.client = None
        # Default model
        self.model = 'gemini-2.0-flash'

    def generate_text(self, prompt, system_instruction=None, temperature=0.7, max_tokens=2048):
        """Generate text from a prompt."""
        if self.is_mock:
            if "rank" in prompt.lower() or "Suitability" in prompt or "doctors" in prompt:
                ranked = [
                    {"rank": 1, "doctor_name": "Doctor 1", "specialty": "General Medicine", "match_score": 95, "reasoning": "Excellent match for general symptoms. (Mock AI)"},
                    {"rank": 2, "doctor_name": "Lak_amal", "specialty": "Cardiology", "match_score": 60, "reasoning": "Specialist in cardiovascular concerns. (Mock AI)"}
                ]
                return {
                    'text': json.dumps(ranked),
                    'success': True
                }
            return {
                'text': "Hi! I'm Medfinity AI. (Mock mode active because GEMINI_API_KEY is not set) Based on your query, here is some general advice: please ensure you seek professional medical guidance. If you are experiencing symptoms like chest pain or difficulty breathing, go to the nearest emergency room immediately.",
                'success': True
            }

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
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
        if self.is_mock:
            last_msg = messages[-1]['content'] if messages else ""
            return {
                'text': f"Hello! This is Medfinity's AI Health Assistant. (Mock mode active because GEMINI_API_KEY is not configured). Regarding your message '{last_msg}': For general health concerns, rest, hydration, and a clean diet are recommended. Please consult a qualified doctor for actual medical treatment or diagnosis.",
                'success': True
            }

        try:
            # Map role names ('assistant' -> 'model') and build the Content history
            history_contents = []
            for msg in messages[:-1]:
                role = 'model' if msg['role'] == 'assistant' else 'user'
                history_contents.append(
                    types.Content(
                        role=role,
                        parts=[types.Part(text=msg['content'])]
                    )
                )

            chat = self.client.chats.create(
                model=self.model,
                history=history_contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=temperature,
                )
            )

            last_message = messages[-1]['content'] if messages else ""
            response = chat.send_message(last_message)

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
        if self.is_mock:
            return {
                'text': "Mock image analysis: A general prescription or medical report. (Mock AI)",
                'success': True
            }

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
        if self.is_mock:
            props = response_schema.get("properties", {})
            if "conditions" in props:
                data = {
                    "conditions": [
                        {"name": "Common Cold", "likelihood": "High", "confidence": 85},
                        {"name": "Influenza", "likelihood": "Medium", "confidence": 55},
                        {"name": "Allergic Rhinitis", "likelihood": "Low", "confidence": 30}
                    ],
                    "recommended_specialty": "General Physician",
                    "emergency": "NO",
                    "advice": "Drink warm fluids, rest, and keep warm. Use saline drops for nasal congestion. (Mock AI Response)",
                    "see_doctor_when": "If you have difficulty breathing, a high fever for >3 days, or symptoms lasting over 10 days.",
                    "disclaimer": "This is a mock response because GEMINI_API_KEY is not configured in .env."
                }
            elif "primary_specialty" in props:
                data = {
                    "primary_specialty": "General Physician",
                    "secondary_specialties": ["Pulmonologist", "ENT Specialist"],
                    "reasoning": "Your symptoms seem general. A general practitioner can do a primary evaluation and refer you if needed. (Mock AI Response)",
                    "expected_examination": "A physical exam, blood pressure check, and stethoscope chest auscultation."
                }
            elif "questions_to_ask" in props:
                data = {
                    "questions_to_ask": [
                        "What is the most likely cause of my symptoms?",
                        "Do I need any diagnostic tests?",
                        "Are there any side effects to the medication?"
                    ],
                    "info_to_prepare": [
                        "Timeline of symptoms",
                        "List of current medications",
                        "Family history of chronic diseases"
                    ],
                    "what_to_expect": "A verbal medical history review followed by standard diagnostic examinations.",
                    "documents_to_bring": ["Previous blood test results", "Any active prescriptions"],
                    "how_to_describe": "State when the symptoms started, how they feel, and what makes them better or worse."
                }
            elif "questions" in props:
                data = {
                    "questions": [
                        "Do you have a fever or chills?",
                        "How long have you had these symptoms?",
                        "Does anything make the pain better or worse?",
                        "Are you currently taking any prescription drugs?",
                        "Have you traveled recently?"
                    ]
                }
            else:
                data = {"response": "Mock structured response because GEMINI_API_KEY is not set."}
            return {
                'text': json.dumps(data),
                'success': True
            }

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
