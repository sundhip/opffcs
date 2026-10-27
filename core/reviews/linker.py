from typing import List, Dict, Any, Tuple

def link_candidate_messages(candidates: List[Dict[str, Any]], max_gap_seconds: int = 180) -> List[Dict[str, Any]]:
    """
    Links consecutive or rapid sequential messages from the same sender
    where one message provides context (e.g. faculty name) and the next provides
    evaluation/rating/opinion.
    """
    if not candidates:
        return []

    linked_units: List[Dict[str, Any]] = []
    skip_indices = set()

    for i in range(len(candidates)):
        if i in skip_indices:
            continue

        c1 = candidates[i]
        merged_text = c1["text"]
        linked_ids = [c1["message_id"]]
        reasons = list(c1["reasons"])
        start_line = c1["start_line"]
        end_line = c1["end_line"]
        explicit_rating = c1.get("explicit_rating")
        raw_mentions = {
            "names": list(c1["raw_mentions"]["names"]),
            "course_codes": list(c1["raw_mentions"]["course_codes"]),
            "slot_labels": list(c1["raw_mentions"]["slot_labels"])
        }
        max_confidence = c1["confidence"]

        # Look forward for rapid follow-ups from the same sender in the same file
        j = i + 1
        while j < len(candidates):
            c2 = candidates[j]
            # Must be same source file and same sender
            if c2["source_file"] != c1["source_file"] or c2["sender_hash"] != c1["sender_hash"]:
                break
                
            time_gap = c2["epoch_seconds"] - c1["epoch_seconds"]
            if time_gap < 0 or time_gap > max_gap_seconds:
                break

            # If message 2 is within 3 minutes and adds value (names, keywords, or rating)
            should_link = False
            # Case 1: c1 has name, c2 has rating/keywords, or vice-versa
            has_name_1 = bool(c1["raw_mentions"]["names"])
            has_name_2 = bool(c2["raw_mentions"]["names"])
            has_rat_1 = bool(c1.get("explicit_rating"))
            has_rat_2 = bool(c2.get("explicit_rating"))

            if (has_name_1 and not has_rat_1 and has_rat_2) or (not has_name_1 and has_name_2 and has_rat_1):
                should_link = True
            elif time_gap <= 60:  # Very short gap (< 60s) from same sender
                should_link = True

            if should_link:
                merged_text += " " + c2["text"]
                linked_ids.append(c2["message_id"])
                skip_indices.add(j)
                end_line = c2["end_line"]
                reasons.append("linked_rapid_continuation")
                if not explicit_rating and c2.get("explicit_rating"):
                    explicit_rating = c2.get("explicit_rating")
                raw_mentions["names"].extend(c2["raw_mentions"]["names"])
                raw_mentions["course_codes"].extend(c2["raw_mentions"]["course_codes"])
                raw_mentions["slot_labels"].extend(c2["raw_mentions"]["slot_labels"])
                max_confidence = max(max_confidence, c2["confidence"])
                j += 1
            else:
                break

        # Construct linked review unit
        unit = dict(c1)
        unit["review_id"] = f"rev_{linked_ids[0]}"
        unit["text"] = merged_text
        unit["linked_ids"] = linked_ids
        unit["reasons"] = list(set(reasons))
        unit["start_line"] = start_line
        unit["end_line"] = end_line
        unit["explicit_rating"] = explicit_rating
        unit["raw_mentions"] = {
            "names": list(set(raw_mentions["names"])),
            "course_codes": list(set(raw_mentions["course_codes"])),
            "slot_labels": list(set(raw_mentions["slot_labels"]))
        }
        unit["confidence"] = max_confidence
        linked_units.append(unit)

    return linked_units
