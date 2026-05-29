from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Header
from pydantic import BaseModel
from typing import List, Optional
import requests
from bs4 import BeautifulSoup
from google.genai import types

from ..models.profile import ProfileVault
from ..models.job import JobDetails, FormField, FieldMapping
from ..agents.mapper import GeminiMapperAgent

router = APIRouter()

# Simple request schemas
class ParseJobRequest(BaseModel):
    raw_text: str

class MapFieldsRequest(BaseModel):
    profile: ProfileVault
    job: JobDetails
    fields: List[FormField]

class ParseFormRequest(BaseModel):
    url: str

class FillFormRequest(BaseModel):
    fields: List[FormField]
    profile: ProfileVault

class ChatMessage(BaseModel):
    role: str  # "user" or "model"
    content: str

class ChatRequest(BaseModel):
    message: str
    profile: ProfileVault
    job: Optional[JobDetails] = None
    history: List[ChatMessage] = []

# Health check
@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "ApplyPilot Backend API"}

@router.post("/parse-form", response_model=List[FormField])
def parse_form_endpoint(payload: ParseFormRequest):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        response = requests.get(payload.url, headers=headers, timeout=10)
        response.raise_for_status()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch page: {str(e)}")
        
    soup = BeautifulSoup(response.text, 'html.parser')
    inputs = soup.find_all(['input', 'textarea', 'select'])
    
    extracted_fields = []
    for el in inputs:
        if el.get('type') in ['hidden', 'submit', 'button', 'file']:
            continue
            
        field_id = el.get('id')
        if not field_id:
            continue
            
        tag_name = el.name
        label_text = "Unknown Label"
        
        label = soup.find('label', attrs={'for': field_id})
        if label:
            text_parts = [t.strip() for t in label.find_all(string=True, recursive=False) if t.strip() and t.strip() != '*']
            if text_parts:
                label_text = " ".join(text_parts).strip()
            else:
                label_text = label.text.replace('*', '').strip()
                
        if label_text == "Unknown Label":
            parent_div = el.find_parent('div', class_='field')
            if parent_div:
                parent_label = parent_div.find('label')
                if parent_label:
                    label_text = parent_label.text.split('\n')[0].replace('*', '').strip()
                    
        options = []
        if tag_name == 'select':
            opts = el.find_all('option')
            options = [o.text.strip() for o in opts if o.text.strip() and o.text.strip() not in ["Please select", "", "-- Please select --"]]
            
        extracted_fields.append(FormField(
            id=field_id,
            name=el.get('name'),
            label=label_text,
            type=el.get('type') or tag_name,
            options=options
        ))
        
    return extracted_fields

def find_matching_eeo_option(options: List[str], target_keywords: List[str], fallback: str) -> str:
    if not options:
        return fallback
    for opt in options:
        opt_lower = opt.lower()
        if any(kw in opt_lower for kw in target_keywords):
            return opt
    # generic decline matching
    generic_kws = ["decline", "prefer not", "choose not", "not to identify", "not a veteran", "not protected"]
    for opt in options:
        opt_lower = opt.lower()
        if any(kw in opt_lower for kw in generic_kws):
            return opt
    return options[0] if options else fallback

@router.post("/fill-form", response_model=List[FieldMapping])
def fill_form_endpoint(payload: FillFormRequest):
    results = []
    profile_dict = payload.profile.model_dump()
    
    for field in payload.fields:
        label_lower = field.label.lower()
        field_id_lower = field.id.lower()
        value = None
        mapping_type = "manual_review"
        confidence = 0.8
        needs_review = True
        reasoning = "Unmapped field. Please review and fill if needed."
        
        # Check custom_fields first
        custom_fields = profile_dict.get("custom_fields") or {}
        custom_match = None
        for key, val in custom_fields.items():
            if key.lower() == label_lower or (key.lower() in label_lower and len(key) > 3):
                custom_match = val
                break
                
        # ── Standard Direct Matches ──────────────────────────────────
        if "first name" in label_lower or field_id_lower == "first_name":
            value = profile_dict.get("first_name")
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped directly from Profile Vault first name."
        elif "last name" in label_lower or field_id_lower == "last_name":
            value = profile_dict.get("last_name")
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped directly from Profile Vault last name."
        elif "full name" in label_lower or "fullname" in label_lower or field_id_lower == "fullname" or field_id_lower == "full_name" or label_lower == "name" or field_id_lower == "name":
            value = f"{profile_dict.get('first_name', '')} {profile_dict.get('last_name', '')}".strip()
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Constructed by joining first name and last name."
        elif "preferred" in label_lower and "name" in label_lower:
            value = profile_dict.get("preferred_name", profile_dict.get("first_name"))
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped to preferred name or fallback first name."
        elif "email" in label_lower:
            value = profile_dict.get("email")
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped directly from Profile Vault email."
        elif "phone" in label_lower:
            value = profile_dict.get("phone")
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped directly from Profile Vault phone."
        elif "country" in label_lower:
            value = profile_dict.get("location")
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped directly from Profile Vault location."
        elif "linkedin" in label_lower:
            value = profile_dict.get("linkedin")
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped directly from Profile Vault LinkedIn URL."
        elif "website" in label_lower or "portfolio" in label_lower:
            value = profile_dict.get("portfolio")
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped directly from Profile Vault portfolio URL."
        elif "pronoun" in label_lower:
            value = profile_dict.get("pronouns") or "He/him"
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Mapped directly from Profile Vault pronouns."
        elif label_lower in ["he/him", "she/her", "they/them", "xe/xem", "ze/hir", "ey/em", "hir/hir", "fae/faer", "hu/hu"]:
            user_pronoun = (profile_dict.get("pronouns") or "He/him").lower()
            value = (label_lower == user_pronoun)
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = f"Pronoun checkbox checked set to {value}."
        elif custom_match is not None:
            value = custom_match
            mapping_type = "direct"
            confidence = 0.9
            needs_review = False
            reasoning = "Mapped from custom_fields saved from a previous submission."
            
        # ── Sponsorship / Work Authorization ─────────────────────────
        elif ("sponsorship" in label_lower) or ("visa" in label_lower and "require" in label_lower):
            req_sponsorship = profile_dict.get("requires_sponsorship", False)
            target_val = "Yes" if req_sponsorship else "No"
            
            if field.type == 'select' and field.options:
                for opt in field.options:
                    if target_val.lower() == opt.lower():
                        value = opt
                        break
                if not value:
                    for opt in field.options:
                        if target_val.lower() in opt.lower() or (not req_sponsorship and ("don't require" in opt.lower() or "do not require" in opt.lower())):
                            value = opt
                            break
            if not value:
                value = target_val
            mapping_type = "select_option"
            confidence = 0.9
            needs_review = False
            reasoning = f"Auto-selected based on profile requires_sponsorship status ({req_sponsorship})."
            
        elif "authorization" in label_lower or "employment authorization" in label_lower:
            if not profile_dict.get("requires_sponsorship", False):
                value = "N/A \u2014 I am authorized to work in the US and do not require sponsorship."
                mapping_type = "direct"
                confidence = 0.9
                needs_review = False
                reasoning = "Auto-filled since requires_sponsorship is False."
                
        # ── EEO / Demographic Fields ──────────────────────────────────
        elif "gender" in label_lower:
            gender_val = profile_dict.get("gender") or "Decline to Self Identify"
            value = find_matching_eeo_option(
                field.options,
                [gender_val.lower(), "decline to self-identify", "decline to self identify", "decline to state", "prefer not to say", "decline"],
                gender_val
            )
            mapping_type = "select_option"
            confidence = 0.9
            needs_review = False
            reasoning = "EEO Gender selected using Profile Vault preference."
        elif "race" in label_lower or "ethnicity" in label_lower:
            race_val = profile_dict.get("race") or "Decline to Self Identify"
            value = find_matching_eeo_option(
                field.options,
                [race_val.lower(), "decline to self-identify", "decline to self identify", "decline to state", "prefer not to say", "decline"],
                race_val
            )
            mapping_type = "select_option"
            confidence = 0.9
            needs_review = False
            reasoning = "EEO Race/Ethnicity selected using Profile Vault preference."
        elif "veteran" in label_lower:
            vet_val = profile_dict.get("veteran_status") or "I am not a protected veteran"
            value = find_matching_eeo_option(
                field.options,
                [vet_val.lower(), "i am not a protected veteran", "not a veteran", "not a protected veteran", "decline", "prefer not to say"],
                vet_val
            )
            mapping_type = "select_option"
            confidence = 0.9
            needs_review = False
            reasoning = "EEO Veteran status selected using Profile Vault preference."
        elif any(k in label_lower for k in ["agree", "terms", "acknowledge", "understand", "read", "declaration", "consent"]):
            value = True
            mapping_type = "direct"
            confidence = 1.0
            needs_review = False
            reasoning = "Auto-agreed to terms, conditions, or disclosures."
            
        results.append(FieldMapping(
            field_id=field.id,
            field_label=field.label,
            field_type=field.type,
            mapping_type=mapping_type,
            mapped_value=value,
            confidence=confidence,
            needs_review=needs_review,
            reasoning=reasoning
        ))
        
    return results

@router.post("/parse-job", response_model=JobDetails)
async def parse_job_endpoint(payload: ParseJobRequest, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        agent = GeminiMapperAgent(api_key=x_gemini_api_key)
        job_details = await agent.parse_job_description(payload.raw_text)
        return job_details
    except ValueError as val_err:
        raise HTTPException(status_code=401, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse job description: {str(e)}")

@router.post("/map-fields", response_model=List[FieldMapping])
async def map_fields_endpoint(payload: MapFieldsRequest, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        agent = GeminiMapperAgent(api_key=x_gemini_api_key)
        mappings = await agent.map_fields(payload.profile, payload.job, payload.fields)
        return mappings
    except ValueError as val_err:
        raise HTTPException(status_code=401, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to map form fields: {str(e)}")

@router.post("/parse-resume", response_model=ProfileVault)
async def parse_resume_endpoint(file: UploadFile = File(...), x_gemini_api_key: Optional[str] = Header(None)):
    if not file.filename.lower().endswith(('.pdf', '.txt')):
        raise HTTPException(status_code=400, detail="Only PDF and TXT resumes are supported currently.")
        
    try:
        content = await file.read()
        resume_text = ""
        
        if file.filename.lower().endswith('.pdf'):
            import io
            from pypdf import PdfReader
            pdf_file = io.BytesIO(content)
            reader = PdfReader(pdf_file)
            text_list = []
            for page in reader.pages:
                text_list.append(page.extract_text() or "")
            resume_text = "\n".join(text_list)
        else:
            resume_text = content.decode('utf-8', errors='ignore')
            
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="The uploaded resume file seems to be empty or unreadable.")
            
        agent = GeminiMapperAgent(api_key=x_gemini_api_key)
        profile_data = await agent.parse_resume(resume_text)
        return profile_data
        
    except ValueError as val_err:
        raise HTTPException(status_code=401, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {str(e)}")

@router.post("/chat")
async def chat_endpoint(payload: ChatRequest, x_gemini_api_key: Optional[str] = Header(None)):
    try:
        agent = GeminiMapperAgent(api_key=x_gemini_api_key)
        
        # Build prompt context
        profile_json = payload.profile.model_dump_json(indent=2)
        job_json = payload.job.model_dump_json(indent=2) if payload.job else "No active job scanned."
        
        system_instruction = f"""
        You are a highly intelligent, direct, and conversational AI career companion, exactly like ChatGPT or Gemini. Talk to the user naturally and directly. Answer ANY questions they ask (whether general questions, career advice, code debugging, or casual chats). Your goal is to provide a seamless, friendly, and human-like chat experience. Avoid being robotic, overly formal, or forcing complex menus or structured lists.
        
        You have a special "superpower" built in: you are deeply integrated with the candidate's Profile Vault and can see active job details when scanned. Use this context to be incredibly smart when they ask about their resume, job applications, or cover letters, but otherwise chat with them naturally about anything.
        
        --- KEY KNOWLEDGE: THE APPLYPILOT AI PROJECT ---
        You are ApplyPilot AI. The candidate (Yuliang Peng) is the creator and developer of YOU (this very project)! You must have full, intimate technical knowledge of how you are built:
        - **Frontend**: A Chrome Extension built on Manifest V3 (using `sidePanel` for this chat UI, `storage` for local secure profile storage, and `scripting` to scan/autofill DOM elements). It uses React (v18), TypeScript, and Vite. It utilizes `jsPDF` client-side to generate beautifully formatted PDF cover letters with 20mm margins.
        - **Backend**: A FastAPI (Python) REST API deploying a Gemini AI Agent (`gemini-2.5-flash`) via the `google-genai` SDK for structural form mapping and chat.
        - **Core Technical Hurdles Solved**: We solved React DOM prototype locks by dispatching synthetic change events for autofill, and secured API credentials dynamically.
        Use this technical knowledge to help Yuliang Peng in mock interviews, resume reviews, or when discussing this project with recruiters! Act extremely proud of what they built, and guide them on how to explain these technical highlights.
        
        --- CANDIDATE PROFILE ---
        {profile_json}
        
        --- ACTIVE JOB DETAILS ---
        {job_json}
        
        --- YOUR GOALS ---
        1. Answer any career questions, guide the user, or draft job-application answers naturally.
        2. If the user asks for a Cover Letter (求职信):
           - **Check active job details**: First, check if the ACTIVE JOB DETAILS contain a scanned company and role. 
             * If NO active job has been scanned yet (i.e. job details are missing or "No active job scanned"), do NOT write a generic, poor-quality cover letter. Instead, politely and naturally tell the user in the chat that they can scan a job application page first using the extension, OR they can simply type the target **Company Name** and **Job Title** directly in the chat, and you will draft a custom cover letter for them immediately.
             * If the user has provided the company/role details in their chat message, or if a job *is* scanned, proceed to write the cover letter.
           - **Tailoring using Cover Letter Sample (THE ABSOLUTE PRIMARY REFERENCE & TEMPLATE)**: If the candidate has provided a non-empty `cover_letter_sample` in their CANDIDATE PROFILE (i.e. it is not empty/null), you MUST treat this sample text as your absolute primary reference, base template, writing style reference, tone reference, and structure reference. Your goal is to customize, adapt, and rewrite *that exact sample text* to fit the target company and role, rather than writing a new letter from scratch. Preserve the user's paragraphs, original voice, and personal details, but modify the company name, job title, and specific technical highlights to align perfectly with the target company's mission and the scanned job's requirements (paying close attention to all clauses, including those separated by commas). This sample is the primary source of truth for how they want their cover letter formatted and written.
           - **Default writing**: If `cover_letter_sample` is empty or contains placeholders only, write a highly tailored, professional, engaging, first-person cover letter from scratch that matches the candidate's background (skills, experience, projects) with the job description's requirements.
           - **Crucial Formatting**: Do not use generic cliches. Do not include placeholders like "[Your Name]", "[Company Name]", or "[Date]"; always replace them with the actual candidate name, target company name, and current date (May 2026) dynamically.
        3. Keep the conversation flowing naturally, just like a standard Gemini chat. Do not force robotic menus or massive instruction blocks.
        """
        
        # Prepare contents list for Client mapping history to types.Content
        contents = []
        for msg in payload.history:
            contents.append(
                types.Content(
                    role=msg.role,
                    parts=[types.Part.from_text(text=msg.content)]
                )
            )
            
        # Append current user message
        contents.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=payload.message)]
            )
        )
        
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.7
        )
        
        response = agent.client.models.generate_content(
            model=agent.model,
            contents=contents,
            config=config
        )
        
        return {"response": response.text}
        
    except ValueError as val_err:
        raise HTTPException(status_code=401, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate chat response: {str(e)}")
