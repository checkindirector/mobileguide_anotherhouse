import argparse
import json
import runpy
from pathlib import Path

import openpyxl


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook")
    parser.add_argument("training_json")
    args = parser.parse_args()

    helpers = runpy.run_path(str(Path(__file__).with_name("import-concierge-training.py")))
    approved_answer = helpers["approved_answer"]
    sanitize_question = helpers["sanitize_question"]

    training = json.loads(Path(args.training_json).read_text(encoding="utf-8"))
    records = training["approvedAnswers"]
    by_row = {}
    for record in records:
        for row_number in record["sourceRows"]:
            if row_number in by_row:
                raise AssertionError(f"Duplicate source row mapping: {row_number}")
            by_row[row_number] = record

    workbook = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
    sheet = workbook[training["source"]["trainingSheet"]]
    checked = 0
    mismatches = []
    workbook_rows = set()
    for row_number, row in enumerate(sheet.iter_rows(min_row=2, max_col=5, values_only=True), 2):
        question_id, question, question_type, _quick_answer, answer = row
        if not question_id:
            continue
        checked += 1
        workbook_rows.add(row_number)
        record = by_row.get(row_number)
        if not record:
            mismatches.append({"row": row_number, "reason": "missing source-row mapping"})
            continue
        expected_answer = approved_answer(answer)
        expected_question = sanitize_question(question)
        if record["answer"] != expected_answer:
            mismatches.append({"row": row_number, "reason": "answer differs"})
        if record["type"] != question_type:
            mismatches.append({"row": row_number, "reason": "type differs"})
        if str(question_id) not in record["questionIds"]:
            mismatches.append({"row": row_number, "reason": "question id missing"})
        if expected_question not in record["examples"]:
            mismatches.append({"row": row_number, "reason": "question example missing"})

    unexpected_rows = sorted(set(by_row) - workbook_rows)
    if unexpected_rows:
        mismatches.append({"reason": "unexpected source rows", "count": len(unexpected_rows)})
    if checked != training["recordCount"]:
        mismatches.append({"reason": "record count differs", "workbook": checked, "json": training["recordCount"]})

    result = {
        "workbook": Path(args.workbook).name,
        "sheet": sheet.title,
        "rowsChecked": checked,
        "approvedReplies": len(records),
        "mismatchCount": len(mismatches),
    }
    print(json.dumps(result, ensure_ascii=False))
    if mismatches:
        raise AssertionError(json.dumps(mismatches[:10], ensure_ascii=False))


if __name__ == "__main__":
    main()
