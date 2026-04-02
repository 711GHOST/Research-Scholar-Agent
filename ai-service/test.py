import requests
from config import SEMANTIC_SCHOLAR_API_KEY
import json

# Specify the search term
query = '"generative ai"'

# Define the API endpoint URL
url = "http://api.semanticscholar.org/graph/v1/paper/search/bulk"

# Define the query parameters
query_params = {
    "query": '"generative ai"',
    "fields": "title,url,publicationTypes,publicationDate,openAccessPdf",
    "year": "2023-"
}

# Directly define the API key (Reminder: Securely handle API keys in production environments)
api_key = SEMANTIC_SCHOLAR_API_KEY  # Replace with the actual API key

# Define headers with API key
headers = {"x-api-key": api_key}

# Send the API request
response = requests.get(url, params=query_params, headers=headers).json()

print(json.dumps(response, indent=2))