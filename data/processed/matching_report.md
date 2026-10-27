# Resumio FFCS: Faculty Review Matching & Rating Report

## 1. Matching Performance Summary

- **Total Ingested Reviews Processed**: 1,707
- **Confident Faculty Matches (`MATCHED`)**: **593** (34.7%)
- **Ambiguous Candidate Mentions (`AMBIGUOUS`)**: **601**
- **Weak Candidate Mentions (`WEAK`)**: **101**
- **Unmatched Reviews (`UNMATCHED`)**: **412**
- **Manual Overrides Applied**: **0**
- **Review Queue Size for Human Verification**: **702** items (saved to `match_review_queue.csv`)

## 2. Faculty Coverage & Ratings Summary

- **Total Canonical Faculty**: 69
- **Faculty with at least 1 Matched Review**: 58
- **Faculty with Numeric Explicit Ratings (0-5 scale)**: 0
- **Faculty with Low Sample (< 3 reviews or < 2 ratings)**: 69

## 3. Top-Reviewed Faculty Breakdown

| Faculty Name | Faculty ID | Review Count | Rated Count | Rating Mean | Distribution [1-5] | Low Sample |
|--------------|------------|--------------|-------------|-------------|--------------------|------------|
| ABRAHAM SUDHARSON PONRAJ | `fac_615716b47d6a` | 30 | 0 | N/A | [0,0,0,0,0] | True |
| SENTHIL PRAKASH P N | `fac_c6478be51cf8` | 28 | 0 | N/A | [0,0,0,0,0] | True |
| RAJESH M | `fac_5aedf2458fc0` | 27 | 0 | N/A | [0,0,0,0,0] | True |
| PRADEEP K | `fac_b37cfa0cc212` | 25 | 0 | N/A | [0,0,0,0,0] | True |
| KAVITHA J C | `fac_6ee18e020f02` | 24 | 0 | N/A | [0,0,0,0,0] | True |
| ASHIS BERA | `fac_37b69d32f686` | 24 | 0 | N/A | [0,0,0,0,0] | True |
| ANUBHA PEARLINE S | `fac_a8b9854f55f6` | 24 | 0 | N/A | [0,0,0,0,0] | True |
| FACE (APT) | `fac_9324b47c934e` | 23 | 0 | N/A | [0,0,0,0,0] | True |
| ETHNUS (APT) | `fac_c5b4020c350a` | 22 | 0 | N/A | [0,0,0,0,0] | True |
| RAJESH KUMAR MOHAPATRA | `fac_a48a3947a7cb` | 21 | 0 | N/A | [0,0,0,0,0] | True |
| TAHIR MUJTABA | `fac_a748b31379ab` | 18 | 0 | N/A | [0,0,0,0,0] | True |
| REVATHI S | `fac_e524d3bed355` | 18 | 0 | N/A | [0,0,0,0,0] | True |
| VIJAYAKUMAR K P | `fac_13088fa066c6` | 17 | 0 | N/A | [0,0,0,0,0] | True |
| SIVABALAKRISHNAN M | `fac_20d8e0954cbc` | 16 | 0 | N/A | [0,0,0,0,0] | True |
| DHANASEKAR S | `fac_074e6f74394d` | 16 | 0 | N/A | [0,0,0,0,0] | True |

## 4. Sample Matches with Explainability Chains (5 Examples)

### Match Example 1: `rev_m_1139_1163` -> LAKSHMI HARIKA PALIVELA
- **Score**: 0.60
- **Reasons**: exact_alias:LAKSHMI
> "Which is better faculty 1)(*Computation Structures* )53049-Dr.Revathi A R or 	50049-Dr.Nithya Darisini  P.S 2)( *Structured and Object-Oriented Programming*)53608-Dr.Benila S or 52866-Ms.Pankaja Laksh"

### Match Example 2: `rev_m_1318_1397` -> UMA MAHESWARI S
- **Score**: 0.85
- **Reasons**: exact_alias:S UMA MAHESWARI, exact_alias:UMA MAHESWARI
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

