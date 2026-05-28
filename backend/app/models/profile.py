from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict

class Education(BaseModel):
    school: str = Field(..., description="University or school name")
    degree: str = Field(..., description="Degree type, e.g., Bachelor of Science")
    major: str = Field(..., description="Major or field of study")
    gpa: Optional[str] = Field(None, description="GPA, e.g., 3.8/4.0")
    start_date: str = Field(..., description="Start date, e.g., Sept 2021")
    end_date: str = Field(..., description="End or graduation date, e.g., May 2025")

class WorkExperience(BaseModel):
    company: str = Field(..., description="Company name")
    role: str = Field(..., description="Job title")
    location: Optional[str] = Field(None, description="Location of work")
    start_date: str = Field(..., description="Start date, e.g., June 2023")
    end_date: str = Field(..., description="End date, e.g., Aug 2023 or Present")
    description: List[str] = Field(default=[], description="Bullet points explaining achievements and responsibilities")

class Project(BaseModel):
    title: str = Field(..., description="Project title")
    description: str = Field(..., description="High-level description of what you built")
    tech_stack: List[str] = Field(default=[], description="Languages and technologies used")
    bullet_points: List[str] = Field(default=[], description="Key achievements or features of the project")
    link: Optional[str] = Field(None, description="GitHub repository or live demo link")

class CustomQA(BaseModel):
    question_keywords: List[str] = Field(..., description="Keywords to match, e.g., ['why', 'interest', 'fit']")
    sample_answer: str = Field(..., description="Your draft answer to base new tailored versions on")

class ProfileVault(BaseModel):
    first_name: str = Field(..., description="First Name")
    last_name: str = Field(..., description="Last Name")
    email: EmailStr = Field(..., description="Email address")
    phone: str = Field(..., description="Phone number")
    location: str = Field(..., description="City, State, Country")
    linkedin: Optional[str] = Field(None, description="LinkedIn profile URL")
    github: Optional[str] = Field(None, description="GitHub profile URL")
    portfolio: Optional[str] = Field(None, description="Portfolio website URL")
    
    education: List[Education] = Field(default=[], description="List of educational history")
    experience: List[WorkExperience] = Field(default=[], description="List of professional experience")
    projects: List[Project] = Field(default=[], description="List of notable projects")
    skills: List[str] = Field(default=[], description="General skills or keywords")
    
    # Sponsorship & Legal
    requires_sponsorship: bool = Field(False, description="Requires visa sponsorship or work visa")
    authorized_to_work: bool = Field(True, description="Legally authorized to work in target country")
    
    # Custom QA
    custom_qa: List[CustomQA] = Field(default=[], description="Custom reusable answers for common short questions")
    
    # EEO / Demographic Fields
    gender: Optional[str] = Field("Decline to Self Identify", description="Gender demographic option")
    race: Optional[str] = Field("Decline to Self Identify", description="Race or ethnicity demographic option")
    veteran_status: Optional[str] = Field("I am not a protected veteran", description="Veteran status demographic option")
    pronouns: Optional[str] = Field("He/him", description="Preferred pronouns")
    
    # Custom Fields from manual review fill history
    custom_fields: Optional[Dict[str, str]] = Field(default={}, description="Custom key-value pairs of other form fields")
