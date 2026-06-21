from django.urls import path
from .views import (check_symptoms, summarize_report, summarize_report_image,
                    recommend_doctor, ocr_prescription, ai_chat, get_follow_up_questions,
                    rank_doctors)

urlpatterns = [
    path('symptom-checker/', check_symptoms, name='symptom-checker'),
    path('summarize-report/', summarize_report, name='summarize-report'),
    path('summarize-report-image/', summarize_report_image, name='summarize-report-image'),
    path('recommend-doctor/', recommend_doctor, name='recommend-doctor'),
    path('rank-doctors/', rank_doctors, name='rank-doctors'),
    path('ocr-prescription/', ocr_prescription, name='ocr-prescription'),
    path('chat/', ai_chat, name='ai-chat'),
    path('follow-up-questions/', get_follow_up_questions, name='follow-up-questions'),
]