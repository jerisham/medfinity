"""
Medical Report Summarizer using Gemini API.
Converts medical jargon into simple, understandable language.
"""
from .gemini_client import GeminiClient

class ReportSummarizer:
    """Summarize medical reports in simple language."""

    SYSTEM_PROMPT = """You are a medical report translator. Your job is to convert complex medical reports 
    into simple, easy-to-understand language that a non-medical person can understand. 

    Guidelines:
    1. Explain all medical terms in plain English
    2. Highlight abnormal values and what they mean
    3. Provide actionable next steps
    4. Include a summary of overall health status
    5. Never omit important warnings or critical findings
    6. Maintain accuracy while simplifying

    Always include a disclaimer that this is an AI interpretation and the patient should consult their doctor."""

    def __init__(self):
        self.gemini = GeminiClient()

    def summarize_text(self, report_text, report_type='general'):
        """
        Summarize a medical report provided as text.

        Args:
            report_text: The medical report text
            report_type: Type of report (blood_test, xray, mri, general, etc.)
        """
        prompt = f"""Please summarize and explain this {report_type} medical report in simple language:

        REPORT:
        {report_text}

        Please provide:
        1. A simple summary (2-3 sentences)
        2. Key findings explained in plain language
        3. Any abnormal values and what they mean
        4. What the doctor is likely checking for
        5. Recommended next steps
        6. Overall health status assessment

        Format as JSON with keys: summary, key_findings, abnormal_values, purpose, next_steps, overall_status, disclaimer"""

        response_schema = {
            "type": "object",
            "properties": {
                "summary": {"type": "string"},
                "key_findings": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "abnormal_values": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "value": {"type": "string"},
                            "explanation": {"type": "string"},
                            "severity": {"type": "string"}
                        }
                    }
                },
                "purpose": {"type": "string"},
                "next_steps": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "overall_status": {"type": "string"},
                "disclaimer": {"type": "string"}
            }
        }

        return self.gemini.generate_structured(
            prompt=prompt,
            response_schema=response_schema,
            system_instruction=self.SYSTEM_PROMPT
        )

    def summarize_from_image(self, image_path, report_type='general'):
        """Summarize a medical report from an image."""
        prompt = f"""This is a {report_type} medical report image. Please:
        1. Extract all text from the image
        2. Summarize it in simple language
        3. Explain any medical terms
        4. Highlight any abnormal values
        5. Suggest next steps

        Return as JSON with keys: extracted_text, summary, key_findings, abnormal_values, next_steps, disclaimer"""

        return self.gemini.analyze_image(image_path, prompt)

    def compare_reports(self, old_report, new_report):
        """Compare two reports and highlight changes."""
        prompt = f"""Compare these two medical reports and highlight changes:

        OLD REPORT:
        {old_report}

        NEW REPORT:
        {new_report}

        Please provide:
        1. Summary of changes (improvements, worsening, new findings)
        2. Values that changed significantly
        3. Trends observed
        4. Recommendations based on the comparison

        Format as JSON with keys: changes_summary, significant_changes, trends, recommendations, disclaimer"""

        return self.gemini.generate_text(
            prompt=prompt,
            system_instruction=self.SYSTEM_PROMPT
        )
