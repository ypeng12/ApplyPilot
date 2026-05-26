from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
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

# Health check
@router.get("/health")
def health_check():
    return {"status": "healthy", "service": "ApplyPilot Backend API"}

@router.post("/parse-job", response_model=JobDetails)
async def parse_job_endpoint(payload: ParseJobRequest):
    try:
        agent = GeminiMapperAgent()
        job_details = await agent.parse_job_description(payload.raw_text)
        return job_details
    except ValueError as val_err:
        raise HTTPException(status_code=401, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse job description: {str(e)}")

@router.post("/map-fields", response_model=List[FieldMapping])
async def map_fields_endpoint(payload: MapFieldsRequest):
    try:
        agent = GeminiMapperAgent()
        mappings = await agent.map_fields(payload.profile, payload.job, payload.fields)
        return mappings
    except ValueError as val_err:
        raise HTTPException(status_code=401, detail=str(val_err))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to map form fields: {str(e)}")
