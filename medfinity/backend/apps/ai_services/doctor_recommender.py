"""
Doctor Recommendation Engine using Gemini API.
"""
from .gemini_client import GeminiClient

class DoctorRecommender:
    """Recommend doctors based on symptoms, specialty, and other factors."""

    SYSTEM_PROMPT = """You are a medical referral assistant. Help patients find the right doctor 
    based on their symptoms and needs. Consider specialty, experience, and patient preferences."""

    def __init__(self):
        self.gemini = GeminiClient()

    def recommend_specialty(self, symptoms):
        """Recommend medical specialty based on symptoms."""
        symptoms_text = ', '.join(symptoms) if isinstance(symptoms, list) else symptoms

        prompt = f"""Based on these symptoms: {symptoms_text}

        Recommend the most appropriate medical specialty. Consider:
        1. Primary specialty (most likely needed)
        2. Secondary specialties (might also be relevant)
        3. Why this specialty is recommended
        4. What the specialist will likely do

        Return as JSON with keys: primary_specialty, secondary_specialties, reasoning, expected_examination"""

        response_schema = {
            "type": "object",
            "properties": {
                "primary_specialty": {"type": "string"},
                "secondary_specialties": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "reasoning": {"type": "string"},
                "expected_examination": {"type": "string"}
            }
        }

        return self.gemini.generate_structured(
            prompt=prompt,
            response_schema=response_schema,
            system_instruction=self.SYSTEM_PROMPT
        )

    def rank_doctors(self, symptoms, doctors_list):
        """
        Rank a list of doctors based on relevance to symptoms.

        Args:
            symptoms: Patient symptoms
            doctors_list: List of doctor dicts with name, specialty, experience, rating
        """
        symptoms_text = ', '.join(symptoms) if isinstance(symptoms, list) else symptoms
        doctors_text = "\n".join([
            f"- {d['name']}: {d['specialty']}, {d['experience']} years exp, Rating: {d['rating']}"
            for d in doctors_list
        ])

        prompt = f"""Patient symptoms: {symptoms_text}

        Available doctors:
        {doctors_text}

        Rank these doctors from most to least suitable for this patient. Consider:
        1. Specialty match with symptoms
        2. Experience level
        3. Patient ratings
        4. Overall fit

        Return as JSON array with keys: rank, doctor_name, specialty, match_score, reasoning"""

        return self.gemini.generate_text(
            prompt=prompt,
            system_instruction=self.SYSTEM_PROMPT
        )

    def get_consultation_prep(self, symptoms, specialty):
        """Get preparation tips for a consultation."""
        symptoms_text = ', '.join(symptoms) if isinstance(symptoms, list) else symptoms

        prompt = f"""A patient with symptoms ({symptoms_text}) is going to see a {specialty}.

        Provide:
        1. Questions the patient should ask the doctor
        2. Information the patient should prepare (medical history, current medications, etc.)
        3. What to expect during the consultation
        4. Documents to bring
        5. How to describe symptoms effectively

        Return as JSON with keys: questions_to_ask, info_to_prepare, what_to_expect, documents_to_bring, how_to_describe"""

        response_schema = {
            "type": "object",
            "properties": {
                "questions_to_ask": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "info_to_prepare": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "what_to_expect": {"type": "string"},
                "documents_to_bring": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "how_to_describe": {"type": "string"}
            }
        }

        return self.gemini.generate_structured(
            prompt=prompt,
            response_schema=response_schema,
            system_instruction=self.SYSTEM_PROMPT
        )
