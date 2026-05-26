import requests
from bs4 import BeautifulSoup
import json
import sys

# ============================================================
# USER PROFILE - 用户的个人档案（未来会从数据库或前端读取）
# ============================================================
USER_PROFILE = {
    "first_name": "Yuliang",
    "last_name": "Peng",
    "preferred_name": "Yuliang",
    "email": "yuliang@example.com",
    "phone": "+1 (555) 019-2834",
    "country": "United States",
    "linkedin": "https://linkedin.com/in/yuliang-peng",
    "website": "https://yuliang.dev",
    "requires_sponsorship": False,  # No sponsorship needed
    "gender": "Decline to Self Identify",
    "race": "Decline to Self Identify",
    "veteran_status": "I am not a protected veteran",
}

# ============================================================
# STEP 1: PARSE - 解析网页，获取所有字段
# ============================================================
def parse_form(url: str) -> list[dict]:
    print(f"\n🔍 Step 1: Fetching and parsing form from:\n   {url}\n")
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to fetch page. Status code: {response.status_code}")
        sys.exit(1)

    soup = BeautifulSoup(response.text, 'html.parser')

    fields = []
    inputs = soup.find_all(['input', 'textarea', 'select'])

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
            options = [o.text.strip() for o in opts if o.text.strip() and o.text.strip() not in ["Please select", ""]]

        fields.append({
            "id": field_id,
            "label": label_text,
            "type": el.get('type') or tag_name,
            "options": options,
        })

    print(f"   ✅ Found {len(fields)} fillable fields.")
    return fields


# ============================================================
# STEP 2: FILL - 基于规则映射，将用户信息对应到每个字段
# ============================================================
def fill_fields(fields: list[dict], profile: dict) -> list[dict]:
    print(f"\n✏️  Step 2: Matching profile data to form fields...\n")
    results = []

    for field in fields:
        label_lower = field["label"].lower()
        field_id_lower = field["id"].lower()
        value = None
        confidence = "🟡 needs_review"

        # ── Standard Direct Matches ──────────────────────────────────
        if "first name" in label_lower or field_id_lower == "first_name":
            value = profile["first_name"]
            confidence = "🟢 high"

        elif "last name" in label_lower or field_id_lower == "last_name":
            value = profile["last_name"]
            confidence = "🟢 high"

        elif "preferred" in label_lower and "name" in label_lower:
            value = profile.get("preferred_name", profile["first_name"])
            confidence = "🟢 high"

        elif "email" in label_lower:
            value = profile["email"]
            confidence = "🟢 high"

        elif "phone" in label_lower:
            value = profile["phone"]
            confidence = "🟢 high"

        elif "country" in label_lower:
            value = profile["country"]
            confidence = "🟢 high"

        elif "linkedin" in label_lower:
            value = profile["linkedin"]
            confidence = "🟢 high"

        elif "website" in label_lower or "portfolio" in label_lower:
            value = profile["website"]
            confidence = "🟢 high"

        # ── Sponsorship / Work Authorization ─────────────────────────
        elif "sponsorship" in label_lower or "visa" in label_lower and "require" in label_lower:
            value = "No" if not profile["requires_sponsorship"] else "Yes"
            confidence = "🟢 high"

        elif "authorization" in label_lower or "employment authorization" in label_lower:
            if not profile["requires_sponsorship"]:
                value = "N/A — I am authorized to work in the US and do not require sponsorship."
                confidence = "🟢 high"

        # ── EEO / Demographic Fields ──────────────────────────────────
        elif "gender" in label_lower:
            value = profile.get("gender", "Decline to Self Identify")
            confidence = "🟢 high"

        elif "race" in label_lower or "ethnicity" in label_lower:
            value = profile.get("race", "Decline to Self Identify")
            confidence = "🟢 high"

        elif "veteran" in label_lower:
            value = profile.get("veteran_status", "I am not a protected veteran")
            confidence = "🟢 high"

        # ── Unmatched / Open-ended ────────────────────────────────────
        else:
            value = None
            confidence = "🔴 unmatched (needs AI or manual input)"

        results.append({
            "field_id": field["id"],
            "label": field["label"],
            "type": field["type"],
            "filled_value": value,
            "confidence": confidence,
        })

    return results


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    url = "https://job-boards.greenhouse.io/attentive/jobs/4209296009?gh_src=63pk6gu69us"

    # Step 1
    fields = parse_form(url)

    # Step 2
    filled = fill_fields(fields, USER_PROFILE)

    # Pretty Print Results
    print("=" * 60)
    print("   APPLYPILOT AI — STEP 1+2 RESULT REPORT")
    print("=" * 60)

    high_conf   = [r for r in filled if "high" in r["confidence"]]
    needs_review = [r for r in filled if "review" in r["confidence"]]
    unmatched   = [r for r in filled if "unmatched" in r["confidence"]]

    print(f"\n   Total fields: {len(filled)}")
    print(f"   ✅ Auto-filled (high confidence): {len(high_conf)}")
    print(f"   🟡 Needs review: {len(needs_review)}")
    print(f"   🔴 Unmatched (needs AI later): {len(unmatched)}")
    print()

    for r in filled:
        print(f"  {r['confidence']}")
        print(f"    Label     : {r['label']}")
        print(f"    Field ID  : {r['field_id']}")
        print(f"    Fill Value: {r['filled_value']}")
        print()

    # Also save to JSON for downstream use
    with open("fill_result.json", "w", encoding="utf-8") as f:
        json.dump(filled, f, indent=2, ensure_ascii=False)
    print("💾 Full result saved to fill_result.json")
