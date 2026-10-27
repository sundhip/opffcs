import zipfile
import xml.etree.ElementTree as ET
import re
import os
from typing import Dict, List, Any, Optional, Tuple

class ExcelLoader:
    """
    Pure-Python standard-library XLSX reader.
    Handles shared strings, merged cell unrolling, hidden rows/columns,
    and cell type conversions with zero external dependencies.
    """
    def __init__(self, file_path: str):
        self.file_path = file_path
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Excel file not found at: {file_path}")

    @staticmethod
    def _col_str_to_idx(col_str: str) -> int:
        idx = 0
        for char in col_str:
            idx = idx * 26 + (ord(char.upper()) - ord('A')) + 1
        return idx - 1

    @staticmethod
    def _parse_cell_ref(ref: str) -> Tuple[int, int]:
        m = re.match(r'([A-Z]+)(\d+)', ref)
        if not m:
            raise ValueError(f"Invalid cell ref: {ref}")
        col_letters, row_str = m.groups()
        return int(row_str), ExcelLoader._col_str_to_idx(col_letters)

    def load_all_sheets(self) -> Dict[str, Dict[str, Any]]:
        with zipfile.ZipFile(self.file_path, 'r') as z:
            # 1. Shared Strings
            shared_strings: List[str] = []
            if 'xl/sharedStrings.xml' in z.namelist():
                tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
                ns = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
                for si in tree.findall('.//ns:si', ns):
                    texts = [t.text for t in si.findall('.//ns:t', ns) if t.text]
                    shared_strings.append("".join(texts))

            # 2. Workbook sheet names and rels
            wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
            ns_wb = {
                'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
                'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
            }
            sheets_info = []
            for s in wb_tree.findall('.//ns:sheet', ns_wb):
                sheets_info.append({
                    'name': s.attrib.get('name'),
                    'sheet_id': s.attrib.get('sheetId'),
                    'state': s.attrib.get('state', 'visible'),
                    'r_id': s.attrib.get('{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id')
                })

            rels_tree = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
            ns_rels = {'ns': 'http://schemas.openxmlformats.org/package/2006/relationships'}
            rel_map = {r.attrib['Id']: r.attrib['Target'] for r in rels_tree.findall('.//ns:Relationship', ns_rels)}

            for s in sheets_info:
                target = rel_map[s['r_id']]
                if target.startswith('/'):
                    target = target[1:]
                elif not target.startswith('xl/'):
                    target = 'xl/' + target
                s['target'] = target

            # 3. Read sheets
            sheet_results = {}
            for s in sheets_info:
                sheet_name = s['name']
                xml_content = z.read(s['target'])
                stree = ET.fromstring(xml_content)
                ns_s = {'ns': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

                dim_el = stree.find('.//ns:dimension', ns_s)
                dimension = dim_el.attrib.get('ref') if dim_el is not None else 'Unknown'

                # Merged cells (ref: e.g. "A1:B2")
                merged_ranges = []
                for mc in stree.findall('.//ns:mergeCell', ns_s):
                    ref = mc.attrib.get('ref')
                    if ':' in ref:
                        start_ref, end_ref = ref.split(':')
                        s_r, s_c = self._parse_cell_ref(start_ref)
                        e_r, e_c = self._parse_cell_ref(end_ref)
                        merged_ranges.append(((s_r, s_c), (e_r, e_c)))

                # Hidden rows
                hidden_rows = set()
                rows_data: Dict[int, Dict[int, Any]] = {}

                for row_el in stree.findall('.//ns:sheetData/ns:row', ns_s):
                    r_idx = int(row_el.attrib.get('r'))
                    if row_el.attrib.get('hidden') in ['1', 'true']:
                        hidden_rows.add(r_idx)
                    row_cells = {}
                    for c in row_el.findall('ns:c', ns_s):
                        c_ref = c.attrib.get('r')
                        _, c_idx = self._parse_cell_ref(c_ref)

                        t = c.attrib.get('t', 'n')
                        val_el = c.find('ns:v', ns_s)
                        val = val_el.text if val_el is not None else None

                        if t == 's' and val is not None:
                            val = shared_strings[int(val)] if int(val) < len(shared_strings) else val
                        elif t == 'inlineStr':
                            is_el = c.find('.//ns:t', ns_s)
                            val = is_el.text if is_el is not None else val
                        elif t == 'b':
                            val = (val == '1')
                        elif val is not None and t == 'n':
                            try:
                                val = float(val) if '.' in val else int(val)
                            except ValueError:
                                pass
                        row_cells[c_idx] = val
                    rows_data[r_idx] = row_cells

                # Unroll merged cells
                for (s_r, s_c), (e_r, e_c) in merged_ranges:
                    top_left_val = rows_data.get(s_r, {}).get(s_c, None)
                    for r in range(s_r, e_r + 1):
                        if r not in rows_data:
                            rows_data[r] = {}
                        for c in range(s_c, e_c + 1):
                            if rows_data[r].get(c) is None:
                                rows_data[r][c] = top_left_val

                # Build 2D list of rows
                all_r_indices = sorted(rows_data.keys())
                max_col = max((max(cells.keys()) if cells else 0) for cells in rows_data.values()) if rows_data else 0

                rows_list: List[Tuple[int, List[Any]]] = []
                for r_idx in all_r_indices:
                    cells = rows_data[r_idx]
                    row_vals = [cells.get(c, None) for c in range(max_col + 1)]
                    rows_list.append((r_idx, row_vals))

                sheet_results[sheet_name] = {
                    "dimension": dimension,
                    "hidden_rows": list(hidden_rows),
                    "merged_ranges": merged_ranges,
                    "rows": rows_list,
                    "max_col": max_col
                }

        return sheet_results
