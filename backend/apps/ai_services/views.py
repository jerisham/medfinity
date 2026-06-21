from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from .symptom_checker import SymptomChecker
from .report_summarizer import ReportSummarizer
from .doctor_recommender import DoctorRecommender
from .ocr_service import OCRService
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
import os

@api_view(['POST'])
@permission_classes([AllowAny])  # Allow anyone to check symptoms
def check_symptoms(request):
    """AI Symptom Checker endpoint."""
    symptoms = request.data.get('symptoms', [])
    age = request.data.get('age')
    gender = request.data.get('gender')
    duration = request.data.get('duration')

    if not symptoms:
        return Response({'error': 'Symptoms are required'}, status=400)

    checker = SymptomChecker()
    result = checker.check_symptoms(symptoms, age, gender, duration)

    if result['success']:
        import json
        try:
            data = json.loads(result['text'])
            conditions_str = "\n".join([f"- **{c['name']}**: {c.get('likelihood', 'Unknown')} ({c.get('confidence', 0)}% confidence)" for c in data.get('conditions', [])])
            response_text = f"Based on your symptoms, here is a preliminary analysis:\n\n" \
                            f"### Possible Conditions:\n{conditions_str}\n\n" \
                            f"### Recommended Medical Specialty:\n**{data.get('recommended_specialty', 'General Physician')}**\n\n" \
                            f"### Emergency Care Needed:\n**{data.get('emergency', 'NO')}**\n\n" \
                            f"### Advice:\n{data.get('advice', '')}\n\n" \
                            f"### When to see a doctor immediately:\n{data.get('see_doctor_when', '')}\n\n" \
                            f"_{data.get('disclaimer', 'Always consult a doctor in person.')}_"
            return Response({'response': response_text})
        except Exception:
            return Response({'response': result['text']})
    
    # Graceful fallback instead of 500 error
    fallback_text = "I apologize, but I am unable to analyze your symptoms right now. Please seek professional medical advice. If you are experiencing chest pain, breathing difficulties, or severe bleeding, please visit the emergency room immediately."
    return Response({'response': fallback_text})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def summarize_report(request):
    """Summarize medical report text."""
    report_text = request.data.get('report_text', '')
    report_type = request.data.get('report_type', 'general')

    if not report_text:
        return Response({'error': 'Report text is required'}, status=400)

    summarizer = ReportSummarizer()
    result = summarizer.summarize_text(report_text, report_type)

    if result['success']:
        return Response(result)
    return Response({
        'success': True,
        'summary': "Unable to summarize this report text automatically. Please read the document carefully and consult your doctor for detailed questions.",
        'key_findings': [],
        'recommendations': ["Consult your primary care physician to discuss the results."],
        'disclaimer': "This is a fallback summary due to system load. Please do not make medical decisions based on this text."
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def summarize_report_image(request):
    """Summarize medical report from uploaded image."""
    if 'image' not in request.FILES:
        return Response({'error': 'Image is required'}, status=400)

    image = request.FILES['image']
    report_type = request.data.get('report_type', 'general')

    # Save temporarily
    file_path = default_storage.save(f'temp_reports/{image.name}', ContentFile(image.read()))
    full_path = os.path.join(default_storage.location, file_path)

    summarizer = ReportSummarizer()
    result = summarizer.summarize_from_image(full_path, report_type)

    # Clean up
    if os.path.exists(full_path):
        os.remove(full_path)

    if result['success']:
        return Response(result)
    return Response({
        'success': True,
        'summary': "Unable to process and summarize this image report at this moment. Please double check the image quality and try again, or consult your practitioner.",
        'key_findings': [],
        'recommendations': ["Check image clarity.", "Consult your healthcare provider directly."],
        'disclaimer': "Fallback analysis activated. Always refer to your medical professional."
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recommend_doctor(request):
    """Recommend doctor specialty based on symptoms."""
    symptoms = request.data.get('symptoms', [])

    if not symptoms:
        return Response({'error': 'Symptoms are required'}, status=400)

    recommender = DoctorRecommender()
    result = recommender.recommend_specialty(symptoms)

    if result['success']:
        import json
        try:
            data = json.loads(result['text'])
            secondary = ", ".join(data.get('secondary_specialties', []))
            response_text = f"I recommend consulting a **{data.get('primary_specialty', 'General Physician')}** for your concern.\n\n" \
                            f"### Why this specialty:\n{data.get('reasoning', '')}\n\n" \
                            f"### Expected Examination:\n{data.get('expected_examination', '')}\n\n"
            if secondary:
                response_text += f"### Other relevant specialties:\n{secondary}"
            return Response({'response': response_text})
        except Exception:
            return Response({'response': result['text']})
    
    # Fallback to general physician
    fallback_text = "I recommend consulting a **General Physician** for a primary evaluation of your symptoms. They will be able to perform a general check-up and direct you to the appropriate specialist if necessary."
    return Response({'response': fallback_text})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ocr_prescription(request):
    """OCR extract prescription from image."""
    if 'image' not in request.FILES:
        return Response({'error': 'Image is required'}, status=400)

    image = request.FILES['image']

    ocr = OCRService()
    result = ocr.extract_text_from_image(image)

    return Response(result)


@api_view(['POST'])
@permission_classes([AllowAny])
def ai_chat(request):
    """General AI chat for health questions."""
    message = request.data.get('message', '')
    history = request.data.get('history', [])

    if not message:
        return Response({'error': 'Message is required'}, status=400)

    from .gemini_client import GeminiClient

    gemini = GeminiClient()

    system_prompt = """You are Medfinity AI, a helpful healthcare assistant. You can:
    - Answer general health questions
    - Explain medical terms
    - Provide health tips
    - Help users understand their symptoms
    - Guide users on when to seek medical care

    IMPORTANT RULES:
    - Always include a disclaimer that you're an AI, not a doctor
    - Never diagnose definitively
    - Never prescribe medication
    - Always recommend seeing a doctor for serious concerns
    - Be empathetic and supportive"""

    messages = history + [{'role': 'user', 'content': message}]
    result = gemini.chat(messages, system_instruction=system_prompt)

    if result['success']:
        return Response({'response': result['text']})
    
    # Return a graceful message instead of 500
    fallback_msg = "I apologize, but I am experiencing high traffic right now. As a general tip: make sure you rest, hydrate well, and consult a medical professional for any urgent or persistent symptoms."
    return Response({'response': fallback_msg})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def get_follow_up_questions(request):
    """Get follow-up questions for symptoms."""
    symptoms = request.data.get('symptoms', [])

    if not symptoms:
        return Response({'error': 'Symptoms are required'}, status=400)

    checker = SymptomChecker()
    result = checker.get_follow_up_questions(symptoms)

    if result['success']:
        return Response(result)
    return Response({
        'success': True,
        'questions': [
            "Are you experiencing any other symptoms?",
            "How long has this been going on?",
            "What makes the symptoms feel better or worse?"
        ]
    })
