import io
import zipfile
import csv
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors as rl_colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from PIL import Image, ImageDraw, ImageFont


# Course Color Palettes matching frontend/src/utils/colors.ts
COURSE_PALETTES = [
    {"name": "Indigo", "hexBg": "#e0e7ff", "hexBorder": "#6366f1", "hexText": "#312e81"},
    {"name": "Emerald", "hexBg": "#d1fae5", "hexBorder": "#10b981", "hexText": "#064e3b"},
    {"name": "Amber", "hexBg": "#fef3c7", "hexBorder": "#f59e0b", "hexText": "#78350f"},
    {"name": "Rose", "hexBg": "#ffe4e6", "hexBorder": "#f43f5e", "hexText": "#881337"},
    {"name": "Cyan", "hexBg": "#cffafe", "hexBorder": "#06b6d4", "hexText": "#164e63"},
    {"name": "Purple", "hexBg": "#f3e8ff", "hexBorder": "#a855f7", "hexText": "#581c87"},
    {"name": "Teal", "hexBg": "#ccfbf1", "hexBorder": "#14b8a6", "hexText": "#134e4a"},
    {"name": "Orange", "hexBg": "#ffedd5", "hexBorder": "#f97316", "hexText": "#7c2d12"},
    {"name": "Blue", "hexBg": "#dbeafe", "hexBorder": "#3b82f6", "hexText": "#1e3a8a"},
    {"name": "Fuchsia", "hexBg": "#fae8ff", "hexBorder": "#d946ef", "hexText": "#701a75"}
]

def get_course_palette(course_code: str) -> Dict[str, str]:
    if not course_code:
        return COURSE_PALETTES[0]
    h = 0
    for ch in course_code:
        h = ((h << 5) - h) + ord(ch)
        h &= 0xFFFFFFFF
    if h >= 0x80000000:
        h -= 0x100000000
    idx = abs(h) % len(COURSE_PALETTES)
    return COURSE_PALETTES[idx]

DAYS = ["MON", "TUE", "WED", "THU", "FRI"]

# Standard 12 periods grid definition for matrix export
PERIOD_HEADERS = [
    {"idx": 0, "label": "P1 (08:00-08:50)", "start_min": 480, "end_min": 530, "is_lab_split": False},
    {"idx": 1, "label": "P2 (08:55-09:45)", "start_min": 535, "end_min": 585, "is_lab_split": True},
    {"idx": 2, "label": "P3 (09:50-10:40)", "start_min": 590, "end_min": 640, "is_lab_split": False},
    {"idx": 3, "label": "P4 (10:45-11:35)", "start_min": 645, "end_min": 695, "is_lab_split": True},
    {"idx": 4, "label": "P5 (11:40-12:30)", "start_min": 700, "end_min": 750, "is_lab_split": False},
    {"idx": 5, "label": "P6 (12:35-13:25)", "start_min": 755, "end_min": 805, "is_lab_split": True},
    {"idx": -1, "label": "LUNCH (13:25-14:00)", "start_min": 805, "end_min": 840, "is_lunch": True},
    {"idx": 6, "label": "P7 (14:00-14:50)", "start_min": 840, "end_min": 890, "is_lab_split": False},
    {"idx": 7, "label": "P8 (14:55-15:45)", "start_min": 895, "end_min": 945, "is_lab_split": True},
    {"idx": 8, "label": "P9 (15:50-16:40)", "start_min": 950, "end_min": 1000, "is_lab_split": False},
    {"idx": 9, "label": "P10 (16:45-17:35)", "start_min": 1005, "end_min": 1055, "is_lab_split": True},
    {"idx": 10, "label": "P11 (17:40-18:30)", "start_min": 1060, "end_min": 1110, "is_lab_split": False},
    {"idx": 11, "label": "P12 (18:35-19:25)", "start_min": 1115, "end_min": 1165, "is_lab_split": True},
]

def find_matching_meeting(meetings: List[Dict[str, Any]], start_min: int, end_min: int) -> Optional[Dict[str, Any]]:
    for m in meetings:
        # Check interval overlap
        m_start = m.get("start_min", 0)
        m_end = m.get("end_min", 0)
        if m_start < end_min and start_min < m_end:
            return m
    return None


class TimetableExporter:
    """Production-grade exporter for FFCS timetables into Excel, CSV, PDF, PNG, and ZIP."""

    @staticmethod
    def export_to_excel(
        timetable: Dict[str, Any],
        course_details: List[Dict[str, Any]],
        stats: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generates a 3-sheet Excel workbook:
          Sheet 1: Weekly Grid with merged cells for lab sessions and colors
          Sheet 2: Course List (code, title, credits, faculty, slots, venue, rating)
          Sheet 3: Schedule & Free-Time Summary
        """
        wb = openpyxl.Workbook()
        thin_border = Border(
            left=Side(style='thin', color='D1D5DB'),
            right=Side(style='thin', color='D1D5DB'),
            top=Side(style='thin', color='D1D5DB'),
            bottom=Side(style='thin', color='D1D5DB')
        )
        thick_lunch_border = Border(
            left=Side(style='medium', color='9CA3AF'),
            right=Side(style='medium', color='9CA3AF'),
            top=Side(style='thin', color='D1D5DB'),
            bottom=Side(style='thin', color='D1D5DB')
        )

        # -------------------------------------------------------------
        # Sheet 1: Weekly Timetable Grid
        # -------------------------------------------------------------
        ws_grid = wb.active
        ws_grid.title = "Weekly Timetable"
        ws_grid.views.sheetView[0].showGridLines = True

        # Title row
        ws_grid.merge_cells("A1:N1")
        title_cell = ws_grid["A1"]
        title_cell.value = f"Resumio FFCS Timetable — ID: {timetable.get('timetable_id', 'T1')}"
        title_cell.font = Font(name="Calibri", size=14, bold=True, color="1E3A8A")
        title_cell.alignment = Alignment(horizontal="left", vertical="center")
        ws_grid.row_dimensions[1].height = 28

        # Header Row
        ws_grid.cell(row=3, column=1, value="Day / Time").font = Font(bold=True)
        ws_grid.cell(row=3, column=1).alignment = Alignment(horizontal="center", vertical="center")
        ws_grid.cell(row=3, column=1).fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
        ws_grid.cell(row=3, column=1).border = thin_border

        for col_idx, col_info in enumerate(PERIOD_HEADERS, start=2):
            cell = ws_grid.cell(row=3, column=col_idx, value=col_info["label"])
            cell.font = Font(size=9, bold=True, color="374151")
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.fill = PatternFill(
                start_color="E5E7EB" if col_info.get("is_lunch") else "F9FAFB",
                end_color="E5E7EB" if col_info.get("is_lunch") else "F9FAFB",
                fill_type="solid"
            )
            cell.border = thick_lunch_border if col_info.get("is_lunch") else thin_border

        ws_grid.row_dimensions[3].height = 26

        timeline = timetable.get("per_day_timeline", {})

        # Populate rows
        for r_idx, day in enumerate(DAYS, start=4):
            ws_grid.row_dimensions[r_idx].height = 54
            day_cell = ws_grid.cell(row=r_idx, column=1, value=day)
            day_cell.font = Font(bold=True, size=11, color="111827")
            day_cell.alignment = Alignment(horizontal="center", vertical="center")
            day_cell.fill = PatternFill(start_color="F3F4F6", end_color="F3F4F6", fill_type="solid")
            day_cell.border = thin_border

            day_meetings = timeline.get(day, [])
            merged_spans: List[Tuple[int, int]] = []
            visited_cols = set()

            for col_idx, col_info in enumerate(PERIOD_HEADERS, start=2):
                if col_idx in visited_cols:
                    continue

                cell = ws_grid.cell(row=r_idx, column=col_idx)
                cell.border = thin_border

                if col_info.get("is_lunch"):
                    cell.value = "LUNCH\nBREAK"
                    cell.font = Font(size=8, italic=True, color="6B7280")
                    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                    cell.fill = PatternFill(start_color="E5E7EB", end_color="E5E7EB", fill_type="solid")
                    cell.border = thick_lunch_border
                    continue

                m = find_matching_meeting(day_meetings, col_info["start_min"], col_info["end_min"])
                if m:
                    # Check if this meeting also covers the next period (e.g. 100-min lab L37+L38)
                    span_cols = 1
                    next_col = col_idx + 1
                    if next_col <= len(PERIOD_HEADERS) + 1:
                        next_info = PERIOD_HEADERS[next_col - 2]
                        if not next_info.get("is_lunch"):
                            m_next = find_matching_meeting(day_meetings, next_info["start_min"], next_info["end_min"])
                            if m_next and m_next.get("slot_label") == m.get("slot_label") and m_next.get("course_code") == m.get("course_code"):
                                span_cols = 2

                    pal = get_course_palette(m.get("course_code", ""))
                    hex_clean = pal["hexBg"].replace("#", "").upper()

                    kind_badge = "[LAB]" if m.get("kind") == "lab" else "[TH]"
                    cell.value = f"{m.get('course_code')}\n{m.get('slot_label')} {kind_badge}\n{m.get('venue', '')}"
                    cell.font = Font(size=9, bold=True, color="1F2937")
                    cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
                    cell.fill = PatternFill(start_color=hex_clean, end_color=hex_clean, fill_type="solid")

                    if span_cols == 2:
                        ws_grid.merge_cells(start_row=r_idx, start_column=col_idx, end_row=r_idx, end_column=col_idx + 1)
                        ws_grid.cell(row=r_idx, column=col_idx + 1).border = thin_border
                        ws_grid.cell(row=r_idx, column=col_idx + 1).fill = PatternFill(start_color=hex_clean, end_color=hex_clean, fill_type="solid")
                        visited_cols.add(col_idx + 1)
                else:
                    cell.value = "—"
                    cell.font = Font(size=9, color="9CA3AF")
                    cell.alignment = Alignment(horizontal="center", vertical="center")

        # Column widths
        ws_grid.column_dimensions["A"].width = 12
        for col_idx in range(2, len(PERIOD_HEADERS) + 2):
            col_letter = get_column_letter(col_idx)
            ws_grid.column_dimensions[col_letter].width = 15

        # Fit to page
        ws_grid.page_setup.orientation = ws_grid.ORIENTATION_LANDSCAPE
        ws_grid.page_setup.paperSize = ws_grid.PAPERSIZE_A4
        ws_grid.sheet_properties.pageSetUpPr.fitToPage = True
        ws_grid.page_setup.fitToWidth = 1
        ws_grid.page_setup.fitToHeight = 1

        # -------------------------------------------------------------
        # Sheet 2: Course List
        # -------------------------------------------------------------
        ws_courses = wb.create_sheet(title="Course List")
        ws_courses.views.sheetView[0].showGridLines = True

        ws_courses.append([f"Course & Faculty List — {timetable.get('timetable_id')}"])
        ws_courses["A1"].font = Font(size=14, bold=True, color="1E3A8A")
        ws_courses.row_dimensions[1].height = 25

        headers_courses = ["Course Code", "Course Title", "Credits", "Faculty Name", "Theory Slots", "Lab Session", "Venue", "Rating (Mean)", "Review Count"]
        ws_courses.append(headers_courses)
        for col_i in range(1, len(headers_courses) + 1):
            cell = ws_courses.cell(row=2, column=col_i)
            cell.font = Font(bold=True, color="374151")
            cell.fill = PatternFill(start_color="E5E7EB", end_color="E5E7EB", fill_type="solid")
            cell.border = thin_border
            cell.alignment = Alignment(horizontal="left", vertical="center")

        ws_courses.row_dimensions[2].height = 22

        for c_row_i, c in enumerate(course_details, start=3):
            pal = get_course_palette(c.get("course_code", ""))
            hex_clean = pal["hexBg"].replace("#", "").upper()

            th_slots = c.get("theory_slots", [])
            th_str = "+".join(str(s) for s in th_slots) if isinstance(th_slots, list) and th_slots else (str(th_slots) if th_slots else "—")

            lb_slots = c.get("lab_slots", [])
            if isinstance(lb_slots, list):
                lb_str = "+".join(str(s) for s in lb_slots) if lb_slots else "—"
            elif isinstance(lb_slots, dict):
                lb_str = lb_slots.get("raw_slot") or "+".join(str(s) for s in (lb_slots.get("slots") or lb_slots.get("labels", [])))
            else:
                lb_str = str(lb_slots) if lb_slots else "—"

            row_data = [
                c.get("course_code", ""),
                c.get("course_title", ""),
                c.get("credits", 0),
                c.get("faculty_name", ""),
                th_str,
                lb_str,
                c.get("venue") or "—",
                f"{c.get('rating_mean', 0.0):.1f}" if c.get("rating_mean") else "Unrated",
                c.get("review_count", 0)
            ]
            ws_courses.append(row_data)
            for col_i in range(1, len(headers_courses) + 1):
                cell = ws_courses.cell(row=c_row_i, column=col_i)
                cell.border = thin_border
                cell.alignment = Alignment(vertical="center")
                if col_i == 1:
                    cell.fill = PatternFill(start_color=hex_clean, end_color=hex_clean, fill_type="solid")
                    cell.font = Font(bold=True)

        for col in ws_courses.columns:
            max_len = max(len(str(cell.value or '')) for cell in col)
            col_letter = get_column_letter(col[0].column)
            ws_courses.column_dimensions[col_letter].width = max(max_len + 3, 12)

        # -------------------------------------------------------------
        # Sheet 3: Schedule & Free-Time Summary
        # -------------------------------------------------------------
        ws_summary = wb.create_sheet(title="Schedule Summary")
        ws_summary.views.sheetView[0].showGridLines = True

        ws_summary.append(["Schedule Metrics & Free Time Analysis"])
        ws_summary["A1"].font = Font(size=14, bold=True, color="1E3A8A")
        ws_summary.row_dimensions[1].height = 25

        summary_metrics = [
            ("Timetable ID", timetable.get("timetable_id", "T1")),
            ("Working Days", ", ".join(timetable.get("working_days", []))),
            ("Free Days", ", ".join(timetable.get("free_days", [])) if timetable.get("free_days") else "None"),
            ("Earliest Class Start", timetable.get("earliest_start", "08:00")),
            ("Latest Class End", timetable.get("latest_end", "19:25")),
            ("Max Daily Hours", f"{timetable.get('max_daily_hours', 0.0):.1f} hrs"),
            ("Longest Gap", f"{timetable.get('longest_gap_minutes', 0)} mins"),
            ("Average Faculty Rating", f"{timetable.get('avg_faculty_rating', 0.0):.2f} / 5.0"),
            ("Overall Score", f"{timetable.get('score', 0.0):.1f}"),
        ]

        ws_summary.append(["Metric", "Value"])
        ws_summary.cell(row=2, column=1).font = Font(bold=True)
        ws_summary.cell(row=2, column=2).font = Font(bold=True)
        ws_summary.cell(row=2, column=1).fill = PatternFill(start_color="E5E7EB", fill_type="solid")
        ws_summary.cell(row=2, column=2).fill = PatternFill(start_color="E5E7EB", fill_type="solid")

        for m_idx, (k, v) in enumerate(summary_metrics, start=3):
            ws_summary.append([k, v])
            ws_summary.cell(row=m_idx, column=1).border = thin_border
            ws_summary.cell(row=m_idx, column=2).border = thin_border

        ws_summary.column_dimensions["A"].width = 25
        ws_summary.column_dimensions["B"].width = 35

        output = io.BytesIO()
        wb.save(output)
        output.seek(0)
        return output.getvalue()

    @staticmethod
    def export_to_csv(
        timetable: Dict[str, Any],
        course_details: Optional[List[Dict[str, Any]]] = None
    ) -> str:
        """
        Exports all meetings in canonical timeline structure into UTF-8 CSV with BOM.
        """
        output = io.StringIO()
        # Write UTF-8 BOM
        output.write('\ufeff')
        writer = csv.writer(output)

        writer.writerow([
            "Day",
            "Start Time",
            "End Time",
            "Course Code",
            "Faculty",
            "Kind",
            "Slot Label",
            "Venue"
        ])

        timeline = timetable.get("per_day_timeline", {})
        for day in DAYS:
            for m in timeline.get(day, []):
                writer.writerow([
                    day,
                    m.get("start_time", ""),
                    m.get("end_time", ""),
                    m.get("course_code", ""),
                    m.get("faculty_name", ""),
                    m.get("kind", "").upper(),
                    m.get("slot_label", ""),
                    m.get("venue") or ""
                ])

        return output.getvalue()

    @staticmethod
    def export_to_pdf(
        timetable: Dict[str, Any],
        course_details: List[Dict[str, Any]],
        stats: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Generates a landscape A4 PDF containing the weekly grid, course list, and metrics.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=landscape(A4),
            leftMargin=24,
            rightMargin=24,
            topMargin=24,
            bottomMargin=24
        )

        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontSize=16,
            leading=20,
            textColor=rl_colors.HexColor("#1e3a8a"),
            spaceAfter=8
        )
        subtitle_style = ParagraphStyle(
            name="SubtitleStyle",
            parent=styles["Normal"],
            fontSize=9,
            textColor=rl_colors.HexColor("#4b5563"),
            spaceAfter=12
        )
        cell_style = ParagraphStyle(
            name="GridCell",
            parent=styles["Normal"],
            fontSize=7,
            leading=8.5,
            alignment=1, # Center
            textColor=rl_colors.HexColor("#111827")
        )
        cell_header_style = ParagraphStyle(
            name="GridHeaderCell",
            parent=styles["Normal"],
            fontSize=7,
            leading=8,
            alignment=1,
            fontName="Helvetica-Bold",
            textColor=rl_colors.HexColor("#374151")
        )
        table_text_style = ParagraphStyle(
            name="TableText",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            textColor=rl_colors.HexColor("#1f2937")
        )
        table_header_style = ParagraphStyle(
            name="TableHeader",
            parent=styles["Normal"],
            fontSize=8,
            leading=10,
            fontName="Helvetica-Bold",
            textColor=rl_colors.white
        )

        elements = []

        # Title
        tt_id = timetable.get("timetable_id", "T1")
        elements.append(Paragraph(f"Resumio FFCS Timetable — {tt_id}", title_style))
        metrics_str = f"Working Days: {', '.join(timetable.get('working_days', []))}  |  Free Days: {', '.join(timetable.get('free_days', [])) or 'None'}  |  Max Daily: {timetable.get('max_daily_hours', 0.0):.1f}h  |  Avg Rating: {timetable.get('avg_faculty_rating', 0.0):.2f}/5.0  |  Score: {timetable.get('score', 0.0):.1f}"
        elements.append(Paragraph(metrics_str, subtitle_style))

        # -------------------------------------------------------------
        # Grid Matrix Table
        # -------------------------------------------------------------
        headers = [Paragraph("<b>Day</b>", cell_header_style)]
        for p in PERIOD_HEADERS:
            short_lbl = p["label"].replace(" (", "<br/>(").replace(")", ")")
            headers.append(Paragraph(short_lbl, cell_header_style))

        grid_data = [headers]
        timeline = timetable.get("per_day_timeline", {})

        # Table style commands
        t_style_cmds = [
            ('BACKGROUND', (0, 0), (-1, 0), rl_colors.HexColor("#f3f4f6")),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#d1d5db")),
            ('BOX', (0, 0), (-1, -1), 1, rl_colors.HexColor("#9ca3af")),
            ('BACKGROUND', (0, 0), (0, -1), rl_colors.HexColor("#f3f4f6")),
            ('BACKGROUND', (7, 0), (7, -1), rl_colors.HexColor("#e5e7eb")), # Lunch column
        ]

        for r_idx, day in enumerate(DAYS, start=1):
            row_cells = [Paragraph(f"<b>{day}</b>", cell_header_style)]
            day_meetings = timeline.get(day, [])
            visited_cols = set()

            for c_idx, col_info in enumerate(PERIOD_HEADERS, start=1):
                if c_idx in visited_cols:
                    continue

                if col_info.get("is_lunch"):
                    row_cells.append(Paragraph("<i>Lunch</i>", cell_style))
                    continue

                m = find_matching_meeting(day_meetings, col_info["start_min"], col_info["end_min"])
                if m:
                    pal = get_course_palette(m.get("course_code", ""))
                    bg_color = rl_colors.HexColor(pal["hexBg"])

                    # Check next column for 100-min lab span
                    span_cols = 1
                    if c_idx < len(PERIOD_HEADERS):
                        next_info = PERIOD_HEADERS[c_idx]
                        if not next_info.get("is_lunch"):
                            m_next = find_matching_meeting(day_meetings, next_info["start_min"], next_info["end_min"])
                            if m_next and m_next.get("slot_label") == m.get("slot_label") and m_next.get("course_code") == m.get("course_code"):
                                span_cols = 2

                    kind_str = "LAB" if m.get("kind") == "lab" else "TH"
                    cell_text = f"<b>{m.get('course_code')}</b><br/>{m.get('slot_label')} [{kind_str}]<br/>{m.get('venue') or ''}"
                    row_cells.append(Paragraph(cell_text, cell_style))

                    t_style_cmds.append(('BACKGROUND', (c_idx, r_idx), (c_idx + span_cols - 1, r_idx), bg_color))
                    if span_cols == 2:
                        t_style_cmds.append(('SPAN', (c_idx, r_idx), (c_idx + 1, r_idx)))
                        visited_cols.add(c_idx + 1)
                        row_cells.append(Paragraph("", cell_style))
                else:
                    row_cells.append(Paragraph("—", cell_style))

            grid_data.append(row_cells)

        col_widths = [45] + [56] * len(PERIOD_HEADERS)
        grid_table = Table(grid_data, colWidths=col_widths, repeatRows=1)
        grid_table.setStyle(TableStyle(t_style_cmds))
        elements.append(grid_table)
        elements.append(Spacer(1, 14))

        # -------------------------------------------------------------
        # Course Summary Table
        # -------------------------------------------------------------
        elements.append(Paragraph("<b>Enrolled Courses & Faculty</b>", ParagraphStyle(
            name="SecTitle", parent=styles["Heading2"], fontSize=11, leading=14, textColor=rl_colors.HexColor("#1e3a8a"), spaceAfter=6
        )))

        c_table_data = [[
            Paragraph("Code", table_header_style),
            Paragraph("Course Title", table_header_style),
            Paragraph("Credits", table_header_style),
            Paragraph("Faculty Name", table_header_style),
            Paragraph("Slots", table_header_style),
            Paragraph("Venue", table_header_style),
            Paragraph("Rating", table_header_style),
        ]]

        c_table_styles = [
            ('BACKGROUND', (0, 0), (-1, 0), rl_colors.HexColor("#1e3a8a")),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#e5e7eb")),
            ('BOX', (0, 0), (-1, -1), 0.5, rl_colors.HexColor("#9ca3af")),
        ]

        for c_idx, c in enumerate(course_details, start=1):
            pal = get_course_palette(c.get("course_code", ""))
            bg_color = rl_colors.HexColor(pal["hexBg"])
            c_table_styles.append(('BACKGROUND', (0, c_idx), (0, c_idx), bg_color))

            th_slots = c.get("theory_slots", [])
            th_str = "+".join(str(s) for s in th_slots) if isinstance(th_slots, list) and th_slots else (str(th_slots) if th_slots else "")

            lb_slots = c.get("lab_slots", [])
            if isinstance(lb_slots, list):
                lb_str = "+".join(str(s) for s in lb_slots) if lb_slots else ""
            elif isinstance(lb_slots, dict):
                lb_str = lb_slots.get("raw_slot") or "+".join(str(s) for s in (lb_slots.get("slots") or lb_slots.get("labels", [])))
            else:
                lb_str = str(lb_slots) if lb_slots else ""

            slots_str = th_str
            if lb_str:
                slots_str = f"{slots_str} / {lb_str}" if slots_str else lb_str
            if not slots_str:
                slots_str = "—"

            rating_str = f"{c.get('rating_mean', 0.0):.1f} ({c.get('review_count', 0)})" if c.get('rating_mean') else "Unrated"

            c_table_data.append([
                Paragraph(f"<b>{c.get('course_code', '')}</b>", table_text_style),
                Paragraph(c.get("course_title", ""), table_text_style),
                Paragraph(str(c.get("credits", 0)), table_text_style),
                Paragraph(c.get("faculty_name", ""), table_text_style),
                Paragraph(slots_str, table_text_style),
                Paragraph(c.get("venue") or "—", table_text_style),
                Paragraph(rating_str, table_text_style)
            ])

        course_widths = [65, 230, 45, 170, 110, 65, 80]
        course_table = Table(c_table_data, colWidths=course_widths, repeatRows=1)
        course_table.setStyle(TableStyle(c_table_styles))
        elements.append(KeepTogether(course_table))

        doc.build(elements)
        buffer.seek(0)
        return buffer.getvalue()

    @staticmethod
    def export_to_png(
        timetable: Dict[str, Any],
        course_details: Optional[List[Dict[str, Any]]] = None,
        scale: int = 2
    ) -> bytes:
        """
        Renders a high-resolution weekly timetable image using Pillow.
        """
        base_w, base_h = 1400, 750
        width = base_w * scale
        height = base_h * scale

        img = Image.new("RGBA", (width, height), (255, 255, 255, 255))
        draw = ImageDraw.Draw(img)

        # Standard system fonts or fallbacks
        try:
            title_font = ImageFont.truetype("arialbd.ttf", 16 * scale)
            head_font = ImageFont.truetype("arialbd.ttf", 9 * scale)
            body_font = ImageFont.truetype("arial.ttf", 8 * scale)
            bold_font = ImageFont.truetype("arialbd.ttf", 8 * scale)
        except Exception:
            title_font = ImageFont.load_default()
            head_font = ImageFont.load_default()
            body_font = ImageFont.load_default()
            bold_font = ImageFont.load_default()

        # Margins & layout
        left_m = 30 * scale
        top_m = 60 * scale
        day_w = 80 * scale
        grid_w = width - left_m - (30 * scale) - day_w
        num_periods = len(PERIOD_HEADERS)
        col_w = grid_w / num_periods
        row_h = 100 * scale

        # Title
        tt_id = timetable.get("timetable_id", "T1")
        draw.text((left_m, 20 * scale), f"Resumio FFCS Timetable — {tt_id}", fill=(30, 58, 138), font=title_font)

        # Period Headers
        header_y = top_m
        for c_idx, p in enumerate(PERIOD_HEADERS):
            x0 = left_m + day_w + c_idx * col_w
            x1 = x0 + col_w
            fill_c = (229, 231, 235) if p.get("is_lunch") else (243, 244, 246)
            draw.rectangle([x0, header_y, x1, header_y + 35 * scale], fill=fill_c, outline=(209, 213, 219), width=scale)
            label = p["label"].split(" (")[0]
            time_str = p["label"].split("(")[-1].replace(")", "")
            draw.text((x0 + 4 * scale, header_y + 4 * scale), label, fill=(55, 65, 81), font=head_font)
            draw.text((x0 + 4 * scale, header_y + 18 * scale), time_str, fill=(107, 114, 128), font=body_font)

        # Days & Grid
        timeline = timetable.get("per_day_timeline", {})
        curr_y = header_y + 35 * scale

        for day in DAYS:
            # Day header
            draw.rectangle([left_m, curr_y, left_m + day_w, curr_y + row_h], fill=(243, 244, 246), outline=(209, 213, 219), width=scale)
            draw.text((left_m + 22 * scale, curr_y + 40 * scale), day, fill=(17, 24, 39), font=title_font)

            day_meetings = timeline.get(day, [])
            visited_cols = set()

            for c_idx, p in enumerate(PERIOD_HEADERS):
                if c_idx in visited_cols:
                    continue

                x0 = left_m + day_w + c_idx * col_w
                x1 = x0 + col_w

                if p.get("is_lunch"):
                    draw.rectangle([x0, curr_y, x1, curr_y + row_h], fill=(229, 231, 235), outline=(156, 163, 175), width=scale)
                    draw.text((x0 + 10 * scale, curr_y + 42 * scale), "LUNCH", fill=(107, 114, 128), font=bold_font)
                    continue

                m = find_matching_meeting(day_meetings, p["start_min"], p["end_min"])
                if m:
                    # Check next column for 100-min lab span
                    span_cols = 1
                    if c_idx + 1 < len(PERIOD_HEADERS):
                        next_info = PERIOD_HEADERS[c_idx + 1]
                        if not next_info.get("is_lunch"):
                            m_next = find_matching_meeting(day_meetings, next_info["start_min"], next_info["end_min"])
                            if m_next and m_next.get("slot_label") == m.get("slot_label") and m_next.get("course_code") == m.get("course_code"):
                                span_cols = 2

                    pal = get_course_palette(m.get("course_code", ""))
                    # Convert hex to RGB tuple
                    hex_str = pal["hexBg"].lstrip('#')
                    bg_rgb = tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))
                    border_str = pal["hexBorder"].lstrip('#')
                    border_rgb = tuple(int(border_str[i:i+2], 16) for i in (0, 2, 4))

                    end_x = x0 + span_cols * col_w
                    draw.rectangle([x0 + scale, curr_y + scale, end_x - scale, curr_y + row_h - scale], fill=bg_rgb, outline=border_rgb, width=scale)

                    kind_str = "[LAB]" if m.get("kind") == "lab" else "[TH]"
                    draw.text((x0 + 6 * scale, curr_y + 12 * scale), m.get("course_code", ""), fill=(17, 24, 39), font=bold_font)
                    draw.text((x0 + 6 * scale, curr_y + 32 * scale), f"{m.get('slot_label')} {kind_str}", fill=(55, 65, 81), font=body_font)
                    draw.text((x0 + 6 * scale, curr_y + 52 * scale), m.get("faculty_name", "")[:18], fill=(75, 85, 99), font=body_font)
                    if m.get("venue"):
                        draw.text((x0 + 6 * scale, curr_y + 72 * scale), m.get("venue", ""), fill=(107, 114, 128), font=body_font)

                    if span_cols == 2:
                        visited_cols.add(c_idx + 1)
                else:
                    draw.rectangle([x0, curr_y, x1, curr_y + row_h], fill=(255, 255, 255), outline=(229, 231, 235), width=scale)
                    draw.text((x0 + 25 * scale, curr_y + 45 * scale), "—", fill=(209, 213, 219), font=body_font)

            curr_y += row_h

        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        buffer.seek(0)
        return buffer.getvalue()

    @classmethod
    def export_zip_bundle(
        cls,
        timetable: Dict[str, Any],
        course_details: List[Dict[str, Any]],
        stats: Optional[Dict[str, Any]] = None
    ) -> bytes:
        """
        Creates a ZIP archive containing all 4 formats:
          - timetable.xlsx
          - schedule.csv
          - timetable.pdf
          - timetable.png
        """
        tt_id = timetable.get("timetable_id", "timetable")
        zip_buf = io.BytesIO()

        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            excel_bytes = cls.export_to_excel(timetable, course_details, stats)
            zf.writestr(f"{tt_id}.xlsx", excel_bytes)

            csv_str = cls.export_to_csv(timetable, course_details)
            zf.writestr(f"{tt_id}.csv", csv_str.encode("utf-8-sig"))

            pdf_bytes = cls.export_to_pdf(timetable, course_details, stats)
            zf.writestr(f"{tt_id}.pdf", pdf_bytes)

            png_bytes = cls.export_to_png(timetable, course_details)
            zf.writestr(f"{tt_id}.png", png_bytes)

        zip_buf.seek(0)
        return zip_buf.getvalue()

    @classmethod
    def export_favourites_bundle(
        cls,
        favourites_list: List[Dict[str, Any]],
        format_type: str = "zip"
    ) -> bytes:
        """
        Packages multiple favourite timetables into a single ZIP archive.
        """
        zip_buf = io.BytesIO()
        with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for idx, fav in enumerate(favourites_list, start=1):
                name = fav.get("name") or f"Favourite_{idx}"
                safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '_', '-')).strip()
                if not safe_name:
                    safe_name = f"Favourite_{idx}"

                tt = fav.get("timetable")
                if not tt:
                    raw_payload = fav.get("payload") or {}
                    tt = raw_payload.get("timetable", raw_payload)

                if not tt or not isinstance(tt, dict) or "per_day_timeline" not in tt:
                    continue

                courses = fav.get("courses") or tt.get("courses_data", [])

                excel_bytes = cls.export_to_excel(tt, courses)
                zf.writestr(f"{safe_name}/{safe_name}.xlsx", excel_bytes)

                pdf_bytes = cls.export_to_pdf(tt, courses)
                zf.writestr(f"{safe_name}/{safe_name}.pdf", pdf_bytes)

                csv_str = cls.export_to_csv(tt, courses)
                zf.writestr(f"{safe_name}/{safe_name}.csv", csv_str.encode("utf-8-sig"))

                png_bytes = cls.export_to_png(tt, courses)
                zf.writestr(f"{safe_name}/{safe_name}.png", png_bytes)

        zip_buf.seek(0)
        return zip_buf.getvalue()
