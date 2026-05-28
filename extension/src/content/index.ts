// ApplyPilot Content Script - scans the DOM and handles direct form filling

console.log("[ApplyPilot AI] Content script active!");

// Interfaces matching backend definitions
interface FormFieldDetected {
  id: string;
  name: string;
  label: string;
  type: string;
  required: boolean;
  options: string[];
}

// Scoping helper for the web playground/simulator
function getSearchRoot(): HTMLElement {
  return (document.getElementById('mock-job-form-container') || document.body) as HTMLElement;
}

// Helper to clean extracted text content, stripping out ApplyPilot visual badges and Lever upload hints
function getCleanText(el: HTMLElement): string {
  // Clone element to prevent structural mutations
  const clone = el.cloneNode(true) as HTMLElement;
  
  // Remove ApplyPilot badges from the clone so their text is never scraped
  clone.querySelectorAll('.applypilot-inspect-badge').forEach(e => e.remove());
  
  // Remove Lever specific upload hints and details
  clone.querySelectorAll('.card-input-attachment-error, .card-input-attachment-success, .attachment-details').forEach(e => e.remove());
  
  let rawText = clone.textContent || "";
  
  // Extra string cleaning to safeguard against any inline texts
  return rawText
    .replace(/📝|待填写字段/gi, '')
    .replace(/👤|个人档案:?\s*[A-Za-z\s]*/gi, '')
    .replace(/📧|个人档案:?\s*[A-Za-z\s]*/gi, '')
    .replace(/🧠|Gemini\s*AI\s*简答题/gi, '')
    .replace(/⚙️|个人档案:?\s*[A-Za-z\s]*/gi, '')
    .replace(/🔗|个人档案:?\s*[A-Za-z\s]*/gi, '')
    .replace(/📞|个人档案:?\s*[A-Za-z\s]*/gi, '')
    .replace(/Couldn't auto-read resume\.\s*Analyzing resume\.\.\.\s*Success!/gi, '')
    .replace(/Couldn't auto-read resume/gi, '')
    .replace(/Analyzing resume\.\.\./gi, '')
    .replace(/Success!/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// 1. Helper to find label text associated with an input/select/textarea
function getFieldLabel(el: HTMLElement): string {
  const root = getSearchRoot();
  
  // Try finding standard label tag pointing to ID
  if (el.id) {
    const labelEl = root.querySelector(`label[for="${el.id}"]`) as HTMLElement;
    if (labelEl) {
      return getCleanText(labelEl);
    }
  }

  // Try finding parent label or siblings representing headings
  let parent = el.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL') {
      return getCleanText(parent);
    }
    // Also try finding siblings that are labels or spans representing headings
    const labelSibling = parent.querySelector('label, .label, .field-label, .jobs-field-label, .application-label') as HTMLElement;
    if (labelSibling) {
      return getCleanText(labelSibling);
    }
    parent = parent.parentElement;
  }

  // Fallback to placeholder, name or id
  const fallback = el.getAttribute('placeholder') || el.getAttribute('name') || el.id || "Unnamed Field";
  
  // Return clean string even for fallback attributes
  const div = document.createElement('div');
  div.textContent = fallback;
  return getCleanText(div);
}

// 2. Scrapes the Job Description text on the page
function getJobDescription(): string {
  const root = getSearchRoot();
  
  // Selectors matching LinkedIn, Greenhouse, Lever, Ashby, etc.
  const descriptionSelectors = [
    '.jobs-description', 
    '#job-details', 
    '#job-description', 
    '.job-description',
    '[data-automation-id="jobPostingDescription"]',
    '#content', 
    'main'
  ];

  for (const selector of descriptionSelectors) {
    const el = root.querySelector(selector);
    if (el && el.textContent) {
      return el.textContent.trim();
    }
  }
  
  // Fallback to body text
  return root.innerText.substring(0, 10000); 
}

// 3. Detects form fields on the page
function scanFormFields(): FormFieldDetected[] {
  const root = getSearchRoot();
  const fields: FormFieldDetected[] = [];
  
  // Focus on common input tags
  const inputs = root.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
  
  inputs.forEach((el, index) => {
    const htmlEl = el as HTMLElement;
    const tagName = htmlEl.tagName.toLowerCase();
    
    let type = "text";
    let options: string[] = [];
    
    if (tagName === 'textarea') {
      type = "textarea";
    } else if (tagName === 'select') {
      type = "select";
      const selectEl = htmlEl as HTMLSelectElement;
      options = Array.from(selectEl.options)
        .map(opt => opt.text.trim())
        .filter(text => text !== "");
    } else if (tagName === 'input') {
      const inputEl = htmlEl as HTMLInputElement;
      type = inputEl.type || "text";
    }
    
    // Ignore radio / checkbox groups and let AI map higher-level questions, but collect them for MVP
    const id = htmlEl.id || htmlEl.getAttribute('name') || `field-${index}`;
    const name = htmlEl.getAttribute('name') || "";
    const label = getFieldLabel(htmlEl);
    const required = htmlEl.hasAttribute('required') || htmlEl.getAttribute('aria-required') === 'true';
    
    // De-duplicate if same ID already added
    if (!fields.some(f => f.id === id)) {
      fields.push({
        id,
        name,
        label: label.replace(/\s+/g, ' ').replace(/\*|required/gi, '').trim(), // Clean label text
        type,
        required,
        options
      });
    }
  });
  
  return fields;
}

// 4. Injects value into element with full React/Vue compatibility
// Helper to safely find element by ID or name, completely immune to CSS selector syntax errors (like brackets in name attribute e.g. urls[LinkedIn])
function safeGetElement(fieldId: string): HTMLElement | null {
  const root = getSearchRoot();
  
  // 1. Check ID
  let el = document.getElementById(fieldId);
  if (el && root.contains(el)) return el;
  
  // 2. Check Name attribute
  const nameElements = document.getElementsByName(fieldId);
  for (let i = 0; i < nameElements.length; i++) {
    if (root.contains(nameElements[i])) {
      return nameElements[i] as HTMLElement;
    }
  }
  
  // 3. Fallback attribute query (escaped querySelector)
  try {
    const escaped = CSS.escape(fieldId);
    el = root.querySelector(`#${escaped}`) || root.querySelector(`[name="${escaped}"]`);
    if (el) return el as HTMLElement;
  } catch (e) {
    // Ignore selector syntax errors
  }
  
  // 4. Manual deep search of all inputs as a final fallback
  const allInputs = root.querySelectorAll('input, textarea, select');
  for (let i = 0; i < allInputs.length; i++) {
    const input = allInputs[i] as HTMLElement;
    if (input.id === fieldId || input.getAttribute('name') === fieldId) {
      return input;
    }
  }
  
  return null;
}

// 4. Injects value into element with full React/Vue compatibility
function injectValue(fieldId: string, value: any, type: string) {
  const root = getSearchRoot();
  const element = safeGetElement(fieldId) as any;
  
  if (!element) {
    console.warn(`[ApplyPilot] Target element not found for fieldId: ${fieldId}`);
    return;
  }

  // React/Vue setter bypasses
  const setInputValue = (el: HTMLInputElement, val: string) => {
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(el, val);
      } else {
        el.value = val;
      }
    } catch (e) {
      console.warn("[ApplyPilot] Input setter bypass failed, falling back to direct assignment", e);
      el.value = val;
    }
  };

  const setTextAreaValue = (el: HTMLTextAreaElement, val: string) => {
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(el, val);
      } else {
        el.value = val;
      }
    } catch (e) {
      console.warn("[ApplyPilot] Textarea setter bypass failed, falling back to direct assignment", e);
      el.value = val;
    }
  };

  const setCheckboxChecked = (el: HTMLInputElement, val: boolean) => {
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'checked')?.set;
      if (setter) {
        setter.call(el, val);
      } else {
        el.checked = val;
      }
    } catch (e) {
      console.warn("[ApplyPilot] Checkbox setter bypass failed, falling back to direct assignment", e);
      el.checked = val;
    }
  };

  const setSelectValue = (el: HTMLSelectElement, val: string) => {
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(el, val);
      } else {
        el.value = val;
      }
    } catch (e) {
      console.warn("[ApplyPilot] Select setter bypass failed, falling back to direct assignment", e);
      el.value = val;
    }
  };

  // Handle standard Text & Textarea inputs
  if (type === "text" || type === "textarea" || element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    if (element.type === "checkbox") {
      setCheckboxChecked(element, !!value);
    } else if (element.type === "radio") {
      // Find matching radio in group safely
      const name = element.getAttribute("name");
      if (name) {
        const allRadios = root.querySelectorAll('input[type="radio"]');
        allRadios.forEach((r: any) => {
          if (r.getAttribute("name") === name) {
            const isMatch = r.value.toLowerCase() === String(value).toLowerCase() || getFieldLabel(r).toLowerCase() === String(value).toLowerCase();
            setCheckboxChecked(r, isMatch);
            r.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
    } else if (element.tagName === "TEXTAREA") {
      setTextAreaValue(element, String(value));
    } else {
      setInputValue(element, String(value));
    }
  } 
  // Handle Dropdowns (Select elements)
  else if (element.tagName === "SELECT") {
    const select = element as HTMLSelectElement;
    let optionIndex = -1;
    let optionValue = "";
    
    // Alphanumeric helper for bulletproof option matching (e.g. Decline to Self Identify -> decline-to-self-identify)
    const clean = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const targetClean = clean(String(value));
    
    for (let i = 0; i < select.options.length; i++) {
      const option = select.options[i];
      const optValClean = clean(option.value);
      const optTextClean = clean(option.text);
      
      if (
        optValClean === targetClean || 
        optTextClean === targetClean || 
        optValClean.includes(targetClean) || 
        optTextClean.includes(targetClean) ||
        targetClean.includes(optValClean) ||
        targetClean.includes(optTextClean)
      ) {
        optionIndex = i;
        optionValue = option.value;
        break;
      }
    }
    
    if (optionIndex !== -1) {
      select.selectedIndex = optionIndex;
      setSelectValue(select, optionValue);
    }
  }

  // Dispatch standard events so frameworks update state immediately
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.dispatchEvent(new Event('blur', { bubbles: true }));
  
  // Highlight filled fields briefly to give high-end look
  const originalBorder = element.style.border;
  element.style.border = "2px solid #a855f7"; // Luxury purple border
  element.style.transition = "border 0.3s ease";
  setTimeout(() => {
    element.style.border = originalBorder;
  }, 1500);
}

// Helper to inject interactive visual badges below scanned form elements on the page (disabled per user request)
function injectFieldBadges(fields: FormFieldDetected[]) {
  // Disabled: No badges injected on target job pages
}

// Helper to update the visual state of field badges once auto-filled (disabled per user request)
function updateFieldBadges(mappings: any[]) {
  // Disabled: No badges injected on target job pages
}

// 5. Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[ApplyPilot] Received background message:", message.action);
  
  if (message.action === "SCAN_PAGE") {
    const root = getSearchRoot();
    const fields = scanFormFields();
    const jobDescription = getJobDescription();
    
    // Automatically inject visual form indicators on the webpage
    injectFieldBadges(fields);
    
    // Try to guess company & title from header
    const title = root.querySelector('h1, .job-title, .title')?.textContent?.trim() || document.title;
    const company = root.querySelector('.company-name, .company, .jobs-unified-top-card__company-name')?.textContent?.trim() || "Unknown Company";
    
    // Detailed, professional logging
    console.log("[ApplyPilot] 🔍 ======= REAL-TIME FORM SCANNING SUMMARY =======");
    console.log(`[ApplyPilot] 🏢 Target Company: ${company}`);
    console.log(`[ApplyPilot] 💼 Target Job Title: ${title}`);
    console.log(`[ApplyPilot] 📄 Description Extracted Length: ${jobDescription.length} characters`);
    console.log(`[ApplyPilot] 📝 Scanned Form Fields Count: ${fields.length}`);
    console.log("[ApplyPilot] 📋 Scanned Fields Tabular Overview:");
    console.table(fields.map(f => ({
      "Field ID": f.id,
      "Name": f.name,
      "Extracted Label": f.label,
      "Input Type": f.type,
      "Is Required": f.required ? "★ Yes" : "No",
      "Options Available": f.options.length > 0 ? f.options.join(" | ") : "None"
    })));
    console.log("[ApplyPilot] ==================================================");

    sendResponse({
      success: true,
      fields,
      jobDescription,
      title: title.replace(/\s+/g, ' ').trim(),
      company: company.replace(/\s+/g, ' ').trim()
    });
    return true; // Keep channel open
  }
  
  if (message.action === "AUTOFILL_FIELDS") {
    const { mappings } = message;
    let filledCount = 0;
    
    console.log("[ApplyPilot] 🚀 ======= AUTOFILL PROCESS INITIATED =======");
    console.log(`[ApplyPilot] Form mappings mapping load: ${mappings.length} items`);
    
    mappings.forEach((mapping: any) => {
      if (mapping.mapped_value !== null && mapping.mapped_value !== undefined) {
        try {
          console.log(`[ApplyPilot] Injecting value for field [${mapping.field_id}] (Type: ${mapping.field_type}) -> Value:`, mapping.mapped_value);
          injectValue(mapping.field_id, mapping.mapped_value, mapping.field_type);
          filledCount++;
        } catch (err) {
          console.error(`[ApplyPilot] Failed to inject value for field [${mapping.field_id}]:`, err);
        }
      }
    });
    
    // Visually update state of matching badges to green
    updateFieldBadges(mappings);
    
    console.log(`[ApplyPilot] Autofill complete! Injected ${filledCount} elements successfully.`);
    console.log("[ApplyPilot] ===============================================");

    sendResponse({ success: true, filledCount });
    return true;
  }
});
