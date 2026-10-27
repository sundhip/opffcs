# Resumio FFCS: WhatsApp Chat Reviews Ingestion Report

Generated from 3 chat file(s) across 3 processed files.

## 1. Executive Summary

- **Total Raw Chat Messages Parsed**: 18,581
  - Normal Messages: 15,387
  - System Notices: 2,579
  - Media Placeholders Omitted: 0
  - Deleted Messages Omitted: 615
- **Candidate Review Messages Identified**: 1,841
- **Multi-Message Units Linked (<= 180s)**: 1,707
- **Unique Duplicate Groups**: 1,599
- **Duplicate Copies Flagged**: 108
- **Explicit Ratings Extracted (0.0 - 5.0 scale)**: 17

## 2. Confidence Distribution

- High Confidence ($\ge 0.70$): **84**
- Medium Confidence ($0.40 - 0.69$): **1356**
- Low / Borderline Confidence ($< 0.40$): **267**

## 3. Privacy & Safety Verification

- **Sender Anonymization**: All sender names and phone numbers are hashed using a salted SHA-256 HMAC (`usr_<16hex>`). Salt is stored locally in `.salt` and never committed.
- **Zero-PII Assurance**: Pre-assertion regex verification ensures 0 unmasked phone numbers, emails, or sender names in `reviews.jsonl`.

## 4. Input File Details

| ZIP Archive | Extracted File | Messages | Format Detected |
|-------------|----------------|----------|-----------------|
| `WhatsApp Chat - '29 FFCS 1.2.zip` | `_chat.txt` | 9,606 | `ios_12h` |
| `WhatsApp Chat - '29 FFCS 2.1.zip` | `_chat.txt` | 5,424 | `ios_12h` |
| `WhatsApp Chat - ffcs'29.zip` | `_chat.txt` | 3,551 | `ios_12h` |

## 5. Sample Extracted & Scrubbed Reviews (15 Diverse Examples)

### Example 1: Review ID `rev_m_404_404`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 404-404)
- **Timestamp**: `2025-10-29T10:02:10` | **Sender**: `usr_dd903535bf896f6c`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['BASKAR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "@⁨~Ramanan Baskar⁩"

### Example 2: Review ID `rev_m_2295_2843`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 2843-2856)
- **Timestamp**: `2025-11-01T20:01:51` | **Sender**: `usr_f4cc31479d561385`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['PRIYADARSHINI'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "POLL: Fir structured and oops OPTION: Radha r (2 votes) OPTION: Anusooya g (0 votes) OPTION: A menaka pushpa (0 votes) OPTION: Sivakami r (0 votes) OPTION: Dinakaran m (2 votes) OPTION: Abhirami s (1 vote) OPTION: Mansoor hussain d (5 votes) OPTIO..."

### Example 3: Review ID `rev_m_3764_5010`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 5010-5015)
- **Timestamp**: `2025-11-03T21:18:23` | **Sender**: `usr_09a0add3420f73ac`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "POLL: Engg physics OPTION: Rajesh goswami (1 vote) OPTION: Karthikeyan s (8 votes) OPTION: Ravi Kumar biroju (1 vote) OPTION: Ranjani seshadri (3 votes)"

### Example 4: Review ID `rev_m_5000_6650`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 6650-6654)
- **Timestamp**: `2025-11-08T22:39:06` | **Sender**: `usr_32ba271629462477`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['SINGH'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "POLL: chemisty for electronics OPTION: JAYANTA PARUI (2 votes) OPTION: FATEH VEER SINGH (0 votes) OPTION: SHYAMAPADA NAND (0 votes)"

### Example 5: Review ID `rev_m_6196_8295`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 8295-8296)
- **Timestamp**: `2025-12-02T14:53:29` | **Sender**: `usr_9c6fe794dcd2f91c`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Does anyone have idea abt Satheesh Kumar T for computation  <This message was edited> [02/12/25, 2:53:55 PM] ~ Chaitra:  <attached: [PHONE_REDACTED]-PHOTO-2025-12-02-14-53-56.jpg>"

### Example 6: Review ID `rev_m_7046_9802`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 9802-9814)
- **Timestamp**: `2025-12-05T06:43:01` | **Sender**: `usr_a64df68f4e6c0681`
- **Confidence**: `0.30` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: [], Courses: [], Slots: ['L31', 'G1', 'L44', 'L43', 'L32', 'F1']
- **Reasons**: found_academic_title, found_slot_label:F1,G1,L31
> "For OOPS Have: Manoranjitham - F1  WANT: Any faculty with G1, L31+L32+L43+L44  Additionally, I have to travel 70 KM everyday to go home.  Overall 150 KM round trip (counting deviation)  Pls help"

### Example 7: Review ID `rev_m_465_496`
- **Source**: `WhatsApp Chat - '29 FFCS 2.1.zip` (lines 496-497)
- **Timestamp**: `2026-06-19T21:27:55` | **Sender**: `usr_6973c967264d27ba`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['SINGH'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "9 cgpa peoples [19/06/26, 9:28:02 PM] ~ Om Pratap Singh👻:  <attached: [PHONE_REDACTED]-PHOTO-2026-06-19-21-28-03.jpg>"

### Example 8: Review ID `rev_m_2201_2815`
- **Source**: `WhatsApp Chat - '29 FFCS 2.1.zip` (lines 2815-2815)
- **Timestamp**: `2026-06-21T11:58:08` | **Sender**: `usr_6973c967264d27ba`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KARTHIKEYAN'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "how is KARTHIKEYAN N for java?"

### Example 9: Review ID `rev_m_1257_1693`
- **Source**: `WhatsApp Chat - ffcs'29.zip` (lines 1693-1699)
- **Timestamp**: `2026-06-21T20:19:29` | **Sender**: `usr_f209b4492f75bd14`
- **Confidence**: `0.75` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: []
- **Reasons**: matched_keywords:average,lenient,teaching, found_known_faculty
> "Gajanand gupta Lenin babu Avadhesh kumar sharma Maya rathnasabathy  What abt these faculties? [21/06/26, 8:20:10 PM] ~ Ratchana: Hey seniors pls give honest feedback for OS, average teaching, lenient correction, for second slot not highted in the ..."

### Example 10: Review ID `rev_m_8315_14317`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 14317-14317)
- **Timestamp**: `2026-06-22T21:57:23` | **Sender**: `usr_7c3f9fd0443ef66f`
- **Confidence**: `0.65` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['RAJESH'], Courses: [], Slots: []
- **Reasons**: found_academic_title, found_known_faculty
> "I dunno abt Suganya but rajesh is goated faculty"

### Example 11: Review ID `rev_m_1995_2878`
- **Source**: `WhatsApp Chat - ffcs'29.zip` (lines 2878-2879)
- **Timestamp**: `2026-06-25T21:06:58` | **Sender**: `usr_7c4f5e49f2dc8e30`
- **Confidence**: `0.65` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['DHANASEKAR S'], Courses: [], Slots: []
- **Reasons**: found_academic_title, found_known_faculty
> "Except radha s and dhanasekar suggest any good faculty [25/06/26, 9:06:58 PM] ~ ~AB:  <attached: [PHONE_REDACTED]-PHOTO-2026-06-25-21-06-59.jpg>"

### Example 12: Review ID `rev_m_2588_3698`
- **Source**: `WhatsApp Chat - ffcs'29.zip` (lines 3698-3698)
- **Timestamp**: `2026-06-27T14:12:28` | **Sender**: `usr_e4695f352563b05b`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['PRIYADARSHINI'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "How is priyadarshini for dbms?"

### Example 13: Review ID `rev_m_9093_15605`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 15605-15605)
- **Timestamp**: `2026-07-06T15:47:01` | **Sender**: `usr_6abf55c765f3a899`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['TAHIR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Take Tahir"

### Example 14: Review ID `rev_m_3224_5021`
- **Source**: `WhatsApp Chat - ffcs'29.zip` (lines 5021-5024)
- **Timestamp**: `2026-07-07T20:56:21` | **Sender**: `usr_baac81f5682ce190`
- **Confidence**: `0.55` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['FACE'], Courses: [], Slots: ['TE2', 'E2']
- **Reasons**: found_slot_label:E2,TE2, found_known_faculty
> "STS E2+ TE2 Have: Face Need: Sixphrase"

### Example 15: Review ID `rev_m_9445_18313`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 18313-18555)
- **Timestamp**: `2026-08-26T19:58:23` | **Sender**: `usr_619f4c2dfd17e0b3`
- **Confidence**: `0.30` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: [], Courses: [], Slots: []
- **Reasons**: found_academic_title, matched_keywords:teach
> "~ H Joshika 🩵🤍 joined from the community [26/08/26, 7:58:57 PM] ~ H Joshika 🩵🤍: *HOUSE OF OPEN SOURCE* > Open Source Programming Club(OSPC) presents House of Open Source  Curious about Open Source but don’t know where to start?  Join us at House o..."

