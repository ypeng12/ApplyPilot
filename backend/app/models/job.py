from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class JobDetails(BaseModel):
    company: str = Field(..., description="Company name extracted from job page")
    role: str = Field(..., description="Job role or title")
    location: Optional[str] = Field(None, description="Job location")
    description: str = Field(..., description="Job description details used for tailor-generating short answers")
    requirements: List[str] = Field(default=[], description="Parsed key skills/experience requirements")

class FormField(BaseModel):
    id: str = Field(..., description="Unique browser DOM identifier or element selector")
    name: Optional[str] = Field(None, description="The name attribute of the input field")
    label: str = Field(..., description="The UI text/label associated with the field")
    type: str = Field("text", description="Input type: text, textarea, select, radio, checkbox, file, etc.")
    required: bool = Field(False, description="Is the field marked as required in the DOM")
    options: List[str] = Field(default=[], description="Available dropdown/radio choices if type is select or group")

class FieldMapping(BaseModel):
    field_id: str = Field(..., description="Matches FormField.id")
    field_label: str = Field(..., description="Matches FormField.label")
    field_type: str = Field(..., description="Matches FormField.type")
    
    # Direct Map vs AI Generation vs Manual Review
    mapping_type: str = Field("direct", description="direct | ai_generate | select_option | manual_review")
    mapped_value: Any = Field(None, description="The content to inject into the input element")
    confidence: float = Field(1.0, description="Confidence score between 0.0 and 1.0")
    needs_review: bool = Field(False, description="Whether the field needs manual review")
    reasoning: Optional[str] = Field(None, description="Explanation for mapping or missing information")

class FieldMappingResponse(BaseModel):
    mappings: List[FieldMapping]

class ApplicationRecord(BaseModel):
    id: Optional[str] = Field(None, description="MongoDB record ID")
    company: str
    role: str
    job_url: str
    date_applied: datetime = Field(default_factory=datetime.utcnow)
    status: str = Field("Drafted", description="Drafted | Reviewed | Submitted | Rejected | Interview | Offer")
    generated_answers: Dict[str, str] = Field(default={}, description="Question-answer history for this job")
    notes: Optional[str] = None
