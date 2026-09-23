import argparse
import json
import re
import hashlib
from collections import OrderedDict
from pathlib import Path

import openpyxl


TYPE_MAP = {
    "짐보관 가능 여부 및 시간": ("luggage", "checkin", "luggage", False),
    "우편번호, 위치, 주소": ("postal-address", "transport", None, False),
    "숙소 찾기·위치": ("property-location", "transport", None, False),
    "전화번호·연락처": ("contact", "home", "contact", False),
    "얼리 체크인": ("early-checkin", "checkin", "checkin", False),
    "체크인·체크아웃 시간": ("checkin-checkout-time", "checkin", "checkin", False),
    "체크인 방법": ("checkin-method", "checkin", "checkin", False),
    "늦은 체크인": ("late-checkin", "checkin", "checkin", False),
    "공용 주방 위치": ("shared-kitchen", "appliances", "appliances", False),
    "예약 확인 메일": ("booking-confirmation", "checkin", "contact", False),
    "체크인과 짐보관": ("checkin-luggage", "checkin", "luggage", False),
    "공항 셔틀": ("airport-shuttle", "transport", None, True),
    "키 재발급·오반납,분실": ("key-card-recovery", "checkin", "checkin", False),
    "키 없이 체크아웃": ("checkout-without-key", "checkin", "checkout", False),
    "체크아웃 시간 준수": ("late-checkout", "checkin", "checkout", False),
    "분실물": ("lost-property", "rules", "rules", False),
    "여성전용 정책": ("women-only", "gallery", "rooms", False),
    "객실 요청·남성 숙박": ("women-only", "gallery", "rooms", False),
    "배송물 수령": ("parcel-receipt", "rules", "rules", False),
    "체크아웃 방법": ("checkout-method", "checkin", "checkout", False),
    "객실비품": ("room-amenities", "appliances", "appliances", False),
    "수건·건조기": ("towels-dryer", "appliances", "appliances", False),
    "짐보관 출입번호": ("luggage-access", "checkin", "luggage", False),
    "공용 욕실": ("shared-bathroom", "gallery", "rooms", False),
    "비품": ("appliances", "appliances", "appliances", False),
    "공용 냉장고": ("refrigerator", "appliances", "appliances", False),
    "세면용품": ("toiletries", "appliances", "appliances", False),
    "객실 식사": ("in-room-dining", "rules", "rules", False),
    "Wi-Fi": ("wifi", "wifi", "wifi", False),
    "짐보관과 택배": ("luggage-parcel", "checkin", "luggage", False),
    "공항버스": ("airport-bus", "transport", None, True),
    "객실 청소": ("housekeeping", "rules", "rules", False),
    "수건 지급량": ("towels", "appliances", "appliances", False),
    "체크인 안내 발송·얼리 체크인": ("early-checkin", "checkin", "checkin", False),
    "연장, 연박요청": ("stay-extension", "checkin", "contact", False),
    "숙박 연장": ("stay-extension", "checkin", "contact", False),
}


def sanitize_question(value):
    text = str(value or "").strip()
    text = re.sub(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[이메일]", text)
    text = re.sub(r"\b(?:\+?\d[\d -]{7,}\d)\b", "[전화번호]", text)
    text = re.sub(r"(?<![A-Za-z])[A-Z][A-Z'-]{1,}(?:\s+[A-Z][A-Z'-]{1,})+(?![A-Za-z])", "[예약자 이름]", text)
    text = re.sub(r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b", "[날짜]", text)
    return re.sub(r"\s+", " ", text).strip()


def approved_answer(value):
    # The existing access-release policy still applies to credentials embedded
    # in staff replies. Preserve all other wording verbatim.
    text = str(value or "").strip()
    text = re.sub(r"숙소 출입구 왼쪽 기기에\s*8282\s*→\s*ENT\s*입력해주세요", "출입정보는 예약 채널 메시지에서 확인해주세요.", text)
    text = re.sub(r"(?:입구 도어락 PW|(?:입구\s*)?출입(?:구)?\s*비밀번호)\s*:\s*8282\s*→\s*ENT", "출입정보는 예약 채널 메시지에서 확인해주세요.", text)
    text = re.sub(r"Password:\s*another1234", "비밀번호는 홈페이지 Wi-Fi 안내 또는 예약 채널 메시지에서 확인해주세요.", text)
    if "8282" in text or "another1234" in text:
        raise ValueError("An approved answer still contains a protected credential")
    return text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("workbook")
    parser.add_argument("output")
    args = parser.parse_args()

    workbook = openpyxl.load_workbook(args.workbook, read_only=True, data_only=True)
    sheet = workbook["어나더 질문 & 답변 AI학습"]
    grouped = OrderedDict()
    row_count = 0
    secret_answer_rows = 0
    approved = OrderedDict()

    for source_row, row in enumerate(sheet.iter_rows(min_row=2, max_col=5, values_only=True), 2):
        question_id, question, question_type, quick_answer, answer = row
        if not question_id:
            continue
        row_count += 1
        if question_type not in TYPE_MAP:
            raise ValueError(f"Unmapped training type: {question_type}")
        intent_id, route, topic, allow_public_search = TYPE_MAP[question_type]
        if answer and ("8282" in str(answer) or "another1234" in str(answer)):
            secret_answer_rows += 1
        intent = grouped.setdefault(intent_id, {
            "id": intent_id,
            "types": [],
            "route": route,
            "topic": topic,
            "allowPublicSearch": allow_public_search,
            "quickAnswerIds": [],
            "examples": [],
        })
        if question_type not in intent["types"]:
            intent["types"].append(question_type)
        quick_value = str(quick_answer or "").removesuffix(".0")
        if quick_value and quick_value not in intent["quickAnswerIds"]:
            intent["quickAnswerIds"].append(quick_value)
        safe_question = sanitize_question(question)
        if safe_question and safe_question not in intent["examples"]:
            intent["examples"].append(safe_question)
        safe_answer = approved_answer(answer)
        answer_key = (question_type, safe_answer)
        record = approved.setdefault(answer_key, {
            "id": str(question_id), "intent": intent_id, "type": question_type,
            "route": route, "answer": safe_answer, "examples": [], "sourceRows": [],
            "questionIds": [], "credentialsProtected": safe_answer != str(answer or "").strip(),
            "sourceAnswerSha256": hashlib.sha256(safe_answer.encode("utf-8")).hexdigest() if safe_answer == str(answer or "").strip() else None,
        })
        record["sourceRows"].append(source_row)
        record["questionIds"].append(str(question_id))
        if safe_question not in record["examples"]:
            record["examples"].append(safe_question)

    payload = {
        "version": "2026-09-23.2",
        "source": {
            "workbook": Path(args.workbook).name,
            "rawSheet": "어나더 질문 RAW",
            "trainingSheet": "어나더 질문 & 답변 AI학습",
            "trainingRange": "A1:E122",
        },
        "recordCount": row_count,
        "intentCount": len(grouped),
        "secretAnswerRowsExcluded": secret_answer_rows,
        "notes": [
            "Approved operator replies take priority for matching questions; retain their wording.",
            "Customer names, contact details, and dates are redacted.",
            "Raw credential-bearing replies are excluded; only credential clauses are replaced in approvedAnswers. All other wording is preserved verbatim.",
        ],
        "intents": list(grouped.values()),
        "approvedAnswers": list(approved.values()),
    }
    Path(args.output).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
