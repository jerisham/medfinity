"""
AI Symptom Checker using Gemini API.
"""
from .gemini_client import GeminiClient

class SymptomChecker:
    """Check symptoms and suggest possible conditions and doctors."""

    SYSTEM_PROMPT = """You are a medical AI assistant. Your role is to help users understand their symptoms 
    and provide general health information. You MUST:
    1. Always include a disclaimer that this is not a substitute for professional medical advice
    2. Suggest possible conditions based on symptoms (but never diagnose definitively)
    3. Recommend appropriate medical specialties to consult
    4. Suggest when to seek emergency care
    5. Provide general health tips related to the symptoms

    Be empathetic, clear, and cautious. Never provide specific medication recommendations."""

    def __init__(self):
        self.gemini = GeminiClient()

    def check_symptoms(self, symptoms, age=None, gender=None, duration=None):
        """
        Check symptoms and return analysis.

        Args:
            symptoms: List or string of symptoms
            age: Patient age
            gender: Patient gender
            duration: How long symptoms have been present
        """
        if isinstance(symptoms, list):
            symptoms_text = ', '.join(symptoms)
        else:
            symptoms_text = symptoms

        prompt = f"""A patient reports the following symptoms: {symptoms_text}

        Additional information:
        - Age: {age or 'Not provided'}
        - Gender: {gender or 'Not provided'}
        - Duration: {duration or 'Not provided'}

        Please provide:
        1. Possible conditions (ranked by likelihood, with confidence percentages)
        2. Recommended medical specialty to consult
        3. Whether this requires emergency care (YES/NO/MAYBE)
        4. General advice and next steps
        5. When to see a doctor immediately

        Format as JSON with keys: conditions, recommended_specialty, emergency, advice, see_doctor_when"""

        from google.genai import types

        response_schema = {
            "type": "object",
            "properties": {
                "conditions": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "name": {"type": "string"},
                            "likelihood": {"type": "string"},
                            "confidence": {"type": "number"}
                        }
                    }
                },
                "recommended_specialty": {"type": "string"},
                "emergency": {"type": "string"},
                "advice": {"type": "string"},
                "see_doctor_when": {"type": "string"},
                "disclaimer": {"type": "string"}
            }
        }

        return self.gemini.generate_structured(
            prompt=prompt,
            response_schema=response_schema,
            system_instruction=self.SYSTEM_PROMPT
        )

    def get_follow_up_questions(self, symptoms):
        """Generate follow-up questions to better understand symptoms."""
        symptoms_text = ', '.join(symptoms) if isinstance(symptoms, list) else symptoms

        prompt = f"""Based on these symptoms: {symptoms_text}

        Generate 5 important follow-up questions a doctor would ask to better understand the patient's condition.
        Return as a JSON array of strings."""

        response_schema = {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            }
        }

        return self.gemini.generate_structured(
            prompt=prompt,
            response_schema=response_schema,
            system_instruction=self.SYSTEM_PROMPT
        )
