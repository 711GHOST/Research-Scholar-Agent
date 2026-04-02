from google import genai

client = genai.Client(api_key="AIzaSyDEaDDw3BquQz1lX_u5kOMKgTGS5_Iws8E")
for model in client.models.list():
    print(f"Model ID: {model.name}")