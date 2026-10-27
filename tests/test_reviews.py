import pytest
from core.reviews.privacy import hash_sender, scrub_pii, assert_no_pii
from core.reviews.parser import auto_detect_format, parse_chat_lines, classify_message
from core.reviews.rating_extractor import extract_explicit_rating
from core.reviews.linker import link_candidate_messages
from core.reviews.deduper import deduplicate_reviews

def test_privacy_and_anonymization():
    salt = "test_salt_secret_12345"
    s1 = hash_sender("Alice Smith", salt)
    s2 = hash_sender("Alice Smith", salt)
    s3 = hash_sender("Bob Jones", salt)
    
    assert s1.startswith("usr_")
    assert s1 == s2
    assert s1 != s3
    assert "Alice" not in s1
    assert hash_sender("", salt) == "SYSTEM"

    # Scrubbing
    raw_text = "Call me at +91 98765 43210 or email test.user@vit.ac.in for notes."
    scrubbed = scrub_pii(raw_text)
    assert "+91 98765 43210" not in scrubbed
    assert "test.user@vit.ac.in" not in scrubbed
    assert "[PHONE_REDACTED]" in scrubbed
    assert "[EMAIL_REDACTED]" in scrubbed

    # Zero-PII assertion
    assert_no_pii(scrubbed)
    with pytest.raises(ValueError, match="PII Leak"):
        assert_no_pii("Contact me at 9876543210 immediately")

def test_parser_formats_and_multiline():
    raw_lines = [
        "[28/10/25, 10:15:00 AM] ~ Alice: First line of review",
        "Second line continuing the review",
        "[28/10/25, 10:16:00 AM] ~ Bob: <attached: image.jpg>",
        "[28/10/25, 10:17:00 AM] ~ Charlie: This message was deleted",
        "[28/10/25, 10:18:00 AM] ~ Admin: ~ Admin created this group"
    ]
    parsed = parse_chat_lines(raw_lines, source_zip="test.zip", source_file="_chat.txt")
    assert parsed["format_detected"] == "ios_12h"
    messages = parsed["messages"]
    assert len(messages) == 4

    # Multiline check
    m1 = messages[0]
    assert m1["message_type"] == "normal"
    assert "First line" in m1["text"]
    assert "Second line" in m1["text"]
    assert m1["start_line"] == 1
    assert m1["end_line"] == 2

    # Media omitted
    assert messages[1]["message_type"] == "media_omitted"
    # Deleted
    assert messages[2]["message_type"] == "deleted"
    # System
    assert messages[3]["message_type"] == "system"

def test_explicit_rating_extraction():
    # Fractions
    r1 = extract_explicit_rating("He is a great teacher, gives 8/10 in internals")
    assert r1 is not None
    assert r1["normalized_rating"] == 4.0
    assert r1["raw_rating"] == "8/10"

    r2 = extract_explicit_rating("Lab marking is 4.5/5 easy")
    assert r2 is not None
    assert r2["normalized_rating"] == 4.5

    # Stars
    r3 = extract_explicit_rating("Definitely 5 stars for attendance leniency")
    assert r3 is not None
    assert r3["normalized_rating"] == 5.0

    # Labels
    r4 = extract_explicit_rating("Overall rating: 9 out of 10")
    assert r4 is not None
    assert r4["normalized_rating"] == 4.5

    # Dates must not be treated as ratings
    r5 = extract_explicit_rating("Assignment due on 12/10 before midnight")
    assert r5 is None

    # No rating in sentiment text
    r6 = extract_explicit_rating("He is the best professor ever, take him without doubt")
    assert r6 is None

def test_multi_message_linking():
    candidates = [
        {
            "message_id": "m1",
            "text": "How is Dr. Vijayakumar for DSA?",
            "timestamp": "2025-10-28T10:00:00",
            "epoch_seconds": 1730109600,
            "sender_hash": "usr_abc",
            "source_file": "chat.txt",
            "start_line": 10,
            "end_line": 10,
            "confidence": 0.65,
            "reasons": ["found_known_faculty"],
            "raw_mentions": {"names": ["VIJAYAKUMAR"], "course_codes": ["BCSE202L"], "slot_labels": []},
            "explicit_rating": None
        },
        {
            "message_id": "m2",
            "text": "He is very chill and gives 9/10 in assignments",
            "timestamp": "2025-10-28T10:01:00",  # 60s gap
            "epoch_seconds": 1730109660,
            "sender_hash": "usr_abc",
            "source_file": "chat.txt",
            "start_line": 11,
            "end_line": 11,
            "confidence": 0.50,
            "reasons": ["found_explicit_rating"],
            "raw_mentions": {"names": [], "course_codes": [], "slot_labels": []},
            "explicit_rating": {"raw_rating": "9/10", "normalized_rating": 4.5, "scale": "5_star"}
        }
    ]

    linked = link_candidate_messages(candidates, max_gap_seconds=180)
    assert len(linked) == 1
    unit = linked[0]
    assert unit["review_id"] == "rev_m1"
    assert "Vijayakumar" in unit["text"]
    assert "9/10" in unit["text"]
    assert unit["explicit_rating"]["normalized_rating"] == 4.5
    assert unit["start_line"] == 10
    assert unit["end_line"] == 11
    assert "linked_rapid_continuation" in unit["reasons"]

def test_review_deduplication():
    reviews = [
        {
            "review_id": "rev_1",
            "text": "Take Senthil Prakash for Digital Systems, he gives good marks",
            "timestamp": "2025-10-28T10:00:00",
            "start_line": 1,
            "end_line": 1,
            "source_zip": "zip1.zip",
            "source_file": "chat1.txt"
        },
        {
            "review_id": "rev_2",
            "text": "Forwarded message: Take Senthil Prakash for Digital Systems, he gives good marks!",
            "timestamp": "2025-10-28T10:05:00",
            "start_line": 5,
            "end_line": 5,
            "source_zip": "zip2.zip",
            "source_file": "chat2.txt"
        },
        {
            "review_id": "rev_3",
            "text": "Different review entirely about another teacher",
            "timestamp": "2025-10-28T10:10:00",
            "start_line": 10,
            "end_line": 10,
            "source_zip": "zip1.zip",
            "source_file": "chat1.txt"
        }
    ]

    deduped, stats = deduplicate_reviews(reviews)
    assert len(deduped) == 3
    assert stats["total_reviews"] == 3
    assert stats["unique_groups"] == 2
    assert stats["duplicate_copies"] == 1

    r1 = deduped[0]
    r2 = deduped[1]
    assert r1["is_primary"] is True
    assert r1["duplicate_of"] is None
    assert r1["duplicate_count"] == 1
    assert r2["is_primary"] is False
    assert r2["duplicate_of"] == "rev_1"
