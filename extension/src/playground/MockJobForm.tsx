import React from 'react';

export interface JobProfile {
  id: string;
  company: string;
  roleTitle: string;
  logoChar: string;
  location: string;
  description: string;
  specialFieldId: string;
  specialFieldLabel: string;
}

export const JOB_PROFILES: JobProfile[] = [
  {
    id: 'replit',
    company: 'Replit',
    roleTitle: 'Software Engineer Intern',
    logoChar: 'R',
    location: 'San Francisco, CA (Hybrid)',
    description: 'We are looking for an ambitious Software Engineering Intern to build next-generation AI developer tools. Experience with React, TypeScript, and FastAPI is a big plus. You will work closely with our core engineering teams on building high-performance workspace sandboxes.',
    specialFieldId: 'why-replit',
    specialFieldLabel: 'Why are you interested in Replit? Describe how your skills align with our workspace ecosystem.'
  },
  {
    id: 'vercel',
    company: 'Vercel',
    roleTitle: 'Frontend Engineer',
    logoChar: '▲',
    location: 'New York, NY (Remote)',
    description: 'Vercel is looking for a Frontend Engineer to build high-performance, premium web interfaces. You will work on Next.js core workflows, design elegant components, and optimize HMR and compilation speeds. Passion for visual aesthetics is a must.',
    specialFieldId: 'vercel-design',
    specialFieldLabel: 'Explain a complex React or design system problem you recently solved, focusing on performance.'
  },
  {
    id: 'google',
    company: 'Google DeepMind',
    roleTitle: 'AI Research Resident',
    logoChar: 'G',
    location: 'London, UK (Onsite)',
    description: 'Join Google DeepMind as an AI Resident to research advanced agentic reasoning models. You will design next-generation transformers and build RLHF alignment architectures. Experience with PyTorch, LLMs, and agentic workflows is highly required.',
    specialFieldId: 'google-project',
    specialFieldLabel: 'Describe a PyTorch or LLM research project you have built and are proud of, explaining the training details.'
  }
];

interface MockJobFormProps {
  currentProfile: JobProfile;
  onProfileChange: (profile: JobProfile) => void;
}

export default function MockJobForm({ currentProfile, onProfileChange }: MockJobFormProps) {
  return (
    <div className="greenhouse-form-container" id="mock-job-form-container">
      {/* Profile Selector tabs */}
      <div className="form-profiles-pillbox" style={{ marginBottom: '28px' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--sim-muted)', fontWeight: 600, marginRight: '4px' }}>
          测试岗位:
        </span>
        {JOB_PROFILES.map(prof => (
          <button
            key={prof.id}
            onClick={() => onProfileChange(prof)}
            className={`profile-select-btn ${currentProfile.id === prof.id ? 'active' : ''}`}
          >
            {prof.company}
          </button>
        ))}
      </div>

      {/* Greenhouse Job Header */}
      <div className="form-header">
        <div className="company-logo-placeholder">
          {currentProfile.logoChar}
        </div>
        <h1 className="job-title-h1">{currentProfile.roleTitle}</h1>
        <div className="job-meta-tagline">
          <span>🏢 {currentProfile.company}</span>
          <span>📍 {currentProfile.location}</span>
          <span>💼 Full-time</span>
        </div>
      </div>

      {/* Greenhouse Job Description */}
      <h3 style={{ fontFamily: 'Outfit', fontSize: '1rem', fontWeight: 600, marginBottom: '10px' }}>
        Job Description
      </h3>
      <div className="jobs-description">
        {currentProfile.description}
        <div style={{ marginTop: '12px' }}>
          <strong>Core Technologies:</strong> React, TypeScript, Node.js, Python, LLMs.
        </div>
      </div>

      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '28px', marginTop: '28px' }}>
        <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 600, marginBottom: '20px' }}>
          Submit Application
        </h3>

        <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="gh-form-group">
              <label className="gh-label" htmlFor="first_name">
                First Name <span className="gh-required-indicator">*</span>
              </label>
              <input 
                type="text" 
                id="first_name" 
                name="first_name" 
                className="gh-input" 
                required 
                placeholder="Yuliang"
              />
            </div>
            
            <div className="gh-form-group">
              <label className="gh-label" htmlFor="last_name">
                Last Name <span className="gh-required-indicator">*</span>
              </label>
              <input 
                type="text" 
                id="last_name" 
                name="last_name" 
                className="gh-input" 
                required 
                placeholder="Peng"
              />
            </div>
          </div>

          <div className="gh-form-group">
            <label className="gh-label" htmlFor="email">
              Email Address <span className="gh-required-indicator">*</span>
            </label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className="gh-input" 
              required 
              placeholder="name@example.com"
            />
          </div>

          <div className="gh-form-group">
            <label className="gh-label" htmlFor="phone">
              Phone Number <span className="gh-required-indicator">*</span>
            </label>
            <input 
              type="text" 
              id="phone" 
              name="phone" 
              className="gh-input" 
              required 
              placeholder="+1 (555) 000-0000"
            />
          </div>

          <div className="gh-form-group">
            <label className="gh-label" htmlFor="linkedin">
              LinkedIn Profile URL
            </label>
            <input 
              type="text" 
              id="linkedin" 
              name="linkedin" 
              className="gh-input" 
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div className="gh-form-group">
            <label className="gh-label" htmlFor="sponsorship">
              Will you now or in the future require visa sponsorship? <span className="gh-required-indicator">*</span>
            </label>
            <select id="sponsorship" name="sponsorship" className="gh-input" required>
              <option value="">Please select</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>

          {/* Dynamic AI Question Field based on Job Profile */}
          <div className="gh-form-group" key={currentProfile.id}>
            <label className="gh-label" htmlFor={currentProfile.specialFieldId}>
              {currentProfile.specialFieldLabel} <span className="gh-required-indicator">*</span>
            </label>
            <textarea
              id={currentProfile.specialFieldId}
              name={currentProfile.specialFieldId}
              className="gh-input"
              required
              placeholder="The AI agent will draft a high-quality tailored response here based on your profile vault."
            />
          </div>

          <div style={{ marginTop: '20px' }}>
            <button type="submit" className="gh-submit-btn" onClick={() => alert("🎉 提交成功！这是一个模拟求职申请。")}>
              Submit Application
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
