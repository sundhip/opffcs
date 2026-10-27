# Resumio FFCS: WhatsApp Chat Reviews Ingestion Report

Generated from 3 chat file(s) across 3 processed files.

## 1. Executive Summary

- **Total Raw Chat Messages Parsed**: 18,581
  - Normal Messages: 15,391
  - System Notices: 2,575
  - Media Placeholders Omitted: 0
  - Deleted Messages Omitted: 615
- **Candidate Review Messages Identified**: 1,790
- **Multi-Message Units Linked (<= 180s)**: 1,660
- **Unique Duplicate Groups**: 1,554
- **Duplicate Copies Flagged**: 106
- **Explicit Ratings Extracted (0.0 - 5.0 scale)**: 17

## 2. Confidence Distribution

- High Confidence ($\ge 0.70$): **81**
- Medium Confidence ($0.40 - 0.69$): **1311**
- Low / Borderline Confidence ($< 0.40$): **268**

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

### Example 2: Review ID `rev_m_2298_2859`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 2859-2860)
- **Timestamp**: `2025-11-01T20:03:27` | **Sender**: `usr_eead7a05e6b43a1b`
- **Confidence**: `0.65` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['PRIYADARSHINI'], Courses: [], Slots: []
- **Reasons**: matched_keywords:marks,cat, found_known_faculty
> "If you want to learn then take indra priyadarshini She gives avg marks in cat"

### Example 3: Review ID `rev_m_3777_5028`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 5028-5028)
- **Timestamp**: `2025-11-03T22:58:14` | **Sender**: `usr_39887845117bebfd`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "How is akash kumar pradhan?"

### Example 4: Review ID `rev_m_5018_6676`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 6676-6678)
- **Timestamp**: `2025-11-08T22:49:35` | **Sender**: `usr_bde98836949a694a`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['SHIVAY'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "is OM NAMAH SHIVAY good for probablity and stats? for leniency class avg"

### Example 5: Review ID `rev_m_6196_8295`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 8295-8296)
- **Timestamp**: `2025-12-02T14:53:29` | **Sender**: `usr_9c6fe794dcd2f91c`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Does anyone have idea abt Satheesh Kumar T for computation  <This message was edited> [02/12/25, 2:53:55 PM] ~ Chaitra:  <attached: [PHONE_REDACTED]-PHOTO-2025-12-02-14-53-56.jpg>"

### Example 6: Review ID `rev_m_7031_9757`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 9757-9758)
- **Timestamp**: `2025-12-04T23:05:35` | **Sender**: `usr_d3885d3b8538054e`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['REVATHI'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "For computation structures who is better REVATHI A R  or  DEEPA NIVETHIKA"

### Example 7: Review ID `rev_m_7868_13343`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 13343-13379)
- **Timestamp**: `2026-04-06T18:14:05` | **Sender**: `usr_ff7d727d10c77442`
- **Confidence**: `0.65` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: []
- **Reasons**: found_academic_title, found_known_faculty
> "Guys do anyone have glue gun refill stick? [06/04/26, 6:22:32 PM]  [PHONE_REDACTED] : Ever felt like everyone around you knows GitHub… and you don’t? 😶‍💻 Don’t worry - we’ve got you.  🚀 GITVERSE 2026 – Learn Git. Work Together. Win Big. 🚀  Coding ..."

### Example 8: Review ID `rev_m_743_805`
- **Source**: `WhatsApp Chat - ffcs'29.zip` (lines 805-13796)
- **Timestamp**: `2026-06-21T11:34:56` | **Sender**: `usr_723097a6b5de72ff`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KARTHIKEYAN'], Courses: [], Slots: []
- **Reasons**: found_known_faculty, linked_rapid_continuation
> "For Java 1.dinkaran M 2.jahangeer sidiqi 3.karthikeyan n 4.dhavakumar p 5.angleine 6.chendur Out of theses which fac ?to choose For Java 1.dinkaran M 2.jahangeer sidiqi 3.karthikeyan n 4.dhavakumar p 5.angleine 6.chendur Out of theses which fac ?t..."

### Example 9: Review ID `rev_m_1216_1567`
- **Source**: `WhatsApp Chat - ffcs'29.zip` (lines 1567-1570)
- **Timestamp**: `2026-06-21T19:43:22` | **Sender**: `usr_b869dc6e23c75ecc`
- **Confidence**: `0.75` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['REVATHI'], Courses: [], Slots: []
- **Reasons**: found_known_faculty, matched_keywords:average,marks,teaching
> "POLL: (Database) who gives extra marks for DAs and class average low and teaching average ok OPTION: Revathi (0 votes) OPTION: Benila (0 votes)"

### Example 10: Review ID `rev_m_3285_4399`
- **Source**: `WhatsApp Chat - '29 FFCS 2.1.zip` (lines 4399-4399)
- **Timestamp**: `2026-06-22T19:38:03` | **Sender**: `usr_5353e2a43a383f95`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['KUMAR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Any opinions on urjani, Roopesh O B, Arun Kumar G for HSM courses?"

### Example 11: Review ID `rev_m_1991_2869`
- **Source**: `WhatsApp Chat - ffcs'29.zip` (lines 2869-2873)
- **Timestamp**: `2026-06-25T20:32:31` | **Sender**: `usr_09a0add3420f73ac`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['PRADEEP K'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "POLL: java manual checking will do OPTION: kaniga devi (2 votes) OPTION: janaki meena (3 votes) OPTION: pradeep k v (0 votes)"

### Example 12: Review ID `rev_m_4035_5468`
- **Source**: `WhatsApp Chat - '29 FFCS 2.1.zip` (lines 5468-5468)
- **Timestamp**: `2026-06-27T13:59:10` | **Sender**: `usr_d7589a04825e5537`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['PRAKASH'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Prakash P"

### Example 13: Review ID `rev_m_9093_15605`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 15605-15605)
- **Timestamp**: `2026-07-06T15:47:01` | **Sender**: `usr_6abf55c765f3a899`
- **Confidence**: `0.45` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['TAHIR'], Courses: [], Slots: []
- **Reasons**: found_known_faculty
> "Take Tahir"

### Example 14: Review ID `rev_m_3219_5003`
- **Source**: `WhatsApp Chat - ffcs'29.zip` (lines 5003-5005)
- **Timestamp**: `2026-07-07T20:27:37` | **Sender**: `usr_7f022401a1699b5c`
- **Confidence**: `0.55` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: ['FACE'], Courses: [], Slots: ['TE1', 'E1']
- **Reasons**: found_slot_label:E1,TE1, found_known_faculty
> "Qualitative Quantitative E1 TE1 Have- Face APT ROOM Ab3 309 Need - Sixphrase room ab3 307"

### Example 15: Review ID `rev_m_9442_17731`
- **Source**: `WhatsApp Chat - '29 FFCS 1.2.zip` (lines 17731-17837)
- **Timestamp**: `2026-08-24T08:28:20` | **Sender**: `usr_ee25be06b872d875`
- **Confidence**: `0.30` | **Explicit Rating**: None (opinion only)
- **Mentions**: Names: [], Courses: [], Slots: []
- **Reasons**: found_academic_title, matched_keywords:friendly
> "~ ~𝓢𝓾𝓻𝔂𝓪 joined from the community [24/08/26, 1:09:59 PM] ~ Bharathwaaj Subramanian: 🚀 RASPiFUSION: Intelligence Edge ML 🤖  Ever wanted to build your own AI-powered object detection system using Raspberry Pi? This hands-on workshop takes you from ..."

