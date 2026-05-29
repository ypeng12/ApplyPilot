import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  User, 
  History, 
  Briefcase, 
  CheckCircle2, 
  AlertTriangle, 
  Send, 
  RefreshCw, 
  Save, 
  Plus, 
  Trash2,
  Lock,
  Upload,
  FileText,
  MessageSquare
} from 'lucide-react';

// Interfaces for UI state
interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

interface FieldMapping {
  field_id: string;
  field_label: string;
  field_type: string;
  mapping_type: string; // direct | ai_generate | select_option | manual_review
  mapped_value: any;
  confidence: number;
  reasoning?: string;
  needs_review: boolean;
}

export default function Sidebar() {
  const [activeTab, setActiveTab] = useState<'apply' | 'copy' | 'profile' | 'chat'>('apply');
  const [loading, setLoading] = useState(false);

  // States for Quick-Copy Dashboard
  const [copiedFieldId, setCopiedFieldId] = useState<string | null>(null);
  const [activeCopyCategory, setActiveCopyCategory] = useState<'info' | 'exp' | 'edu' | 'skills'>('info');

  const handleCopyText = (fieldId: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedFieldId(fieldId);
    setTimeout(() => {
      setCopiedFieldId(null);
    }, 1500);
  };

  const renderCopyRow = (label: string, value: string, uniqueId: string) => {
    const isCopied = copiedFieldId === uniqueId;
    return (
      <div 
        key={uniqueId}
        onClick={() => handleCopyText(uniqueId, value)}
        className={`copy-row-glass ${isCopied ? 'copied' : ''}`}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 12px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(255, 255, 255, 0.01)',
          border: '1px solid rgba(255, 255, 255, 0.03)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          marginBottom: '8px',
          gap: '12px'
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            {label}
          </div>
          <div style={{ 
            fontSize: '0.8rem', 
            color: value ? '#f3f4f6' : '#6b7280', 
            fontWeight: 500,
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-word',
            marginTop: '3px',
            fontStyle: value ? 'normal' : 'italic',
            lineHeight: 1.4
          }}>
            {value || "暂无数据"}
          </div>
        </div>
        <div style={{ flexShrink: 0 }}>
          {isCopied ? (
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px' }}>
              <CheckCircle2 size={14} /> 已复制
            </span>
          ) : (
            <span className="copy-action-btn" style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
              复制
            </span>
          )}
        </div>
      </div>
    );
  };

  // Chat states
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', content: string}[]>([
    { role: 'model', content: '👋 你好！我是您的 AI 求职助手 ApplyPilot。我已加载了您的个人背景以及当前网页的岗位描述，有什么我可以帮您的？您也可以点击下方快捷操作来快速生成量身定制的求职信（Cover Letter）哦！' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Text file downloader helper
  const downloadTextFile = (filename: string, text: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleSendChatMessage = async (textToSend?: string) => {
    const msg = textToSend || chatInput;
    if (!msg.trim() || chatLoading) return;

    setChatInput('');
    setChatLoading(true);

    const updatedHistory = [...chatHistory, { role: 'user' as const, content: msg }];
    setChatHistory(updatedHistory);

    try {
      const response = await fetch(`${profile.backend_url || "http://localhost:8000"}/api/chat`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Gemini-API-Key": profile.gemini_api_key || ""
        },
        body: JSON.stringify({

          message: msg,
          profile: profile,
          job: pageScanned ? {
            company,
            role: roleTitle,
            location: profile.location,
            description: jobDescription,
            requirements: []
          } : null,
          history: updatedHistory.map(h => ({
            role: h.role,
            content: h.content
          })).slice(0, -1)
        })
      });

      if (!response.ok) {
        throw new Error("Chat failed");
      }

      const data = await response.json();
      setChatHistory([...updatedHistory, { role: 'model' as const, content: data.response }]);
    } catch (e) {
      console.error(e);
      // Fallback mock response for off-line/development sandbox
      setTimeout(() => {
        setChatHistory([...updatedHistory, {
          role: 'model' as const,
          content: `✍️ **求职信 (Cover Letter) 已为您定制生成**：\n\nDear Hiring Manager,\n\nI am writing to express my enthusiastic interest in the ${roleTitle || "Software Engineer"} position at ${company || "your company"}. Having reviewed the job description, I am highly inspired by your mission and confident that my background in full-stack engineering and AI tools perfectly aligns with the requirements of this role.\n\nFrom my Profile Vault, I have successfully applied React and FastAPI to optimize asynchronous toolchains, similar to what you are building. I bring strong skills in TypeScript, Python, and PyTorch, which would allow me to contribute to your team from day one. I am particularly excited about how my hands-on experience matches the technical stack required for this vacancy.\n\nThank you for your time and consideration. I look forward to the possibility of discussing how my experience can support your goals.\n\nSincerely,\n${profile.first_name} ${profile.last_name}`
        }]);
      }, 1000);
    } finally {
      setChatLoading(false);
    }
  };
  
  // Job scan details
  const [pageScanned, setPageScanned] = useState(false);
  const [company, setCompany] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [detectedFields, setDetectedFields] = useState<FormField[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [autofillSuccess, setAutofillSuccess] = useState<string | null>(null);

  // Default user profile vault values
  const DEFAULT_PROFILE = {
    first_name: 'Yuliang',
    last_name: 'Peng',
    email: 'pengyuliang@example.com',
    phone: '+1 (555) 019-2834',
    location: 'New York, NY',
    linkedin: 'https://linkedin.com/in/yuliang-peng',
    github: 'https://github.com/yuliang-peng',
    portfolio: 'https://yuliang.dev',
    requires_sponsorship: false,
    authorized_to_work: true,
    gender: 'Decline to Self Identify',
    race: 'Decline to Self Identify',
    veteran_status: 'I am not a protected veteran',
    pronouns: 'He/him',
    gemini_api_key: '',
    backend_url: 'http://localhost:8000',

    custom_fields: {} as Record<string, string>,
    projects: [
      {
        title: 'ApplyPilot AI',
        description: 'An AI-powered Chrome Extension agent that scans HTML forms and autofills candidate info while drafting job-specific answers via Gemini API.',
        tech_stack: 'React, TypeScript, FastAPI, Gemini API, Vite'
      }
    ],
    skills: 'React, TypeScript, Python, FastAPI, Gemini API, PyTorch, MongoDB, LLMs',
    experience: [
      {
        company: 'Industrial and Commercial Bank of China (U.S.A.)',
        role: 'Assistant Operations Manager',
        location: 'Alhambra, CA, U.S.A.',
        start_date: '10/2024',
        end_date: 'Present',
        description: ['Supervised daily operations and cash management.', 'Handled customer relationships and transaction processing.']
      },
      {
        company: 'ApplyPilot Corp',
        role: 'Software Engineering Intern',
        location: 'New York, NY, U.S.A.',
        start_date: '06/2023',
        end_date: '09/2023',
        description: ['Built intelligent auto-fill extensions utilizing Gemini LLMs.', 'Optimized frontend response times by 30% using React and Vite.']
      }
    ],
    education: [
      {
        school: 'Columbia University',
        degree: 'Master of Science',
        major: 'Computer Science',
        gpa: '3.8/4.0',
        start_date: '09/2022',
        end_date: '05/2024'
      }
    ]
  };

  // Profile Vault state (saves to local chrome storage or localStorage)
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  // Resume upload states
  const [uploadingResume, setUploadingResume] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.txt')) {
      alert("仅支持 PDF 或 TXT 格式的简历解析！");
      return;
    }

    setUploadingResume(true);
    setUploadStatus("正在使用 Gemini AI 智能提取简历 data...");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${profile.backend_url || "http://localhost:8000"}/api/parse-resume`, {
        method: "POST",
        headers: {
          "X-Gemini-API-Key": profile.gemini_api_key || ""
        },
        body: formData
      });


      if (!response.ok) {
        throw new Error(await response.text() || "解析失败");
      }

      const parsedProfile = await response.json();
      
      // Update profile vault!
      const updatedProfile = {
        ...profile,
        first_name: parsedProfile.first_name || profile.first_name,
        last_name: parsedProfile.last_name || profile.last_name,
        email: parsedProfile.email || profile.email,
        phone: parsedProfile.phone || profile.phone,
        location: parsedProfile.location || profile.location,
        linkedin: parsedProfile.linkedin || profile.linkedin,
        github: parsedProfile.github || profile.github,
        portfolio: parsedProfile.portfolio || profile.portfolio,
        skills: parsedProfile.skills ? parsedProfile.skills.join(", ") : profile.skills,
        gender: parsedProfile.gender || profile.gender,
        race: parsedProfile.race || profile.race,
        veteran_status: parsedProfile.veteran_status || profile.veteran_status,
        pronouns: parsedProfile.pronouns || profile.pronouns,
        experience: parsedProfile.experience || profile.experience,
        education: parsedProfile.education || profile.education,
        custom_fields: {
          ...profile.custom_fields,
          ...parsedProfile.custom_fields
        }
      };

      saveProfile(updatedProfile);
      setUploadStatus("🎉 简历解析成功！所有提取出的背景数据已载入下方档案库！");
      setTimeout(() => setUploadStatus(null), 5000);
    } catch (err: any) {
      console.error(err);
      alert("简历解析失败，请确保本地后端 (http://localhost:8000) 正在运行，且已配置 GEMINI_API_KEY！");
      setUploadStatus(null);
    } finally {
      setUploadingResume(false);
    }
  };

  // Trackers state
  const [history, setHistory] = useState<any[]>([
    { company: 'Replit', role: 'Software Engineer Intern', date: '2026-05-25', status: 'Reviewed' },
    { company: 'Google', role: 'AI Resident', date: '2026-05-24', status: 'Drafted' }
  ]);

  // Load profile on start
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['userProfile', 'applyHistory'], (result) => {
        if (result.userProfile) {
          setProfile(prev => ({ ...DEFAULT_PROFILE, ...result.userProfile }));
        }
        if (result.applyHistory) {
          setHistory(result.applyHistory);
        }
      });
    } else {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        try {
          setProfile(prev => ({ ...DEFAULT_PROFILE, ...JSON.parse(savedProfile) }));
        } catch (e) {
          setProfile(DEFAULT_PROFILE);
        }
      }
      const savedHistory = localStorage.getItem('applyHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }
    }
  }, []);

  // Save profile helper
  const saveProfile = (updatedProfile: typeof profile) => {
    setProfile(updatedProfile);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ userProfile: updatedProfile });
    } else {
      localStorage.setItem('userProfile', JSON.stringify(updatedProfile));
    }
  };

  // Helper to compile unmapped required and optional fields for action analysis
  const getSupplementItems = () => {
    const missingRequired: string[] = [];
    const missingOptional: string[] = [];
    
    mappings.forEach(m => {
      const isFieldRequired = detectedFields.find(df => df.id === m.field_id)?.required || false;
      const isEmpty = m.mapped_value === null || m.mapped_value === undefined || String(m.mapped_value).trim() === "";
      
      if (isEmpty && m.mapping_type !== "ai_generate") {
        if (isFieldRequired) {
          missingRequired.push(m.field_label);
        } else {
          missingOptional.push(m.field_label);
        }
      }
    });
    
    return { missingRequired, missingOptional };
  };

  // Scans active job application tab
  const handleScanPage = () => {
    setLoading(true);
    setAutofillSuccess(null);
    
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, { action: "SCAN_PAGE" }, (response) => {
            setLoading(false);
            if (chrome.runtime.lastError) {
              alert("无法连接到当前页面，请刷新求职网页后重试！");
              return;
            }
            if (response && response.success) {
              setCompany(response.company || "未知公司");
              setRoleTitle(response.title || "软件工程师");
              setJobDescription(response.jobDescription || "");
              setDetectedFields(response.fields || []);
              setPageScanned(true);
              
              // Automatically trigger standard direct mapping
              performInstantDirectMap(response.fields);
            }
          });
        } else {
          setLoading(false);
        }
      });
    } else {
      // Mock scanning in dev server browser
      setTimeout(() => {
        setLoading(false);
        setCompany("Replit");
        setRoleTitle("Software Engineer Intern");
        setJobDescription("We are looking for an ambitious Software Engineering Intern to build next-generation AI developer tools. Experience with React, TypeScript, and FastAPI is a big plus.");
        setDetectedFields([
          { id: "first_name", name: "first_name", label: "First Name", type: "text", required: true, options: [] },
          { id: "last_name", name: "last_name", label: "Last Name", type: "text", required: true, options: [] },
          { id: "email", name: "email", label: "Email", type: "text", required: true, options: [] },
          { id: "linkedin", name: "linkedin", label: "LinkedIn URL", type: "text", required: false, options: [] },
          { id: "why-replit", name: "why-replit", label: "Why are you interested in Replit?", type: "textarea", required: true, options: [] },
          { id: "sponsorship", name: "sponsorship", label: "Will you require visa sponsorship?", type: "select", required: true, options: ["Yes", "No"] }
        ]);
        setPageScanned(true);
        alert("正在使用本地 Mock 数据（仅限浏览器预览测试）");
      }, 800);
    }
  };

  // Immediate local mapping of simple fields for instant value loading
  const performInstantDirectMap = (fields: FormField[]) => {
    const instantMappings: FieldMapping[] = fields.map(field => {
      const labelLower = field.label.toLowerCase();
      const idLower = field.id.toLowerCase();
      
      let mappedValue: any = null;
      let confidence = 0.8; // Default confidence to 0.8 for unmapped fields per user request
      let mappingType = "manual_review";
      let needsReview = true;

      // Match name
      if (labelLower === "name" || labelLower.includes("full name") || labelLower.includes("fullname") || idLower.includes("full_name") || idLower.includes("fullname") || idLower === "name") {
        mappedValue = `${profile.first_name} ${profile.last_name}`.trim();
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (labelLower.includes("first name") || idLower.includes("first_name")) {
        mappedValue = profile.first_name;
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (labelLower.includes("last name") || idLower.includes("last_name")) {
        mappedValue = profile.last_name;
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (labelLower.includes("email")) {
        mappedValue = profile.email;
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (labelLower.includes("phone")) {
        mappedValue = profile.phone;
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (labelLower.includes("linkedin")) {
        mappedValue = profile.linkedin;
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (labelLower.includes("github")) {
        mappedValue = profile.github;
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (labelLower.includes("portfolio") || labelLower.includes("website")) {
        mappedValue = profile.portfolio;
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (labelLower.includes("pronoun")) {
        mappedValue = profile.pronouns || "He/him";
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      } else if (["he/him", "she/her", "they/them", "xe/xem", "ze/hir", "ey/em", "hir/hir", "fae/faer", "hu/hu"].includes(labelLower)) {
        const userPronoun = (profile.pronouns || "He/him").toLowerCase();
        mappedValue = (labelLower === userPronoun);
        confidence = 1.0;
        mappingType = "direct";
        needsReview = false;
      }
      // Match custom saved fields from previous submissions
      else if (profile.custom_fields && Object.keys(profile.custom_fields).some(k => k.toLowerCase() === labelLower)) {
        const matchingKey = Object.keys(profile.custom_fields).find(k => k.toLowerCase() === labelLower);
        mappedValue = matchingKey ? profile.custom_fields[matchingKey] : null;
        confidence = 0.9;
        mappingType = "direct";
        needsReview = false;
      }
      
      // Match EEO Fields (Gender, Race, Veteran)
      else if (labelLower.includes("gender")) {
        mappingType = "select_option";
        const target = (profile.gender || "Decline to Self Identify").toLowerCase();
        let found = field.options.find(opt => opt.toLowerCase().includes(target) || target.includes(opt.toLowerCase()));
        if (!found) {
          const keywords = ["decline", "prefer not", "choose not", "state"];
          found = field.options.find(opt => keywords.some(kw => opt.toLowerCase().includes(kw)));
        }
        mappedValue = found || profile.gender || "Decline to Self Identify";
        confidence = 0.9;
        needsReview = false;
      } else if (labelLower.includes("race") || labelLower.includes("ethnicity")) {
        mappingType = "select_option";
        const target = (profile.race || "Decline to Self Identify").toLowerCase();
        let found = field.options.find(opt => opt.toLowerCase().includes(target) || target.includes(opt.toLowerCase()));
        if (!found) {
          const keywords = ["decline", "prefer not", "choose not", "state"];
          found = field.options.find(opt => keywords.some(kw => opt.toLowerCase().includes(kw)));
        }
        mappedValue = found || profile.race || "Decline to Self Identify";
        confidence = 0.9;
        needsReview = false;
      } else if (labelLower.includes("veteran")) {
        mappingType = "select_option";
        const target = (profile.veteran_status || "I am not a protected veteran").toLowerCase();
        let found = field.options.find(opt => opt.toLowerCase().includes(target) || target.includes(opt.toLowerCase()));
        if (!found) {
          const keywords = ["not a protected veteran", "not veteran", "decline", "prefer not", "choose not"];
          found = field.options.find(opt => keywords.some(kw => opt.toLowerCase().includes(kw)));
        }
        mappedValue = found || profile.veteran_status || "I am not a protected veteran";
        confidence = 0.9;
        needsReview = false;
      }
      // Match Dropdowns e.g. sponsorship
      else if (labelLower.includes("sponsorship") || (labelLower.includes("visa") && labelLower.includes("require"))) {
        mappingType = "select_option";
        const targetVal = profile.requires_sponsorship ? "Yes" : "No";
        let found = targetVal;
        if (field.options && field.options.length > 0) {
          found = field.options.find(opt => opt.toLowerCase() === targetVal.toLowerCase()) || 
                  field.options.find(opt => opt.toLowerCase().includes(targetVal.toLowerCase())) || 
                  field.options[0];
        }
        mappedValue = found;
        confidence = 0.9;
        needsReview = false;
      }
      
      // Match Terms & Conditions / Acknowledgement checkboxes
      else if (labelLower.includes("agree") || labelLower.includes("terms") || labelLower.includes("acknowledge") || labelLower.includes("understand") || labelLower.includes("read") || labelLower.includes("declaration") || labelLower.includes("consent")) {
        mappingType = "direct";
        mappedValue = true;
        confidence = 1.0;
        needsReview = false;
      }

      // Check if it is a short answer question
      else if (field.type === "textarea" || labelLower.includes("why") || labelLower.includes("tell me") || labelLower.includes("describe")) {
        mappingType = "ai_generate";
        mappedValue = ""; // Needs AI Generation
        confidence = 0.0;
        needsReview = true;
      }

      return {
        field_id: field.id,
        field_label: field.label,
        field_type: field.type,
        mapping_type: mappingType,
        mapped_value: mappedValue,
        confidence,
        needs_review: needsReview
      };
    });

    setMappings(instantMappings);

    // Profile Vault Mapping Diagnostics Console Log
    const missingRequired: any[] = [];
    const missingOptional: any[] = [];
    const readyToFill: any[] = [];
    const needsAIGenerated: any[] = [];

    instantMappings.forEach(m => {
      const isFieldRequired = fields.find(df => df.id === m.field_id)?.required || false;
      const isEmpty = m.mapped_value === null || m.mapped_value === undefined || String(m.mapped_value).trim() === "";

      if (m.mapping_type === "ai_generate" && isEmpty) {
        needsAIGenerated.push({ "Field Label": m.field_label, "Action Required": "🧠 使用 Gemini AI 定制简答题答案" });
      } else if (isEmpty) {
        const item = { "Field Label": m.field_label, "Field ID": m.field_id, "Type": m.field_type };
        if (isFieldRequired) {
          missingRequired.push(item);
        } else {
          missingOptional.push(item);
        }
      } else {
        readyToFill.push({ "Field Label": m.field_label, "Mapped Value": m.mapped_value, "Source": m.mapping_type === "direct" ? "👤 个人档案库" : "⚙️ 选项匹配" });
      }
    });

    console.log("[ApplyPilot] 📋 ======= ANALYSIS: WHAT WE MATCHED (What we saw) =======");
    if (readyToFill.length > 0) {
      console.log("[ApplyPilot] ✅ MAPPED FIELDS (Ready to autofill immediately):");
      console.table(readyToFill);
    } else {
      console.log("[ApplyPilot] ℹ️ No fields were mapped automatically from the Profile Vault.");
    }

    console.log("[ApplyPilot] ⚠️ ======= SUPPLEMENT ANALYSIS: WHAT TO FILL OUT FIRST =======");
    if (needsAIGenerated.length > 0) {
      console.log("[ApplyPilot] 🧠 AI DRAFTS NEEDED (Need Gemini generation before filling):");
      console.table(needsAIGenerated);
    }
    
    if (missingRequired.length > 0) {
      console.warn("[ApplyPilot] ❌ CRITICAL MISSING REQUIRED FIELDS (Must supplement first!):");
      console.table(missingRequired);
      console.log("[ApplyPilot] 💡 Tip: You can type these manually inside the Sidebar inputs, or add them to your [Profile Vault] and scan again.");
    }

    if (missingOptional.length > 0) {
      console.log("[ApplyPilot] 📄 OPTIONAL MISSING FIELDS (Can supplement if desired):");
      console.table(missingOptional);
    }
    console.log("[ApplyPilot] ================================================================");

    // Automatically trigger instant autofill on the page for all successfully matched fields immediately on scan!
    const fillableMappings = instantMappings.filter(m => m.mapped_value !== null && m.mapped_value !== undefined && String(m.mapped_value).trim() !== "");
    if (fillableMappings.length > 0) {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]?.id) {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: "AUTOFILL_FIELDS",
              mappings: instantMappings
            }, (res) => {
              if (res && res.success) {
                setAutofillSuccess(`🎉 扫描完成！已为您瞬间自动填充了 ${res.filledCount} 个匹配字段！`);
              }
            });
          }
        });
      }
    }
  };

  // Calls backend FastAPI service to map fields and generate high-quality AI answers using Gemini
  const handleAIGenerateAnswers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${profile.backend_url || "http://localhost:8000"}/api/map-fields`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Gemini-API-Key": profile.gemini_api_key || ""
        },
        body: JSON.stringify({

          profile,
          job: {
            company,
            role: roleTitle,
            location: profile.location,
            description: jobDescription,
            requirements: []
          },
          fields: detectedFields
        })
      });

      if (!response.ok) {
        throw new Error("后端连接失败");
      }

      const aiMappings: FieldMapping[] = await response.json();
      setMappings(aiMappings);
    } catch (e: any) {
      alert("AI 生成失败，请确保本地 FastAPI 后端正在运行 (http://localhost:8000)，且已配置 GEMINI_API_KEY！\n我们将使用 Mock AI 回答以供调试。");
      
      // Fallback Mock answers
      const mockAIMappings = mappings.map(m => {
        if (m.mapping_type === "ai_generate") {
          return {
            ...m,
            mapped_value: `作为一名热爱开发者生态的工程师，我非常向往加入 ${company} 的 ${roleTitle} 岗位。我曾在我的代表性项目 ApplyPilot 中使用 React 和 FastAPI，不仅提升了系统的高并发读取表现，也锻炼了利用大语言模型解决具体用户问题的技能。这正好契合贵司对全栈开发及 AI 工具应用的技术栈要求。我极具自驱力，并期望能够成为团队的一员。`,
            confidence: 0.9,
            needs_review: true,
            reasoning: "结合用户最自豪的 ApplyPilot AI 项目进行了针对性展开"
          };
        }
        return m;
      });
      setMappings(mockAIMappings);
    } finally {
      setLoading(false);
    }
  };

  // Handles updating generated field in the UI dynamically
  const handleFieldChange = (fieldId: string, value: string) => {
    setMappings(prev => prev.map(m => m.field_id === fieldId ? { ...m, mapped_value: value } : m));
  };

  // Injects the final mapped values back into the active job webpage
  const handleAutofillAction = () => {
    // Automatically update profile vault with newly filled/modified values!
    const updatedProfile = { ...profile };
    let profileUpdated = false;

    mappings.forEach(m => {
      if (m.mapped_value && String(m.mapped_value).trim() !== "") {
        const labelLower = m.field_label.toLowerCase();
        const idLower = m.field_id.toLowerCase();

        if (labelLower.includes("first name") || idLower.includes("first_name")) {
          if (profile.first_name !== m.mapped_value) { updatedProfile.first_name = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("last name") || idLower.includes("last_name")) {
          if (profile.last_name !== m.mapped_value) { updatedProfile.last_name = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("email")) {
          if (profile.email !== m.mapped_value) { updatedProfile.email = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("phone")) {
          if (profile.phone !== m.mapped_value) { updatedProfile.phone = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("linkedin")) {
          if (profile.linkedin !== m.mapped_value) { updatedProfile.linkedin = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("github")) {
          if (profile.github !== m.mapped_value) { updatedProfile.github = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("portfolio") || labelLower.includes("website")) {
          if (profile.portfolio !== m.mapped_value) { updatedProfile.portfolio = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("gender")) {
          if (profile.gender !== m.mapped_value) { updatedProfile.gender = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("race") || labelLower.includes("ethnicity")) {
          if (profile.race !== m.mapped_value) { updatedProfile.race = m.mapped_value; profileUpdated = true; }
        } else if (labelLower.includes("veteran")) {
          if (profile.veteran_status !== m.mapped_value) { updatedProfile.veteran_status = m.mapped_value; profileUpdated = true; }
        } else if (m.mapping_type !== "ai_generate") {
          if (!updatedProfile.custom_fields) {
            updatedProfile.custom_fields = {};
          }
          
          const newKey = m.field_label;
          const cleanKey = newKey.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          let similarKey = "";
          let isDuplicate = false;
          
          // Check standard profile fields first
          const standardKeys = ["first_name", "last_name", "email", "phone", "location", "linkedin", "github", "portfolio", "gender", "race", "veteran_status", "pronouns"];
          for (const stdKey of standardKeys) {
            const cleanStd = stdKey.replace(/_/g, '');
            if (cleanKey.includes(cleanStd) || cleanStd.includes(cleanKey)) {
              isDuplicate = true;
              similarKey = `标准档案字段: ${stdKey}`;
              break;
            }
          }
          
          // Check existing custom_fields
          if (!isDuplicate) {
            for (const existingKey of Object.keys(updatedProfile.custom_fields)) {
              const cleanExisting = existingKey.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (cleanKey === cleanExisting || cleanKey.includes(cleanExisting) || cleanExisting.includes(cleanKey)) {
                isDuplicate = true;
                similarKey = existingKey;
                break;
              }
            }
          }
          
          if (isDuplicate) {
            // Found similar key! Prompt user
            const currentVal = similarKey.includes('标准') 
              ? (updatedProfile as any)[similarKey.split(': ')[1]] 
              : updatedProfile.custom_fields[similarKey];
              
            if (currentVal !== m.mapped_value) {
              const confirmSave = window.confirm(`⚠️ 检测到档案库中已有类似信息：\n「${similarKey}」 (当前保存的值: "${currentVal}")\n\n您刚刚填写的新项是：\n「${newKey}」 = "${m.mapped_value}"\n\n是否用此新值更新原有字段？\n(点击【确定】更新，点击【取消】保留原样以防止档案中保存多个重复条目)`);
              if (confirmSave) {
                if (similarKey.includes('标准')) {
                  const stdField = similarKey.split(': ')[1];
                  (updatedProfile as any)[stdField] = m.mapped_value;
                } else {
                  updatedProfile.custom_fields[similarKey] = m.mapped_value;
                }
                profileUpdated = true;
              }
            }
          } else {
            // Completely new unique field
            updatedProfile.custom_fields[newKey] = m.mapped_value;
            profileUpdated = true;
          }
        }
      }
    });

    if (profileUpdated) {
      saveProfile(updatedProfile);
      console.log("[ApplyPilot] 💾 Mapped values successfully synced back to Profile Vault!");
    }

    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "AUTOFILL_FIELDS",
            mappings
          }, (response) => {
            if (response && response.success) {
              setAutofillSuccess(`成功填充了 ${response.filledCount} 个字段！`);
              
              // Log this in application history
              const newHistory = [
                { company, role: roleTitle, date: new Date().toISOString().split('T')[0], status: 'Reviewed' },
                ...history.filter(h => h.company !== company)
              ];
              setHistory(newHistory);
              if (typeof chrome !== 'undefined' && chrome.storage) {
                chrome.storage.local.set({ applyHistory: newHistory });
              } else {
                localStorage.setItem('applyHistory', JSON.stringify(newHistory));
              }
            }
          });
        }
      });
    } else {
      // Mock autofill alert in sandbox browser
      alert(`表单自动填充成功！\n数据已被发送至 DOM 节点并触发了 React Change 事件。\n共填写了 ${mappings.filter(m => m.mapped_value).length} 个字段。 并已同步更新至个人档案库！`);
      setAutofillSuccess("填充模拟成功！");
    }
  };

  return (
    <div className="app-container">
      <div className="ambient-glow-1"></div>
      <div className="ambient-glow-2"></div>
      
      {/* Header */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">A</div>
          <div>
            <h1 className="logo-text">ApplyPilot</h1>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>AI 求职助推器</p>
          </div>
          <span className="logo-badge">Beta</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={pageScanned ? "pulse-indicator" : "pulse-indicator pulse-yellow"}></span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            {pageScanned ? "已锁定表单" : "等待页面"}
          </span>
        </div>
      </header>

      {/* Tabs Menu */}
      <nav className="tabs-nav">
        <button 
          className={`tab-btn ${activeTab === 'apply' ? 'active' : ''}`}
          onClick={() => setActiveTab('apply')}
        >
          <Sparkles size={16} /> 投递匹配
        </button>
        <button 
          className={`tab-btn ${activeTab === 'copy' ? 'active' : ''}`}
          onClick={() => setActiveTab('copy')}
        >
          <FileText size={16} /> 快速复制
        </button>
        <button 
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} /> 档案库
        </button>
        <button 
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} /> 智能对话
        </button>
      </nav>

      {/* Main Container */}
      <main className="tab-content">
        
        {/* TAB 1: APPLY PILOT ACTION PANEL */}
        {activeTab === 'apply' && (
          <>
            {!pageScanned ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <Briefcase size={40} style={{ color: 'var(--primary)', marginBottom: '16px', opacity: 0.8 }} />
                <h3 className="card-title" style={{ justifyContent: 'center' }}>开启一键表单秒填</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.5 }}>
                  请在 Chrome 浏览器中打开 LinkedIn、Greenhouse、Lever 或 Ashby 的求职申请页面，然后点击下方按钮扫描网页表单。
                </p>
                <button 
                  onClick={handleScanPage} 
                  disabled={loading} 
                  className="btn-primary"
                >
                  {loading ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
                  {loading ? "正在解析页面..." : "立即扫描当前表单"}
                </button>
              </div>
            ) : (
              <>
                {/* Job Card */}
                <div className="glass-card active-job">
                  <span style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Active Job Profile
                  </span>
                  <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.25rem', marginTop: '4px' }}>
                    {roleTitle}
                  </h2>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {company}
                  </p>
                  
                  <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                    <span className="confidence-pill confidence-high" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> {detectedFields.length} 个字段已扫描
                    </span>
                  </div>
                </div>



                {/* AI Answers triggers */}
                {mappings.some(m => m.mapping_type === "ai_generate" && m.mapped_value === "") && (
                  <div className="glass-card" style={{ border: '1px solid rgba(168, 85, 247, 0.3)', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.05) 0%, transparent 100%)' }}>
                    <h3 className="card-title" style={{ color: '#c084fc' }}>
                      <Sparkles size={16} /> 简答题 AI 生成
                    </h3>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.4 }}>
                      检测到当前表单有开放式的简答题（如 “Why this company?”），点击下方按钮让 Gemini 结合您的经历量身定制一份高分草稿。
                    </p>
                    <button 
                      onClick={handleAIGenerateAnswers} 
                      disabled={loading} 
                      className="btn-primary"
                    >
                      {loading ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
                      {loading ? "正在生成高分答案..." : "使用 Gemini 定制简答题答案"}
                    </button>
                  </div>
                )}

                {/* Form fields editor & review */}
                <div className="glass-card">
                  <h3 className="card-title">
                    <CheckCircle2 size={16} style={{ color: 'var(--text-success)' }} /> 待填表单字段审阅
                  </h3>
                  <p className="card-subtitle">
                    我们在本地帮您锁定了以下映射，并在填充前供您审阅并微调：
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {mappings.filter(m => m.needs_review || !m.mapped_value || String(m.mapped_value).trim() === "").length === 0 ? (
                      <div style={{ 
                        textAlign: 'center', 
                        padding: '30px 10px', 
                        color: 'var(--text-success)', 
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        border: '1px dashed rgba(16, 185, 129, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        background: 'rgba(16, 185, 129, 0.02)'
                      }}>
                        🎉 所有常规字段已完美自动匹配，无需任何检查！<br/>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginTop: '6px', display: 'block' }}>
                          （姓名、邮箱、电话、代词、社交链接、民主党派、 sponsorship 等已在后台备妥）
                        </span>
                      </div>
                    ) : (
                      mappings.filter(m => m.needs_review || !m.mapped_value || String(m.mapped_value).trim() === "").map((mapping, idx) => (
                        <div key={mapping.field_id} className="form-group" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)', paddingBottom: '12px' }}>
                          <div className="form-label">
                            <span>
                              {mapping.field_label}
                              {detectedFields.find(f => f.id === mapping.field_id)?.required && (
                                <span style={{ color: 'var(--text-danger)', marginLeft: '4px' }}>*</span>
                              )}
                            </span>
                            <span className={`confidence-pill ${mapping.confidence >= 0.8 ? 'confidence-high' : 'confidence-low'}`}>
                              {mapping.mapping_type === 'ai_generate' ? 'AI 简答' : mapping.confidence >= 0.8 ? '自动匹配' : '需确认'}
                            </span>
                          </div>
                          
                          {mapping.field_type === 'textarea' || mapping.mapping_type === 'ai_generate' ? (
                            <textarea 
                              value={mapping.mapped_value || ''}
                              onChange={(e) => handleFieldChange(mapping.field_id, e.target.value)}
                              className="input-glass"
                              placeholder="AI 会在此处生成回答，您也可以直接修改..."
                              rows={4}
                            />
                          ) : (
                            <input 
                              type="text"
                              value={mapping.mapped_value || ''}
                              onChange={(e) => handleFieldChange(mapping.field_id, e.target.value)}
                              className="input-glass"
                              placeholder="未匹配到，请手动输入..."
                            />
                          )}
                          {mapping.reasoning && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                              💡 {mapping.reasoning}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {autofillSuccess && (
                    <div style={{ 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      color: 'var(--text-success)', 
                      padding: '12px', 
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <CheckCircle2 size={16} /> {autofillSuccess}
                    </div>
                  )}

                  {/* Main Action Trigger */}
                  <button 
                    onClick={handleAutofillAction}
                    className="btn-primary" 
                    style={{ marginTop: '16px' }}
                  >
                    <Send size={18} /> 🚀 一键填充到浏览器页面
                  </button>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '10px' }}>
                    💡 自动填充不会帮您递交。请在页面确认无误后再自行提交。
                  </p>
                </div>
                <button 
                  onClick={handleScanPage}
                  style={{ 
                    background: 'transparent', 
                    border: '1px solid var(--border-glass)', 
                    color: 'var(--text-muted)',
                    padding: '10px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <RefreshCw size={14} /> 重新扫描当前网页
                </button>
              </>
            )}

          </>
        )}

        {/* TAB 2: RESUME QUICK-COPY DASHBOARD */}
        {activeTab === 'copy' && (
          <div className="glass-card" style={{ border: '1px solid rgba(168, 85, 247, 0.15)' }}>
            <h3 className="card-title" style={{ color: '#c084fc', marginBottom: '8px', fontSize: '0.95rem' }}>
              📋 简历档案快速复制
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.4 }}>
              在遇到防爬或无法自动填充的表单时，您可在此一键复制档案信息，直接粘贴到目标页面中。
            </p>

            {/* Sub-tab pills */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(255, 255, 255, 0.02)', padding: '3px', borderRadius: 'var(--radius-sm)', marginBottom: '14px', overflowX: 'auto', whiteSpace: 'nowrap' }}>
              <button 
                onClick={() => setActiveCopyCategory('info')}
                className={`copy-tab-btn ${activeCopyCategory === 'info' ? 'active' : ''}`}
                style={{ flex: 1, minWidth: '70px', textAlign: 'center' }}
              >
                👤 基本
              </button>
              <button 
                onClick={() => setActiveCopyCategory('exp')}
                className={`copy-tab-btn ${activeCopyCategory === 'exp' ? 'active' : ''}`}
                style={{ flex: 1, minWidth: '70px', textAlign: 'center' }}
              >
                💼 工作
              </button>
              <button 
                onClick={() => setActiveCopyCategory('edu')}
                className={`copy-tab-btn ${activeCopyCategory === 'edu' ? 'active' : ''}`}
                style={{ flex: 1, minWidth: '70px', textAlign: 'center' }}
              >
                🎓 教育
              </button>
              <button 
                onClick={() => setActiveCopyCategory('skills')}
                className={`copy-tab-btn ${activeCopyCategory === 'skills' ? 'active' : ''}`}
                style={{ flex: 1, minWidth: '70px', textAlign: 'center' }}
              >
                🛠️ 技能
              </button>
            </div>

            {/* Category contents */}
            <div style={{ maxHeight: 'calc(100vh - 220px)', overflowY: 'auto', paddingRight: '4px' }}>
              {activeCopyCategory === 'info' && (
                <>
                  {renderCopyRow("姓氏 (Last Name)", profile.last_name, "c-lastname")}
                  {renderCopyRow("名字 (First Name)", profile.first_name, "c-firstname")}
                  {renderCopyRow("姓名全称 (Full Name)", `${profile.first_name} ${profile.last_name}`.trim(), "c-fullname")}
                  {renderCopyRow("电子邮箱 (Email)", profile.email, "c-email")}
                  {renderCopyRow("联系电话 (Phone)", profile.phone, "c-phone")}
                  {renderCopyRow("常住地区 (Location)", profile.location, "c-location")}
                  {renderCopyRow("代词 (Pronouns)", profile.pronouns, "c-pronouns")}
                  {renderCopyRow("LinkedIn URL", profile.linkedin, "c-linkedin")}
                  {renderCopyRow("GitHub URL", profile.github, "c-github")}
                  {renderCopyRow("个人主页/作品集", profile.portfolio, "c-portfolio")}
                </>
              )}

              {activeCopyCategory === 'exp' && (
                <>
                  {profile.experience && profile.experience.length > 0 ? (
                    profile.experience.map((exp: any, index: number) => {
                      const descText = Array.isArray(exp.description) ? exp.description.join("\n") : exp.description;
                      return (
                        <div key={index} style={{ borderBottom: index < profile.experience.length - 1 ? '1px dashed rgba(255, 255, 255, 0.05)' : 'none', paddingBottom: '12px', marginBottom: '12px' }}>
                          <div style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700, marginBottom: '8px' }}>
                            工作经历 {index + 1}
                          </div>
                          {renderCopyRow("公司名称 (Company)", exp.company, `c-exp-comp-${index}`)}
                          {renderCopyRow("岗位名称 (Job Title)", exp.role, `c-exp-role-${index}`)}
                          {renderCopyRow("工作地点 (Location)", exp.location, `c-exp-loc-${index}`)}
                          {renderCopyRow("在职时间 (From - To)", `${exp.start_date} - ${exp.end_date}`, `c-exp-dates-${index}`)}
                          {renderCopyRow("岗位职责 (Role Description)", descText, `c-exp-desc-${index}`)}
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                      暂无工作经历数据。
                    </p>
                  )}
                </>
              )}

              {activeCopyCategory === 'edu' && (
                <>
                  {profile.education && profile.education.length > 0 ? (
                    profile.education.map((edu: any, index: number) => (
                      <div key={index} style={{ borderBottom: index < profile.education.length - 1 ? '1px dashed rgba(255, 255, 255, 0.05)' : 'none', paddingBottom: '12px', marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700, marginBottom: '8px' }}>
                          教育经历 {index + 1}
                        </div>
                        {renderCopyRow("学校名称 (School)", edu.school, `c-edu-school-${index}`)}
                        {renderCopyRow("学位学历 (Degree)", edu.degree, `c-edu-deg-${index}`)}
                        {renderCopyRow("所学专业 (Major)", edu.major, `c-edu-maj-${index}`)}
                        {renderCopyRow("就读时间 (From - To)", `${edu.start_date} - ${edu.end_date}`, `c-edu-dates-${index}`)}
                        {renderCopyRow("平均绩点 (GPA)", edu.gpa, `c-edu-gpa-${index}`)}
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>
                      暂无教育经历数据。
                    </p>
                  )}
                </>
              )}

              {activeCopyCategory === 'skills' && (
                <>
                  {renderCopyRow("专业技能清单", profile.skills, "c-skills")}
                  {profile.projects && profile.projects.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 700, marginBottom: '8px' }}>
                        核心项目展示
                      </div>
                      {renderCopyRow("项目名称 (Title)", profile.projects[0].title, "c-proj-title")}
                      {renderCopyRow("项目职责/描述 (Role Description)", profile.projects[0].description, "c-proj-desc")}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PROFILE VAULT EDITOR */}
        {activeTab === 'profile' && (
          <div className="glass-card">
            <h3 className="card-title">
              <Lock size={16} style={{ color: 'var(--primary)' }} /> 个人档案保险库 (Vault)
            </h3>
            <p className="card-subtitle">
              您的档案数据仅保存在浏览器本地，隐私安全受到绝对保护。
            </p>

            {/* Resume Upload Box */}
            <div className="glass-card" style={{ 
              border: '1px dashed rgba(168, 85, 247, 0.4)', 
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.03) 0%, transparent 100%)',
              padding: '20px',
              textAlign: 'center',
              position: 'relative',
              cursor: 'pointer',
              marginBottom: '20px'
            }}>
              <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '8px', opacity: 0.8 }} />
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e9d5ff' }}>导入简历一键生成档案</h4>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                支持 PDF 或 TXT 简历。AI 将自动分析提取姓名、联系方式、社交链接和技能，帮您瞬间填充未来的求职表单！
              </p>
              
              <input 
                type="file" 
                accept=".pdf,.txt" 
                onChange={handleResumeUpload}
                disabled={uploadingResume}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  opacity: 0,
                  cursor: 'pointer'
                }}
              />
              
              {uploadingResume && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  background: 'rgba(11, 7, 19, 0.95)',
                  borderRadius: 'inherit',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px'
                }}>
                  <RefreshCw size={24} className="spin" style={{ color: 'var(--primary)' }} />
                  <span style={{ fontSize: '0.8rem', color: '#e9d5ff' }}>{uploadStatus}</span>
                </div>
              )}
            </div>

            {uploadStatus && !uploadingResume && (
              <div style={{ 
                background: 'rgba(16, 185, 129, 0.1)', 
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--text-success)', 
                padding: '12px', 
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle2 size={16} /> {uploadStatus}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* API & Backend connection settings (Premium Web-Store Ready Glass Container) */}
              <div style={{
                background: 'rgba(168, 85, 247, 0.05)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                padding: '14px',
                borderRadius: 'var(--radius-md)',
                marginBottom: '10px'
              }}>
                <h4 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#c084fc', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  🔑 API 与连接设置 (Web Store 独立发布支持)
                </h4>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '10px', lineHeight: 1.3 }}>
                  支持自主配置 API 与后端。如需发布或在线使用，可在此配置您的密钥或在线服务器地址。
                </p>
                
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '0.7rem', color: '#e9d5ff' }}>Gemini API Key (可选，留空则使用后端默认配置)</label>
                  <input 
                    type="password" 
                    value={profile.gemini_api_key || ''} 
                    onChange={e => saveProfile({ ...profile, gemini_api_key: e.target.value })}
                    className="input-glass"
                    placeholder="AI_zaSy..."
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.7rem', color: '#e9d5ff' }}>后端 API 接口地址</label>
                  <input 
                    type="text" 
                    value={profile.backend_url || 'http://localhost:8000'} 
                    onChange={e => saveProfile({ ...profile, backend_url: e.target.value })}
                    className="input-glass"
                    placeholder="http://localhost:8000"
                    style={{ fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">First Name</label>

                <input 
                  type="text" 
                  value={profile.first_name} 
                  onChange={e => saveProfile({ ...profile, first_name: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Last Name</label>
                <input 
                  type="text" 
                  value={profile.last_name} 
                  onChange={e => saveProfile({ ...profile, last_name: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  value={profile.email} 
                  onChange={e => saveProfile({ ...profile, email: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone</label>
                <input 
                  type="text" 
                  value={profile.phone} 
                  onChange={e => saveProfile({ ...profile, phone: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input 
                  type="text" 
                  value={profile.linkedin} 
                  onChange={e => saveProfile({ ...profile, linkedin: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div className="form-group">
                <label className="form-label">GitHub URL</label>
                <input 
                  type="text" 
                  value={profile.github} 
                  onChange={e => saveProfile({ ...profile, github: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Portfolio / Website</label>
                <input 
                  type="text" 
                  value={profile.portfolio} 
                  onChange={e => saveProfile({ ...profile, portfolio: e.target.value })}
                  className="input-glass"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Visa Sponsorship Required?</label>
                <select 
                  value={profile.requires_sponsorship ? "yes" : "no"}
                  onChange={e => saveProfile({ ...profile, requires_sponsorship: e.target.value === "yes" })}
                  className="input-glass"
                  style={{ background: 'rgba(11, 7, 19, 0.8)' }}
                >
                  <option value="no">No (不需要工作签证担保)</option>
                  <option value="yes">Yes (需要工作签证担保)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Gender (EEO demographic option)</label>
                <input 
                  type="text" 
                  value={profile.gender} 
                  onChange={e => saveProfile({ ...profile, gender: e.target.value })}
                  className="input-glass"
                  placeholder="e.g. Decline to Self Identify"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Race / Ethnicity (EEO demographic option)</label>
                <input 
                  type="text" 
                  value={profile.race} 
                  onChange={e => saveProfile({ ...profile, race: e.target.value })}
                  className="input-glass"
                  placeholder="e.g. Decline to Self Identify"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Veteran Status (EEO demographic option)</label>
                <input 
                  type="text" 
                  value={profile.veteran_status} 
                  onChange={e => saveProfile({ ...profile, veteran_status: e.target.value })}
                  className="input-glass"
                  placeholder="e.g. I am not a protected veteran"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Pronouns</label>
                <input 
                  type="text" 
                  value={profile.pronouns} 
                  onChange={e => saveProfile({ ...profile, pronouns: e.target.value })}
                  className="input-glass"
                  placeholder="e.g. He/him"
                />
              </div>

              <div className="form-group">
                <label className="form-label">高亮项目经历 (结合 AI 简答使用)</label>
                <textarea 
                  value={profile.projects[0]?.title ? `${profile.projects[0].title}: ${profile.projects[0].description}` : ''} 
                  onChange={e => {
                    const text = e.target.value;
                    const splitIndex = text.indexOf(":");
                    const title = splitIndex !== -1 ? text.substring(0, splitIndex).trim() : "核心项目";
                    const description = splitIndex !== -1 ? text.substring(splitIndex + 1).trim() : text;
                    const updatedProjects = [{ title, description, tech_stack: profile.projects[0]?.tech_stack || '' }];
                    // @ts-ignore
                    saveProfile({ ...profile, projects: updatedProjects });
                  }}
                  className="input-glass"
                  rows={4}
                  placeholder="项目名称: 项目详细描述（使用了什么技术、解决了什么难点...）"
                />
              </div>

              <div className="form-group">
                <label className="form-label">核心技能清单 (逗号隔开)</label>
                <input 
                  type="text" 
                  value={profile.skills} 
                  onChange={e => saveProfile({ ...profile, skills: e.target.value })}
                  className="input-glass"
                />
              </div>

              <button 
                onClick={() => {
                  saveProfile(profile);
                  alert("🎉 本地个人档案保存成功！数据已安全加密存储。");
                }}
                className="btn-primary"
                style={{ marginTop: '10px' }}
              >
                <Save size={18} /> 保存更改
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: AI CAREER CHATBOT */}
        {activeTab === 'chat' && (
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', padding: '16px', boxSizing: 'border-box' }}>
            <h3 className="card-title" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '10px', marginBottom: '10px' }}>
              <MessageSquare size={16} style={{ color: 'var(--primary)' }} /> ApplyPilot AI 智能问答
            </h3>
            
            {/* Message List */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '12px',
              paddingBottom: '10px',
              marginBottom: '10px',
              maxHeight: 'calc(100% - 130px)'
            }}>
              {chatHistory.map((msg, idx) => (
                <div key={idx} style={{ 
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.role === 'user' ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'rgba(255, 255, 255, 0.03)',
                  border: msg.role === 'user' ? 'none' : '1px solid var(--border-glass)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: '#f3f4f6',
                  fontSize: '0.85rem',
                  lineHeight: 1.5,
                  boxShadow: 'var(--shadow-sm)'
                }}>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                  
                  {/* If the bot responded with a cover letter or contains standard content, show copy and download buttons */}
                  {msg.role === 'model' && (msg.content.includes("Dear") || msg.content.includes("Sincerely") || msg.content.includes("求职信") || msg.content.length > 200) && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          alert("📋 已成功复制求职信全文至剪贴板！");
                        }}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          color: '#e9d5ff',
                          fontSize: '0.7rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        复制全文
                      </button>
                      <button 
                        onClick={() => {
                          downloadTextFile(`${company || "Job"}_Cover_Letter.txt`, msg.content);
                          alert("📥 已成功下载求职信文本文件！");
                        }}
                        style={{
                          background: 'rgba(168, 85, 247, 0.15)',
                          border: '1px solid rgba(168, 85, 247, 0.3)',
                          color: '#f3e8ff',
                          fontSize: '0.7rem',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        下载文本 (.txt)
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {chatLoading && (
                <div style={{ 
                  alignSelf: 'flex-start',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-glass)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <RefreshCw size={14} className="spin" />
                  <span>AI 正在思考中，请稍候...</span>
                </div>
              )}
            </div>

            {/* Quick Action Suggestion Chips */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <button 
                onClick={() => handleSendChatMessage("请为我生成一封针对当前职位的 Cover Letter")}
                disabled={chatLoading}
                style={{
                  background: 'rgba(168, 85, 247, 0.08)',
                  border: '1px solid rgba(168, 85, 247, 0.2)',
                  color: '#d8b4fe',
                  fontSize: '0.7rem',
                  padding: '6px 10px',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                ✍️ 生成求职信
              </button>
              <button 
                onClick={() => handleSendChatMessage("结合我的简历，分析我申请该岗位的竞争优势和匹配度")}
                disabled={chatLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  fontSize: '0.7rem',
                  padding: '6px 10px',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                💡 分析匹配优势
              </button>
              <button 
                onClick={() => handleSendChatMessage("请基于当前职位描述，向我提问一个常见的面试问题，并指导我如何回答")}
                disabled={chatLoading}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: '#e2e8f0',
                  fontSize: '0.7rem',
                  padding: '6px 10px',
                  borderRadius: '20px',
                  cursor: 'pointer'
                }}
              >
                💬 模拟面试提问
              </button>
            </div>

            {/* Chat Input Bar */}
            <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '10px' }}>
              <input 
                type="text" 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSendChatMessage(); }}
                placeholder={pageScanned ? "向 AI 提问或要求定制求职信..." : "请先扫描网页表单以开启完整对话..."}
                disabled={chatLoading}
                className="input-glass"
                style={{ flex: 1, fontSize: '0.85rem' }}
              />
              <button 
                onClick={() => handleSendChatMessage()}
                disabled={chatLoading || !chatInput.trim()}
                className="btn-primary"
                style={{ padding: '0 16px', width: 'auto', flexShrink: 0 }}
              >
                发送
              </button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
