import re
from datetime import datetime
from typing import List, Dict, Any, Tuple, Optional

# Supported timestamp regexes
PATTERNS = {
    "ios_24h": re.compile(r'^\[(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\]\s+(?:([^:]+?):\s+)?(.*)$'),
    "ios_12h": re.compile(r'^\[(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*[APap][Mm])\]\s+(?:([^:]+?):\s+)?(.*)$'),
    "android_24h": re.compile(r'^(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?)\s+-\s+(?:([^:]+?):\s+)?(.*)$'),
    "android_12h": re.compile(r'^(\d{1,2}/\d{1,2}/\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?\s*[APap][Mm])\s+-\s+(?:([^:]+?):\s+)?(.*)$')
}

SYSTEM_INDICATORS = [
    "Messages and calls are end-to-end encrypted",
    "created group",
    "created this group",
    "joined using a group link",
    "joined using this group's invite link",
    "joined using an invite link",
    "changed the subject",
    "changed this group's icon",
    "changed the group description",
    "changed this group's settings",
    "security code changed",
    "waiting for this message",
    "added",
    "left",
    "removed"
]

def clean_invisible_chars(s: str) -> str:
    """Removes directional marks and non-breaking spaces commonly in WhatsApp exports."""
    if not s:
        return ""
    return re.sub(r'[\u200e\u200f\u202a\u202b\u202c\u202d\u202e\u202f\xa0]', ' ', s).strip()

def auto_detect_format(lines: List[str]) -> Tuple[str, Any]:
    """
    Scans the first 100 lines to auto-detect WhatsApp export format.
    """
    counts = {k: 0 for k in PATTERNS}
    for line in lines[:100]:
        for fmt, pat in PATTERNS.items():
            if pat.match(line):
                counts[fmt] += 1
                break
    best_fmt = max(counts, key=counts.get)
    if counts[best_fmt] == 0:
        # Fallback to ios_24h if undetermined
        return "ios_24h", PATTERNS["ios_24h"]
    return best_fmt, PATTERNS[best_fmt]

def parse_iso_timestamp(date_str: str, time_str: str) -> Tuple[str, int]:
    """
    Parses date (dd/mm/yy or dd/mm/yyyy) and time to an ISO-8601 string and unix epoch.
    """
    # Normalize slashes / dashes
    date_clean = date_str.replace("-", "/").strip()
    parts = date_clean.split("/")
    if len(parts) == 3:
        d, m, y = parts
        if len(y) == 2:
            y = "20" + y
        date_clean = f"{d.zfill(2)}/{m.zfill(2)}/{y}"
        
    time_clean = " ".join(time_str.strip().split())
    # Try various datetime parsing formats
    for dt_fmt in [
        "%d/%m/%Y %H:%M:%S",
        "%d/%m/%Y %H:%M",
        "%d/%m/%Y %I:%M:%S %p",
        "%d/%m/%Y %I:%M %p"
    ]:
        try:
            dt = datetime.strptime(f"{date_clean} {time_clean}", dt_fmt)
            return dt.isoformat(), int(dt.timestamp())
        except ValueError:
            continue
            
    # Fallback to current year string
    return f"{date_clean}T{time_clean}", 0

def classify_message(raw_sender: Optional[str], text: str) -> str:
    """
    Classifies a parsed message into: 'system', 'media_omitted', 'deleted', 'normal'
    """
    if not raw_sender or raw_sender.strip() == "":
        return "system"
        
    cleaned_text = clean_invisible_chars(text).lower()
    for sys_phrase in SYSTEM_INDICATORS:
        if sys_phrase.lower() in cleaned_text:
            return "system"
            
    if ("this message was deleted" in cleaned_text or 
        "you deleted this message" in cleaned_text):
        return "deleted"
        
    if ("<attached:" in cleaned_text or 
        "<media omitted>" in cleaned_text or 
        "image omitted" in cleaned_text or 
        "video omitted" in cleaned_text or 
        "audio omitted" in cleaned_text or
        "document omitted" in cleaned_text or
        "sticker omitted" in cleaned_text or
        "contact card omitted" in cleaned_text):
        return "media_omitted"
        
    return "normal"

class ChatParser:
    def __init__(self):
        pass

    def parse_lines(self, lines: List[str], source_zip: str, source_file: str) -> Dict[str, Any]:
        fmt_name, pattern = auto_detect_format(lines)
        messages: List[Dict[str, Any]] = []
        parse_failures: List[Dict[str, Any]] = []

        current_msg: Optional[Dict[str, Any]] = None

        for line_num, line in enumerate(lines, 1):
            m = pattern.match(line)
            if m:
                if current_msg:
                    messages.append(current_msg)
                date_str, time_str, sender, text = m.groups()
                iso_ts, epoch_sec = parse_iso_timestamp(date_str, time_str)
                sender = clean_invisible_chars(sender) if sender else None
                text = clean_invisible_chars(text) if text else ""
                msg_type = classify_message(sender, text)

                current_msg = {
                    "source_zip": source_zip,
                    "source_file": source_file,
                    "start_line": line_num,
                    "end_line": line_num,
                    "timestamp": iso_ts,
                    "epoch_seconds": epoch_sec,
                    "raw_sender": sender,
                    "text": text,
                    "message_type": msg_type
                }
            else:
                # Continuation line
                if current_msg is not None:
                    current_msg["text"] += "\n" + clean_invisible_chars(line)
                    current_msg["end_line"] = line_num
                else:
                    # Line before first timestamp or unrecognized header
                    parse_failures.append({
                        "line_number": line_num,
                        "line_content": line[:100],
                        "reason": "Header line without timestamp or unparseable initial block"
                    })

        if current_msg:
            messages.append(current_msg)

        # Assign message_id to each message
        for idx, msg in enumerate(messages, 1):
            msg["message_id"] = f"m_{idx}_{msg['start_line']}"
            msg["sender"] = msg.get("raw_sender")

        return {
            "format_detected": fmt_name,
            "total_lines": len(lines),
            "parsed_messages_count": len(messages),
            "messages": messages,
            "parse_failures": parse_failures,
            "stats": {
                "normal": sum(1 for m in messages if m["message_type"] == "normal"),
                "system": sum(1 for m in messages if m["message_type"] == "system"),
                "media_omitted": sum(1 for m in messages if m["message_type"] == "media_omitted"),
                "deleted": sum(1 for m in messages if m["message_type"] == "deleted"),
            }
        }

def parse_chat_lines(lines: List[str], source_zip: str = "", source_file: str = "") -> Dict[str, Any]:
    parser = ChatParser()
    return parser.parse_lines(lines, source_zip=source_zip, source_file=source_file)

