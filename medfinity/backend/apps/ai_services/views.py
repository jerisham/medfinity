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
        return Response(result)
    return Response({'error': result.get('error', 'Unknown error')}, status=500)


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
    return Response({'error': result.get('error', 'Unknown error')}, status=500)


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
    return Response({'error': result.get('error', 'Unknown error')}, status=500)


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
        return Response(result)
    return Response({'error': result.get('error', 'Unknown error')}, status=500)


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
    return Response({'error': result.get('error', 'Unknown error')}, status=500)


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
    return Response({'error': result.get('error', 'Unknown error')}, status=500)
