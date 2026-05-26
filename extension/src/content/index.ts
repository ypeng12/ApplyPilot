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

// 1. Helper to find label text associated with an input/select/textarea
function getFieldLabel(el: HTMLElement): string {
  // Try finding standard label tag pointing to ID
  if (el.id) {
    const labelEl = document.querySelector(`label[for="${el.id}"]`);
    if (labelEl && labelEl.textContent) {
      return labelEl.textContent.trim();
    }
  }

  // Try finding parent label
  let parent = el.parentElement;
  while (parent) {
    if (parent.tagName === 'LABEL') {
      // Get text excluding other children
      const text = Array.from(parent.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent)
        .join("")
        .trim();
      if (text) return text;
    }
    // Also try finding siblings that are labels or spans representing headings
    const labelSibling = parent.querySelector('label, .label, .field-label, .jobs-field-label');
    if (labelSibling && labelSibling.textContent) {
      return labelSibling.textContent.trim();
    }
    parent = parent.parentElement;
  }

  // Fallback to placeholder, name or id
  return (
    el.getAttribute('placeholder') || 
    el.getAttribute('name') || 
    el.id || 
    "Unnamed Field"
  );
}

// 2. Scrapes the Job Description text on the page
function getJobDescription(): string {
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
    const el = document.querySelector(selector);
    if (el && el.textContent) {
      return el.textContent.trim();
    }
  }
  
  // Fallback to body text
  return document.body.innerText.substring(0, 10000); 
}

// 3. Detects form fields on the page
function scanFormFields(): FormFieldDetected[] {
  const fields: FormFieldDetected[] = [];
  
  // Focus on common input tags
  const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select');
  
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
function injectValue(fieldId: string, value: any, type: string) {
  // Locate the element using ID, name, or querySelector
  let element = document.getElementById(fieldId) as any;
  if (!element) {
    element = document.querySelector(`[name="${fieldId}"]`);
  }
  if (!element) {
    // Try attribute search
    element = document.querySelector(`[id$="${fieldId}"]`) || document.querySelector(`[name$="${fieldId}"]`);
  }
  
  if (!element) {
    console.warn(`[ApplyPilot] Target element not found for fieldId: ${fieldId}`);
    return;
  }

  // Handle standard Text & Textarea inputs
  if (type === "text" || type === "textarea" || element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
    if (element.type === "checkbox") {
      element.checked = !!value;
    } else if (element.type === "radio") {
      // Find matching radio in group
      const name = element.getAttribute("name");
      if (name) {
        const radios = document.querySelectorAll(`input[name="${name}"][type="radio"]`);
        radios.forEach((r: any) => {
          if (r.value.toLowerCase() === String(value).toLowerCase() || getFieldLabel(r).toLowerCase() === String(value).toLowerCase()) {
            r.checked = true;
            r.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });
      }
    } else {
      element.value = String(value);
    }
  } 
  // Handle Dropdowns (Select elements)
  else if (element.tagName === "SELECT") {
    const select = element as HTMLSelectElement;
    let optionIndex = -1;
    
    for (let i = 0; i < select.options.length; i++) {
      const option = select.options[i];
      const optVal = option.value.toLowerCase().trim();
      const optText = option.text.toLowerCase().trim();
      const targetVal = String(value).toLowerCase().trim();
      
      if (optVal === targetVal || optText === targetVal || optText.includes(targetVal) || targetVal.includes(optText)) {
        optionIndex = i;
        break;
      }
    }
    
    if (optionIndex !== -1) {
      select.selectedIndex = optionIndex;
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

// 5. Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("[ApplyPilot] Received message:", message.action);
  
  if (message.action === "SCAN_PAGE") {
    const fields = scanFormFields();
    const jobDescription = getJobDescription();
    
    // Try to guess company & title from header
    const title = document.querySelector('h1, .job-title, .title')?.textContent?.trim() || document.title;
    const company = document.querySelector('.company-name, .company, .jobs-unified-top-card__company-name')?.textContent?.trim() || "Unknown Company";
    
    sendResponse({
      success: true,
      fields,
      jobDescription,
      title,
      company: company.replace(/\s+/g, ' ').trim()
    });
    return true; // Keep channel open
  }
  
  if (message.action === "AUTOFILL_FIELDS") {
    const { mappings } = message;
    let filledCount = 0;
    
    mappings.forEach((mapping: any) => {
      if (mapping.mapped_value !== null && mapping.mapped_value !== undefined) {
        injectValue(mapping.field_id, mapping.mapped_value, mapping.field_type);
        filledCount++;
      }
    });
    
    sendResponse({ success: true, filledCount });
    return true;
  }
});
