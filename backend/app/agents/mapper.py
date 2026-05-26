import os
import json
from google import genai
from google.genai import types
from typing import List
from ..models.profile import ProfileVault
from ..models.job import JobDetails, FormField, FieldMapping, FieldMappingResponse

class GeminiMapperAgent:
    def __init__(self, api_key: str = None):
        # Fallback to env variable if not passed
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY environment variable is missing.")
        # Initialize Google GenAI Client
        self.client = genai.Client(api_key=self.api_key)
        self.model = "gemini-2.5-flash"  # Highly optimized for speed, reasoning, and structured output

    async def parse_job_description(self, raw_text: str) -> JobDetails:
        """
        Parses raw text scraped from a job webpage and extracts structured JobDetails.
        """
        prompt = f"""
        You are an expert recruiter AI. Analyze the following raw text from a job page and extract:
        - Company name
        - Role title
        - Job location (or Remote/Hybrid)
        - Short cleaned description summarizing the role
        - A list of key skill or experience requirements
        
        Raw Job Page Text:
        ---
        {raw_text}
        ---
        """
        
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=JobDetails,
            temperature=0.1
        )
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config
        )
        
        return JobDetails.model_validate_json(response.text)

    async def map_fields(self, profile: ProfileVault, job: JobDetails, fields: List[FormField]) -> List[FieldMapping]:
        """
        Analyzes the HTML FormFields and maps them to the ProfileVault data.
        If a field is a short answer question, it generates a custom tailored answer.
        If a field is a dropdown/radio, it selects the best matching option.
        """
        
        # Prepare context
        profile_json = profile.model_dump_json(indent=2)
        job_json = job.model_dump_json(indent=2)
        fields_json = json.dumps([f.model_dump() for f in fields], indent=2)
        
        prompt = f"""
        You are ApplyPilot AI, an autonomous job application agent. Your task is to map browser form fields to the user's Profile Vault and generate high-quality responses where necessary.
        
        --- USER PROFILE VAULT ---
        {profile_json}
        
        --- TARGET JOB DETAILS ---
        {job_json}
        
        --- DETECTED FORM FIELDS ---
        {fields_json}
        
        --- INSTRUCTIONS ---
        Map every detected FormField in the list to a FieldMapping.
        
        Rules:
        1. **Direct Fields** (First Name, Last Name, Email, Phone, LinkedIn, GitHub, Portfolio URL, Location, City):
           - mapping_type: "direct"
           - mapped_value: Pull directly from the Profile Vault.
           - confidence: 1.0
           
        2. **Dropdown / Multiple Choice Options** (e.g. Work Authorization, Visa status, Gender, Education Level):
           - mapping_type: "select_option"
           - mapped_value: Must match EXACTLY one of the strings inside `options` for that FormField. Compare user profile fields (e.g., requires_sponsorship) with the list of options to select the matching option.
           - confidence: 0.9 if matched, lower if ambiguous.
           
        3. **Open-ended Questions / Textareas** (e.g. "Why this company?", "Tell us about a project", "Cover Letter"):
           - mapping_type: "ai_generate"
           - mapped_value: Write a customized, engaging response in the first-person perspective ("I...") using the candidate's projects, experience, and skills. Keep it highly relevant to the role's requirements and the company's mission. Do not use generic boilerplate. Keep the tone professional, sincere, and humble.
           - Length guideline: ~100-150 words unless specified otherwise.
           - confidence: 0.85
           - needs_review: Set to true so the user is forced to double check and review AI generation before filling.
           
        4. **Uncertain / Unmapped Fields**:
           - mapping_type: "manual_review"
           - mapped_value: null
           - confidence: 0.1 to 0.4
           - needs_review: true
           - reasoning: Explain what information is missing from the profile or why it requires human attention.
           
        Return the mappings structured exactly as required by the schema.
        """
        
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=FieldMappingResponse,
            temperature=0.2
        )
        
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=config
        )
        
        parsed = FieldMappingResponse.model_validate_json(response.text)
        return parsed.mappings
