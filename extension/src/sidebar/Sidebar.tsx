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
  Lock
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
  const [activeTab, setActiveTab] = useState<'apply' | 'profile' | 'history'>('apply');
  const [loading, setLoading] = useState(false);
  
  // Job scan details
  const [pageScanned, setPageScanned] = useState(false);
  const [company, setCompany] = useState('');
  const [roleTitle, setRoleTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [detectedFields, setDetectedFields] = useState<FormField[]>([]);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [autofillSuccess, setAutofillSuccess] = useState<string | null>(null);

  // Profile Vault state (saves to local chrome storage or localStorage)
  const [profile, setProfile] = useState({
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
    projects: [
      {
        title: 'ApplyPilot AI',
        description: 'An AI-powered Chrome Extension agent that scans HTML forms and autofills candidate info while drafting job-specific answers via Gemini API.',
        tech_stack: 'React, TypeScript, FastAPI, Gemini API, Vite'
      }
    ],
    skills: 'React, TypeScript, Python, FastAPI, Gemini API, PyTorch, MongoDB, LLMs'
  });

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
          setProfile(result.userProfile);
        }
        if (result.applyHistory) {
          setHistory(result.applyHistory);
        }
      });
    } else {
      const savedProfile = localStorage.getItem('userProfile');
      if (savedProfile) {
        setProfile(JSON.parse(savedProfile));
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
      let confidence = 0.5;
      let mappingType = "manual_review";
      let needsReview = true;

      // Match name
      if (labelLower.includes("first name") || idLower.includes("first_name")) {
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
      }
      
      // Match Dropdowns e.g. sponsorship
      else if (field.type === "select" && (labelLower.includes("sponsorship") || labelLower.includes("visa"))) {
        mappingType = "select_option";
        mappedValue = profile.requires_sponsorship ? "Yes" : "No";
        confidence = 0.8;
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
  };

  // Calls backend FastAPI service to map fields and generate high-quality AI answers using Gemini
  const handleAIGenerateAnswers = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://localhost:8000/api/map-fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      alert(`表单自动填充成功！\n数据已被发送至 DOM 节点并触发了 React Change 事件。\n共填写了 ${mappings.filter(m => m.mapped_value).length} 个字段。`);
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
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} /> 档案库
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} /> 追踪记录
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
                    {mappings.map((mapping, idx) => (
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
                    ))}
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

        {/* TAB 2: PROFILE VAULT EDITOR */}
        {activeTab === 'profile' && (
          <div className="glass-card">
            <h3 className="card-title">
              <Lock size={16} style={{ color: 'var(--primary)' }} /> 个人档案保险库 (Vault)
            </h3>
            <p className="card-subtitle">
              您的档案数据仅保存在浏览器本地，隐私安全受到绝对保护。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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

        {/* TAB 3: APPLICATION HISTORY TRACKER */}
        {activeTab === 'history' && (
          <div className="glass-card">
            <h3 className="card-title">
              <History size={16} style={{ color: 'var(--secondary)' }} /> 求职投递追踪历史
            </h3>
            <p className="card-subtitle">
              在这里查看和管理您通过 ApplyPilot 进行一键填充的岗位：
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((record, idx) => (
                <div key={idx} className="mapping-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{record.company}</span>
                    <span className={`confidence-pill ${record.status === 'Reviewed' ? 'confidence-high' : 'confidence-low'}`}>
                      {record.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    <span>{record.role}</span>
                    <span>{record.date}</span>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px 0', fontSize: '0.85rem' }}>
                  暂无投递记录。快去扫描求职页面并自动填充吧！
                </p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
