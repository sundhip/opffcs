import sqlite3
import json
from collections import defaultdict
from core.slots.clash import OfferingsBitmaskIndex

conn = sqlite3.connect('D:/ffcs-maker/data/app.db')
cursor = conn.cursor()
cursor.execute('''SELECT c.code, f.canonical_name, o.theory_slots, o.lab_session, o.id 
                  FROM offerings o 
                  JOIN courses c ON o.course_id = c.id 
                  JOIN faculty f ON o.faculty_id = f.id 
                  WHERE o.dataset_id = (SELECT id FROM datasets WHERE is_active = 1)''')
rows = cursor.fetchall()

selected = ['BACSE204', 'BACSE205', 'BACSE324', 'BACSE345', 'BAMAT205', 'BASTS102', 'BAHUM202']
course_shapes = defaultdict(lambda: defaultdict(list))
for code, fac, th, lb, oid in rows:
    if code in selected:
        th_list = json.loads(th) if th else []
        lb_dict = json.loads(lb) if lb else None
        lb_slots = lb_dict.get('slots') if lb_dict else []
        shape_key = (tuple(sorted(th_list)), tuple(sorted(lb_slots)))
        course_shapes[code][shape_key].append({'faculty': fac, 'oid': oid})

index = OfferingsBitmaskIndex()
shapes_per_course = {}
for code in selected:
    shapes_per_course[code] = []
    for shape_key, fac_list in course_shapes[code].items():
        th = list(shape_key[0])
        lb = {'slots': list(shape_key[1])} if shape_key[1] else None
        mask = index.get_offering_mask({'theory_slots': th, 'lab_session': lb})
        shapes_per_course[code].append({
            'shape_key': shape_key,
            'mask': mask,
            'teachers': [f['faculty'] for f in fac_list],
            'offerings': fac_list
        })

valid_combos = []
def backtrack(idx, mask, chosen):
    if idx == len(selected):
        valid_combos.append(list(chosen))
        return
    cc = selected[idx]
    for sh in shapes_per_course[cc]:
        if (mask & sh['mask']) == 0:
            backtrack(idx + 1, mask | sh['mask'], chosen + [(cc, sh)])

backtrack(0, 0, [])
print('Total distinct conflict-free timetable SHAPES:', len(valid_combos))
for i, c in enumerate(valid_combos):
    labs = [f"{cc}:{sh['shape_key'][1]}" for cc, sh in c if sh['shape_key'][1]]
    total_teachers = 1
    for cc, sh in c:
        total_teachers *= len(sh['teachers'])
    print(f"Shape #{i+1}: Labs={labs} -> {total_teachers} teacher permutations")
