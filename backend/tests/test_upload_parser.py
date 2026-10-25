import io
from datetime import date, datetime
from decimal import Decimal

import pytest
from openpyxl import Workbook

from app.services.upload_parser import UploadFileError, read_rows, validate_rows

HEADER = "office,week_start,visits,students_served,pounds_distributed"


def parse_csv(text: str):
    header, rows = read_rows("upload.csv", text.encode())
    return validate_rows(header, rows)


def xlsx_bytes(rows: list[list]) -> bytes:
    workbook = Workbook()
    for row in rows:
        workbook.active.append(row)
    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def test_valid_csv_is_parsed_with_spreadsheet_row_numbers() -> None:
    rows, errors = parse_csv(
        f"{HEADER}\n"
        "Retriever Essentials,2025-10-13,21,14,120.5\n"
        ",,,,\n"
        "Retriever Essentials,10/20/2025,\"1,204\",900,0\n"
    )
    assert errors == []
    assert [row.row for row in rows] == [2, 4]
    assert rows[0].week_start == date(2025, 10, 13)
    assert rows[0].pounds_distributed == Decimal("120.50")
    assert rows[1].week_start == date(2025, 10, 20)
    assert rows[1].visits == 1204


def test_headers_are_matched_loosely_and_unknown_columns_are_kept_as_extra() -> None:
    rows, errors = parse_csv(
        "Week Start, Visits ,Students Served,Pounds Distributed,Volunteers\n2025-10-13,5,3,10,4\n"
    )
    assert errors == []
    assert rows[0].office is None
    assert rows[0].extra == {"volunteers": "4"}


def test_missing_required_columns_are_reported_on_the_header_row() -> None:
    rows, errors = parse_csv("office,week_start,visits\nRetriever Essentials,2025-10-13,5\n")
    assert rows == []
    assert [(e.row, e.column) for e in errors] == [
        (1, "students_served"),
        (1, "pounds_distributed"),
    ]


@pytest.mark.parametrize(
    ("line", "column", "message"),
    [
        (",2025-13-01,5,3,10", "week_start", "is not a date"),
        (",,5,3,10", "week_start", "Value is required"),
        (",2025-10-13,5.5,3,10", "visits", "must be a whole number"),
        (",2025-10-13,abc,3,10", "visits", "is not a number"),
        (",2025-10-13,5,-1,10", "students_served", "Cannot be negative"),
        (",2025-10-13,5,3,10.125", "pounds_distributed", "two decimal places"),
        (",2025-10-13,5,3,", "pounds_distributed", "Use 0 if no food"),
        (",2025-10-13,5,3,NaN", "pounds_distributed", "is not a number"),
    ],
)
def test_bad_values_produce_row_level_errors(line: str, column: str, message: str) -> None:
    rows, errors = parse_csv(f"{HEADER}\n{line}\n")
    assert rows == []
    assert len(errors) == 1
    assert (errors[0].row, errors[0].column) == (2, column)
    assert message in errors[0].message


def test_every_bad_row_is_reported_not_just_the_first() -> None:
    _, errors = parse_csv(f"{HEADER}\n,bad,-1,3,10\n,2025-10-13,5,3,10\n,2025-10-20,x,3,10\n")
    assert [(e.row, e.column) for e in errors] == [(2, "week_start"), (2, "visits"), (4, "visits")]


def test_duplicate_weeks_in_one_file_are_rejected() -> None:
    _, errors = parse_csv(f"{HEADER}\n,2025-10-13,5,3,10\n,2025-10-13,6,4,11\n")
    assert len(errors) == 1
    assert errors[0].row == 3
    assert "Duplicate of row 2" in errors[0].message


def test_xlsx_values_and_excel_float_noise_are_accepted() -> None:
    content = xlsx_bytes(
        [
            ["week_start", "visits", "students_served", "pounds_distributed"],
            [datetime(2025, 10, 13), 21, 14.0, 120.30000000000001],
        ]
    )
    header, raw = read_rows("upload.xlsx", content)
    rows, errors = validate_rows(header, raw)
    assert errors == []
    assert rows[0].week_start == date(2025, 10, 13)
    assert rows[0].students_served == 14
    assert rows[0].pounds_distributed == Decimal("120.30")


def test_windows_encoded_csv_is_read() -> None:
    content = f"{HEADER},notes\n,2025-10-13,5,3,10,café\n".encode("cp1252")
    header, raw = read_rows("upload.csv", content)
    rows, errors = validate_rows(header, raw)
    assert errors == []
    assert rows[0].extra == {"notes": "café"}


@pytest.mark.parametrize(
    ("filename", "content", "message"),
    [
        ("upload.txt", b"x", "Upload a .csv or .xlsx file"),
        ("upload.csv", b"", "The file is empty"),
        ("upload.csv", f"{HEADER}\n\n".encode(), "no data rows"),
        ("upload.xlsx", b"not a workbook", "could not be read"),
    ],
)
def test_unusable_files_are_rejected(filename: str, content: bytes, message: str) -> None:
    with pytest.raises(UploadFileError, match=message):
        read_rows(filename, content)
