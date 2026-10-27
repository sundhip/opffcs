import os
import re
import hashlib
import secrets
from typing import Tuple

# Phone number regex: international, Indian (+91, with/without spaces/dashes), 10-digit mobile
PHONE_REGEX = re.compile(
    r'(?:\+?91[\-\s]?)?[6-9]\d{4}[\-\s]?\d{5}\b|'            # Standard Indian mobile: 10 digits starting with 6-9
    r'\+?\d{1,4}[\s\-]?(?:\(\d{1,4}\)[\s\-]?)?\d{3,5}[\s\-]?\d{3,5}\b' # General international formats
)

# Email address regex
EMAIL_REGEX = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b')

DEFAULT_SALT_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "data", "privacy_salt.txt")

def get_or_create_salt(salt_path: str = DEFAULT_SALT_PATH) -> str:
    """
    Retrieves or generates an untracked local salt for cryptographic anonymization.
    """
    salt_dir = os.path.dirname(os.path.abspath(salt_path))
    os.makedirs(salt_dir, exist_ok=True)
    if os.path.exists(salt_path):
        with open(salt_path, "r", encoding="utf-8") as f:
            salt = f.read().strip()
            if salt:
                return salt
    salt = secrets.token_hex(32)
    with open(salt_path, "w", encoding="utf-8") as f:
        f.write(salt)
    return salt

def hash_sender(raw_sender: str, salt: str) -> str:
    """
    Produces a deterministic, irreversible pseudonymized hash for a sender.
    System messages or empty senders return 'SYSTEM'.
    """
    if not raw_sender or raw_sender.strip().upper() in ["SYSTEM", ""]:
        return "SYSTEM"
    cleaned = raw_sender.strip()
    salted_str = f"{salt}:{cleaned}"
    h = hashlib.sha256(salted_str.encode("utf-8")).hexdigest()[:16]
    return f"usr_{h}"

def scrub_pii(text: str) -> str:
    """
    Redacts phone numbers and email addresses from message text.
    """
    if not text:
        return ""
    # Strip emails first
    cleaned = EMAIL_REGEX.sub("[EMAIL_REDACTED]", text)
    # Strip phone numbers
    cleaned = PHONE_REGEX.sub("[PHONE_REDACTED]", cleaned)
    return cleaned

def assert_no_pii(data_item: str | dict | list, allowed_sender_hashes: set = None) -> None:
    """
    Recursively scans strings, dictionaries, or lists to guarantee zero unredacted PII.
    Raises ValueError if raw phone numbers or suspect strings are detected.
    """
    if isinstance(data_item, str):
        # Look for raw phone pattern (ignoring explicit REDACTED tag)
        temp = data_item.replace("[PHONE_REDACTED]", "").replace("[EMAIL_REDACTED]", "")
        if EMAIL_REGEX.search(temp):
            raise ValueError(f"PII Leak: Found email in text: {data_item[:50]}...")
        # Check Indian 10-digit phone patterns
        m = re.search(r'\b[6-9]\d{9}\b', temp)
        if m:
            raise ValueError(f"PII Leak: Found potential 10-digit mobile number: {m.group(0)} in: {data_item[:50]}...")
    elif isinstance(data_item, dict):
        for k, v in data_item.items():
            if k in ["sender", "raw_sender", "phone_number"]:
                raise ValueError(f"PII Leak: Forbidden key '{k}' found in dictionary.")
            assert_no_pii(v, allowed_sender_hashes)
    elif isinstance(data_item, list):
        for item in data_item:
            assert_no_pii(item, allowed_sender_hashes)
