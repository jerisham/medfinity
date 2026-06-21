class GeminiClient:
    def __init__(self, api_key=None):
        self.api_key = api_key or settings.GEMINI_API_KEY

        print("API KEY LOADED:", self.api_key)   # ✅ correct place