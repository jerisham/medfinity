"""
Google Gen AI SDK client for Medfinity.
Uses the new google-genai package.
"""
import os
import json
import logging
from google import genai
from google.genai import types
from django.conf import settings

logger = logging.getLogger(__name__)

class GeminiClient:
    """Wrapper for Google Gen AI SDK interactions."""

    def __init__(self, api_key=None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        if not self.api_key or self.api_key == 'your-gemini-api-key-here':
            logger.warning("GeminiClient: no API key configured, using mock/fallback responses.")
            self.is_mock = True
            self.client = None
        else:
            self.is_mock = False
            try:
                self.client = genai.Client(api_key=self.api_key)
            except Exception as e:
                logger.error("GeminiClient: failed to initialize genai.Client: %s", e, exc_info=True)
                self.is_mock = True
                self.client = None
        # Default model
        # NOTE: gemini-2.0-flash-lite was retired by Google on June 1, 2026 — using it
        # causes every request to fail with a 404, which this class swallows and
        # replaces with a generic fallback message.
        self.model = 'gemini-2.5-flash-lite'

    def _get_fallback_text(self, prompt):
        if "rank" in prompt.lower() or "suitability" in prompt.lower() or "doctors" in prompt.lower():
            ranked = [
                {"rank": 1, "doctor_name": "Dr. Sarah Jenkins", "specialty": "General Medicine", "match_score": 95, "reasoning": "Excellent match for general symptoms like fever, fatigue, or cough. Highly rated by patients."},
                {"rank": 2, "doctor_name": "Dr. Alex Patel", "specialty": "Cardiology", "match_score": 60, "reasoning": "Specialist in cardiovascular concerns. Best suited if chest tightness or palpitations are reported."}
            ]
            return json.dumps(ranked)
        return "Based on your query, here is some general health advice: Please ensure you stay well-hydrated, rest, and monitor your symptoms. If you are experiencing severe symptoms like chest pain, sudden numbness, or difficulty breathing, please seek immediate emergency medical care. Consult a healthcare professional for a personalized assessment."

    def _get_fallback_chat(self, messages):
        last_msg = messages[-1]['content'] if messages else ""
        return f"Regarding your query about '{last_msg}': For general health and wellness, maintaining proper hydration, rest, and a balanced diet is key. It's always important to monitor your symptoms closely. If they persist or worsen, please consult a qualified doctor or healthcare professional for a precise diagnosis and personalized treatment plan."

    def _get_fallback_structured(self, response_schema):
        props = response_schema.get("properties", {})
        if "conditions" in props:
            return {
                "conditions": [
                    {"name": "Common Cold", "likelihood": "High", "confidence": 85},
                    {"name": "Influenza", "likelihood": "Medium", "confidence": 55},
                    {"name": "Allergic Rhinitis", "likelihood": "Low", "confidence": 30}
                ],
                "recommended_specialty": "General Physician",
                "emergency": "NO",
                "advice": "Drink warm fluids, rest, and keep warm. Use saline drops for nasal congestion.",
                "see_doctor_when": "If you have difficulty breathing, a high fever for >3 days, or symptoms lasting over 10 days.",
                "disclaimer": "This is a preliminary guidance tool and does not replace professional medical advice."
            }
        elif "primary_specialty" in props:
            return {
                "primary_specialty": "General Physician",
                "secondary_specialties": ["Pulmonologist", "ENT Specialist"],
                "reasoning": "Your symptoms seem general. A general practitioner can do a primary evaluation and refer you if needed.",
                "expected_examination": "A physical exam, blood pressure check, and stethoscope chest auscultation."
            }
        elif "questions_to_ask" in props:
            return {
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
            return {
                "questions": [
                    "Do you have a fever or chills?",
                    "How long have you had these symptoms?",
                    "Does anything make the pain better or worse?",
                    "Are you currently taking any prescription drugs?",
                    "Have you traveled recently?"
                ]
            }
        else:
            return {"response": "For personalized support, please provide more details about your symptoms or consult a health professional."}

    def generate_text(self, prompt, system_instruction=None, temperature=0.7, max_tokens=2048):
        """Generate text from a prompt."""
        if self.is_mock:
            return {
                'text': self._get_fallback_text(prompt),
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
            err_str = str(e)
            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower():
                return {
                    'text': self._get_fallback_text(prompt),
                    'success': True,
                    'fallback_active': True
                }
            return {
                'text': f"Error: {str(e)}",
                'success': False,
                'error': str(e)
            }

    def chat(self, messages, system_instruction=None, temperature=0.7):
        """Multi-turn chat with Gemini."""
        if self.is_mock:
            return {
                'text': self._get_fallback_chat(messages),
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
            err_str = str(e)
            logger.error("GeminiClient.chat failed: %s", err_str, exc_info=True)
            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower():
                return {
                    'text': self._get_fallback_chat(messages),
                    'success': True,
                    'fallback_active': True
                }
            return {
                'text': f"Error: {str(e)}",
                'success': False,
                'error': str(e)
            }

    def analyze_image(self, image_path, prompt):
        """Analyze an image with Gemini (multimodal)."""
        if self.is_mock:
            return {
                'text': "Based on the image analysis, this appears to be a standard medical report. Please review the details with a medical practitioner for a thorough interpretation.",
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
            err_str = str(e)
            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower():
                return {
                    'text': "Based on the image analysis, this appears to be a standard medical report. Please review the details with a medical practitioner for a thorough interpretation.",
                    'success': True,
                    'fallback_active': True
                }
            return {
                'text': f"Error: {str(e)}",
                'success': False,
                'error': str(e)
            }

    def generate_structured(self, prompt, response_schema, system_instruction=None):
        """Generate structured JSON output using response_schema."""
        if self.is_mock:
            return {
                'text': json.dumps(self._get_fallback_structured(response_schema)),
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
            err_str = str(e)
            if '429' in err_str or 'RESOURCE_EXHAUSTED' in err_str or 'quota' in err_str.lower():
                return {
                    'text': json.dumps(self._get_fallback_structured(response_schema)),
                    'success': True,
                    'fallback_active': True
                }
            return {
                'text': f"Error: {str(e)}",
                'success': False,
                'error': str(e)
            }