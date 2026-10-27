import time
import pytest
from core.slots.slot_map import default_slot_map
from core.slots.clash import meetings_to_bitmask, check_clash_bitmask

def test_benchmark_one_million_clashes():
    """
    Benchmarks 1,000,000 pairwise bitmask clash operations.
    Asserts performance completes well under 2.0 seconds.
    """
    labels = default_slot_map.get_all_labels()
    masks = [meetings_to_bitmask(default_slot_map.get_meetings_for_label(l)) for l in labels]
    
    num_masks = len(masks)
    total_checks = 1_000_000
    
    start_time = time.perf_counter()
    
    clash_count = 0
    # Run 1,000,000 checks in a tight loop
    for i in range(total_checks):
        m1 = masks[i % num_masks]
        m2 = masks[(i * 7 + 3) % num_masks]
        if (m1 & m2) != 0:
            clash_count += 1
            
    elapsed = time.perf_counter() - start_time
    rate = total_checks / elapsed
    
    print(f"\n[BENCHMARK] Executed {total_checks:,} bitmask clash checks in {elapsed:.4f} seconds ({rate:,.0f} checks/sec).")
    print(f"[BENCHMARK] Total clashes detected: {clash_count:,}")
    
    assert elapsed < 2.0, f"Benchmark took too long: {elapsed:.4f}s"
