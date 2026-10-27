# Resumio FFCS: WhatsApp Chat Reviews Ingestion Report

Generated from 1 chat file(s) across 1 processed files.

## 1. Executive Summary

- **Total Raw Chat Messages Parsed**: 9,606
  - Normal Messages: 8,176
  - System Notices: 1,083
  - Media Placeholders Omitted: 0
  - Deleted Messages Omitted: 347
- **Candidate Review Messages Identified**: 955
- **Multi-Message Units Linked (<= 180s)**: 920
- **Unique Duplicate Groups**: 868
- **Duplicate Copies Flagged**: 52
- **Explicit Ratings Extracted (0.0 - 5.0 scale)**: 8

## 2. Confidence Distribution

- High Confidence ($\ge 0.70$): **29**
- Medium Confidence ($0.40 - 0.69$): **724**
- Low / Borderline Confidence ($< 0.40$): **167**

## 3. Privacy & Safety Verification

- **Sender Anonymization**: All sender names and phone numbers are hashed using a salted SHA-256 HMAC (`usr_<16hex>`). Salt is stored locally in `.salt` and never committed.
- **Zero-PII Assurance**: Pre-assertion regex verification ensures 0 unmasked phone numbers, emails, or sender names in `reviews.jsonl`.

## 4. Input File Details

| ZIP Archive | Extracted File | Messages | Format Detected |
|-------------|----------------|----------|-----------------|
| `WhatsApp Chat - '29 FFCS 1.2.zip` | `_chat.txt` | 9,606 | `ios_12h` |

## 5. Sample Extracted & Scrubbed Reviews (15 Diverse Examples)

### Example 1: Review ID `rev_m_404_404`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 404-404)
- **Timestamp**: `2025-10-29T10:02:10` | **Sender**: `usr_dd903535bf896f6c`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['BASKAR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "@⁨~Ramanan Baskar⁩"

### Example 2: Review ID `rev_m_1859_2128`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 2128-2129)
- **Timestamp**: `2025-10-31T22:13:15` | **Sender**: `usr_3548c6b8ad20f25c`
- **Confidence**: `0.50` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: [], Courses: [], Slots: []
- **Reasons**: matched_keywords:marks,chill,strict, found_academic_title
> "anik sir a good teacher. he is chill too. we had him for java last year and for signals this year. not very strict. if u make notes of whatever he teachs you will be good enough for exams. he will make sure u dont fail. like since last sem people ..."

### Example 3: Review ID `rev_m_2474_3078`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 3078-3157)
- **Timestamp**: `2025-11-01T21:28:06` | **Sender**: `usr_3079edb43be484fe`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR', 'SARANYA M'], Courses: [], Slots: []
- **Reasons**: linked_rapid_continuation, found_known_faculty
> "Engineering Physics :- Navamathavan R. Gopinath M. Dayasindhu Dey Jitendra Narayan D Punithavelan N. Rajasekarakumar V Parasuraman E. Ranjani Seshadri Ravi Kumar Biroju Karthikeyan S Swaathi P Ramkumar Prasanna Devi K Rajesh Goswami Rishab Antoshb..."

### Example 4: Review ID `rev_m_3083_4162`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 4162-4162)
- **Timestamp**: `2025-11-02T10:26:59` | **Sender**: `usr_5411b81c1ea0694f`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KARTHIKEYAN'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Prasanna devi or karthikeyan b for eng phy?"

### Example 5: Review ID `rev_m_4082_5444`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 5444-5445)
- **Timestamp**: `2025-11-05T22:27:55` | **Sender**: `usr_2328821b58bd53f8`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Who is better for applied chemistry? 1.Ramachandran 2.kiran kumar tadi"

### Example 6: Review ID `rev_m_4808_6413`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 6413-6413)
- **Timestamp**: `2025-11-08T19:16:19` | **Sender**: `usr_9f354a41984170f5`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['PRADEEP K'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Guys how is Pradeep kv for operating systems?"

### Example 7: Review ID `rev_m_5545_7332`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 7332-7332)
- **Timestamp**: `2025-11-09T14:20:25` | **Sender**: `usr_a5fe0aebbf6c0670`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['PONRAJ'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Is anyone dropping Caroline Ponraj  for engineering physics....dm me  <This message was edited>"

### Example 8: Review ID `rev_m_6039_8066`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 8066-8075)
- **Timestamp**: `2025-11-19T19:36:04` | **Sender**: `usr_3ca26a1686356105`
- **Confidence**: `0.30` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: [], Courses: [], Slots: ['L55', 'L57', 'L51', 'L52', 'L58', 'L12', 'L11', 'F1', 'L56']
- **Reasons**: found_slot_label:F1,L51,L52, found_academic_title
> "Structured and Object-Oriented Programming Faculty - MANORANJITHAM M Slot-F1 lab slot - L51+L52+L57+L58  Needed: Faculty - ELAKYA R Slot- F1 Lab slot - L11+L12+L55+L56"

### Example 9: Review ID `rev_m_6772_9153`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 9153-9153)
- **Timestamp**: `2025-12-04T13:05:21` | **Sender**: `usr_738a2c1e547d339b`
- **Confidence**: `0.35` | **Explicit Rating**: 5.0/5.0 (raw: `5 star`)
- **Mentions**: Names: [], Courses: [], Slots: []
- **Reasons**: found_explicit_rating:5 star
> "5 star"

### Example 10: Review ID `rev_m_7029_9755`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 9755-9755)
- **Timestamp**: `2025-12-04T23:04:49` | **Sender**: `usr_723097a6b5de72ff`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['RAJESH'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Rajesh goswami,Goinnath mudana,Punithavelan & N Swaathi P which one to take for engineering physics"

### Example 11: Review ID `rev_m_7329_10535`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 10535-10535)
- **Timestamp**: `2025-12-06T09:38:20` | **Sender**: `usr_11598b9537cb656d`
- **Confidence**: `0.30` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: [], Courses: [], Slots: ['L31', 'L5', 'L49', 'L6']
- **Reasons**: found_slot_label:L5,L6,L31, found_academic_title
> "Do any of u want poulemi de's class with lab slot L5+L6 ? Dm if u have a faculty for same subject with L31+32 or L49+50  slot pls"

### Example 12: Review ID `rev_m_8041_13867`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 13867-13868)
- **Timestamp**: `2026-06-21T14:22:26` | **Sender**: `usr_7db4a30ef5cf2351`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['PRADEEP K'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "For java pradeep k v or kanniga devi r [21/06/26, 2:23:41 PM] ~ Daksh Vijay Murjwani: Digital Signal Processing  <attached: [PHONE_REDACTED]-PHOTO-2026-06-21-14-23-42.jpg>"

### Example 13: Review ID `rev_m_8520_14595`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 14595-14599)
- **Timestamp**: `2026-06-24T10:46:58` | **Sender**: `usr_e93d68e5e43513aa`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['LAKSHMI'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Idhayachandran Kalaivanan Brintha Therese Sangeetha RG Lakshmi Priya G"

### Example 14: Review ID `rev_m_8938_15263`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 15263-15268)
- **Timestamp**: `2026-06-27T20:52:33` | **Sender**: `usr_ec86942f535bcb02`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['SIVABALAKRISHNAN'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Sahaya beni Sharmiladevi Sajidha Sivabalakrishnan  Anyone who knows anything about these teachers for dbms??"

### Example 15: Review ID `rev_m_9225_16003`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 16003-16005)
- **Timestamp**: `2026-07-07T17:56:04` | **Sender**: `usr_7edb080db904d54a`
- **Confidence**: `0.55` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: ['F1']
- **Reasons**: found_known_faculty, found_slot_label:F1
> "Probability  F1 Have : jaganathan B Want : anyone except pulak or krishna kumar"

