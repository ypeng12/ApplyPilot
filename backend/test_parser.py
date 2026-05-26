import requests
from bs4 import BeautifulSoup
import json
import sys

url = "https://job-boards.greenhouse.io/attentive/jobs/4209296009?gh_src=63pk6gu69us"
print(f"Fetching URL: {url}...")

# Add headers to mimic browser
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}
response = requests.get(url, headers=headers)
if response.status_code != 200:
    print(f"Failed to fetch page. Status code: {response.status_code}")
    sys.exit(1)

soup = BeautifulSoup(response.text, 'html.parser')

# Get job title and company just to show we can
title = soup.find('h1', class_='app-title')
title_text = title.text.strip() if title else "Unknown Title"
company = soup.find('span', class_='company-name')
company_text = company.text.strip().replace("at ", "") if company else "Unknown Company"

print(f"\n--- Job Info ---")
print(f"Company: {company_text}")
print(f"Role: {title_text}")
print(f"----------------\n")

# Save HTML to see what we actually got
with open("debug.html", "w", encoding="utf-8") as f:
    f.write(response.text)
print("Saved raw HTML to debug.html")

fields = []
# Just grab all inputs on the page
inputs = soup.find_all(['input', 'textarea', 'select'])

print(f"Found {len(inputs)} input elements on the entire page.")

for el in inputs:
    # Skip hidden fields, submit buttons, and file uploads for this simple test
    if el.get('type') in ['hidden', 'submit', 'button', 'file']: 
        continue
        
    field_id = el.get('id')
    name = el.get('name')
    tag_name = el.name
    
    # Try to find the label associated with this input
    label_text = "Unknown Label"
    if field_id:
        label = soup.find('label', attrs={'for': field_id})
        if label:
            # Clean up the label text (remove the '*' for required fields if it's inside a nested span)
            text_parts = [t.strip() for t in label.find_all(text=True, recursive=False) if t.strip() and t.strip() != '*']
            if text_parts:
                label_text = " ".join(text_parts).strip()
            else:
                label_text = label.text.replace('*', '').strip()
                
        # Greenhouse often wraps fields in a div.field. If no 'for' matches, check parent div's label.
        if label_text == "Unknown Label":
            parent_div = el.find_parent('div', class_='field')
            if parent_div:
                parent_label = parent_div.find('label')
                if parent_label:
                    label_text = parent_label.text.split('\n')[0].replace('*', '').strip()

    options = []
    if tag_name == 'select':
        opts = el.find_all('option')
        options = [o.text.strip() for o in opts if o.text.strip() and o.text.strip() not in ["Please select", ""]]
        
    fields.append({
        "id": field_id,
        "label": label_text,
        "type": el.get('type') or tag_name,
        "options": options
    })

print("\n--- Extracted Form Fields ---")
print(json.dumps(fields, indent=2, ensure_ascii=False))
