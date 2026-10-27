# Resumio FFCS: Faculty Review Matching & Rating Report

## 1. Matching Performance Summary

- **Total Ingested Reviews Processed**: 920
- **Confident Faculty Matches (`MATCHED`)**: **248** (27.0%)
- **Ambiguous Candidate Mentions (`AMBIGUOUS`)**: **382**
- **Weak Candidate Mentions (`WEAK`)**: **47**
- **Unmatched Reviews (`UNMATCHED`)**: **243**
- **Manual Overrides Applied**: **0**
- **Review Queue Size for Human Verification**: **429** items (saved to `match_review_queue.csv`)

## 2. Faculty Coverage & Ratings Summary

- **Total Canonical Faculty**: 56
- **Faculty with at least 1 Matched Review**: 43
- **Faculty with Numeric Explicit Ratings (0-5 scale)**: 0
- **Faculty with Low Sample (< 3 reviews or < 2 ratings)**: 56

## 3. Top-Reviewed Faculty Breakdown

| Faculty Name | Faculty ID | Review Count | Rated Count | Rating Mean | Distribution [1-5] | Low Sample |
|--------------|------------|--------------|-------------|-------------|--------------------|------------|
| ABRAHAM SUDHARSON PONRAJ | `fac_615716b47d6a` | 20 | 0 | N/A | [0,0,0,0,0] | True |
| ANUBHA PEARLINE S | `fac_a8b9854f55f6` | 20 | 0 | N/A | [0,0,0,0,0] | True |
| KAVITHA J C | `fac_6ee18e020f02` | 19 | 0 | N/A | [0,0,0,0,0] | True |
| RAJESH KUMAR MOHAPATRA | `fac_a48a3947a7cb` | 14 | 0 | N/A | [0,0,0,0,0] | True |
| ASHIS BERA | `fac_37b69d32f686` | 13 | 0 | N/A | [0,0,0,0,0] | True |
| SAURABH CHANDRA MAURY | `fac_cd06b09d22ee` | 11 | 0 | N/A | [0,0,0,0,0] | True |
| OM NAMHA SHIVAY | `fac_0e1749d4aaa4` | 11 | 0 | N/A | [0,0,0,0,0] | True |
| PRADEEP K | `fac_b37cfa0cc212` | 10 | 0 | N/A | [0,0,0,0,0] | True |
| SIVABALAKRISHNAN M | `fac_20d8e0954cbc` | 8 | 0 | N/A | [0,0,0,0,0] | True |
| SARANYA M | `fac_aa4b682b2343` | 8 | 0 | N/A | [0,0,0,0,0] | True |
| SAGITHYA T | `fac_95f6283563f7` | 7 | 0 | N/A | [0,0,0,0,0] | True |
| KARTHIKEYAN P R | `fac_2f26c5c4f3e5` | 7 | 0 | N/A | [0,0,0,0,0] | True |
| SENTHIL PRAKASH P N | `fac_c6478be51cf8` | 7 | 0 | N/A | [0,0,0,0,0] | True |
| VIJAYAKUMAR K P | `fac_13088fa066c6` | 6 | 0 | N/A | [0,0,0,0,0] | True |
| LAKSHMI HARIKA PALIVELA | `fac_8cc9e21d7e03` | 6 | 0 | N/A | [0,0,0,0,0] | True |

## 4. Sample Matches with Explainability Chains (5 Examples)

### Match Example 1: `rev_m_1139_1163` -> LAKSHMI HARIKA PALIVELA
- **Score**: 0.60
- **Reasons**: exact_alias:LAKSHMI
> "Which is better faculty 1)(*Computation Structures* )53049-Dr.Revathi A R or 	50049-Dr.Nithya Darisini  P.S 2)( *Structured and Object-Oriented Programming*)53608-Dr.Benila S or 52866-Ms.Pankaja Laksh"

### Match Example 2: `rev_m_1318_1397` -> UMA MAHESWARI S
- **Score**: 0.85
- **Reasons**: exact_alias:UMA MAHESWARI, exact_alias:S UMA MAHESWARI
> "How's Uma Maheswari mam for DSA?"

### Match Example 3: `rev_m_1374_1462` -> UMA MAHESWARI S
- **Score**: 0.85
- **Reasons**: exact_alias:UMA MAHESWARI
> "Uma Maheswari Abishi Chowdhary Jahangeer Sidiq S These facs are great for dsa"

### Match Example 4: `rev_m_1385_1477` -> ABRAHAM SUDHARSON PONRAJ
- **Score**: 0.85
- **Reasons**: exact_alias:ABRAHAM SUDHARSON PONRAJ
> "52282	Sheena Christabel Pravin 50426	Abraham Sudharson Ponraj 53028	Manigandan M 50591	Bala Murugan M, S52207	Kiruthika V 53876	Prof. SONI ISHWARYA V 54179	Bibhuti Bhusan Pradhan 53876	Prof. SONI ISHW"

### Match Example 5: `rev_m_1386_1484` -> ABRAHAM SUDHARSON PONRAJ
- **Score**: 0.60
- **Reasons**: exact_alias:ABRAHAM
> "soni ishwarya sheena and abraham"

