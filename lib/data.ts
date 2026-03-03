import type { Customer, FPProfile, LMSMessage, TodoItem } from "./types";

export const FP_PROFILE: FPProfile = {
  name: "김한화",
  employeeId: "3219739",
  branch: "잠실지점",
  level: "Gold FP",
  yearsOfExperience: 8,
  phone: "010-8024-3219",
  email: "hanhwa.kim@hanwha.com",
  profileInitials: "김",
};

export const CUSTOMERS: Customer[] = [
  {
    id: "c001",
    name: "고한준",
    gender: "남",
    age: 59,
    birthDate: "1968-02-21",
    event: "본인 생일",
    eventDetail: "오늘 생일",
    eventDate: "2026-02-25",
    urgency: "normal",
    longTermCount: 0,
    carCount: 1,
    lastContact: "2022-03-08",
    products: [
      {
        id: "p001",
        name: "한화 다이렉트 자동차보험",
        contractNo: "CA20220358775000",
        type: "자동차",
        premium: 62000,
        renewalDate: "2026-09-15",
      },
    ],
    contactHistory: [
      { date: "2022-03-08", type: "LMS", content: "자동차보험 갱신 안내" },
      { date: "2022-01-17", type: "DM", content: "신규계약 감사 안내" },
    ],
    memo: "장기 자동차 고객, 이번 생일을 계기로 장기보험 추가 제안 검토",
  },
  {
    id: "c002",
    name: "강충심",
    gender: "여",
    age: 74,
    birthDate: "1953-03-03",
    event: "자동차 만기 도래",
    eventDetail: "자동차보험 만기 당일 (CA20251858775000)",
    eventDate: "2026-02-19",
    urgency: "urgent",
    longTermCount: 0,
    carCount: 1,
    lastContact: "2022-05-26",
    products: [
      {
        id: "p002",
        name: "한화 자동차보험 (실속형)",
        contractNo: "CA20251858775000",
        type: "자동차",
        premium: 78000,
        expiryDate: "2026-02-19",
        renewalDate: "2026-02-19",
      },
    ],
    contactHistory: [
      { date: "2022-05-26", type: "LMS", content: "자동차보험 만기 안내" },
      { date: "2022-01-17", type: "DM", content: "연간 보장분석 안내" },
    ],
    memo: "고령 고객. 만기 당일이므로 즉시 연락 필요. 갱신 또는 재설계 제안",
  },
  {
    id: "c003",
    name: "박종석",
    gender: "남",
    age: 63,
    birthDate: "1964-08-23",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20147718920000, 갱신일 2026-03-17)",
    eventDate: "2026-03-17",
    urgency: "high",
    longTermCount: 7,
    carCount: 0,
    lastContact: "2024-03-12",
    products: [
      {
        id: "p003",
        name: "한화 통합건강보험 (종합형)",
        contractNo: "LA20147718920000",
        type: "장기",
        premium: 145000,
        renewalDate: "2026-03-17",
      },
      {
        id: "p003b",
        name: "한화 암보험 플러스",
        contractNo: "LA20147718920001",
        type: "장기",
        premium: 65000,
      },
      {
        id: "p003c",
        name: "한화 실손의료보험",
        contractNo: "LA20147718920002",
        type: "장기",
        premium: 48000,
      },
    ],
    contactHistory: [
      { date: "2024-03-12", type: "LMS", content: "장기보험 갱신 안내" },
      { date: "2014-02-07", type: "DM", content: "신규계약 감사 안내" },
    ],
    memo: "7건 장기보험 보유 VIP 고객. 갱신 시 보장 재설계 및 중복 정리 검토",
  },
  {
    id: "c004",
    name: "이가영",
    gender: "여",
    age: 47,
    birthDate: "1980-05-12",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 2건 보강 필요",
    urgency: "normal",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2022-10-21",
    products: [
      {
        id: "p004",
        name: "한화 여성건강보험",
        contractNo: "LA20222634630000",
        type: "장기",
        premium: 72000,
      },
      {
        id: "p004b",
        name: "한화 실손의료보험 (2세대)",
        contractNo: "LA20222634630001",
        type: "장기",
        premium: 42000,
      },
    ],
    contactHistory: [
      {
        date: "2022-10-21",
        type: "LMS",
        content: "여성건강 보장분석 안내",
      },
    ],
    memo: "여성 특화 담보 추가 제안. 자궁암, 유방암 등 여성 주요 질환 집중케어 부족",
  },
  {
    id: "c005",
    name: "이용철",
    gender: "남",
    age: 52,
    birthDate: "1975-10-23",
    event: "장기 자동이체 미인출",
    eventDetail:
      "보험료 자동이체 미인출 (LA20149010060000, 미인출일 2026-02-05)",
    eventDate: "2026-02-05",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2024-06-12",
    products: [
      {
        id: "p005",
        name: "한화 종합건강보험",
        contractNo: "LA20149010060000",
        type: "장기",
        premium: 93000,
        renewalDate: "2026-04-23",
      },
    ],
    contactHistory: [
      {
        date: "2024-06-12",
        type: "LMS",
        content: "보험료 납입 안내",
      },
    ],
    memo: "자동이체 계좌 잔액 부족 가능성. 납부 방법 변경 또는 계좌 변경 유도",
  },
  {
    id: "c006",
    name: "조혜숙",
    gender: "여",
    age: 70,
    birthDate: "1957-10-06",
    event: "장기 체결 감사",
    eventDetail:
      "장기보험 체결 1주년 감사 안내 (LA20251237577000, 체결일 2025-02-06)",
    eventDate: "2025-02-06",
    urgency: "low",
    longTermCount: 7,
    carCount: 0,
    lastContact: "2024-03-12",
    products: [
      {
        id: "p006",
        name: "한화 시니어플러스 통합보험",
        contractNo: "LA20251237577000",
        type: "장기",
        premium: 168000,
      },
      {
        id: "p006b",
        name: "한화 간병보험 RICH",
        contractNo: "LA20251237577001",
        type: "장기",
        premium: 82000,
      },
      {
        id: "p006c",
        name: "한화 치매안심보험",
        contractNo: "LA20251237577002",
        type: "장기",
        premium: 55000,
      },
    ],
    contactHistory: [
      {
        date: "2024-03-12",
        type: "LMS",
        content: "계약체결 1주년 감사 안내",
      },
    ],
    memo: "고령 VIP 고객. 7건 보유. 1주년 감사 연락으로 관계 강화",
  },
  {
    id: "c007",
    name: "손유희",
    gender: "여",
    age: 60,
    birthDate: "1967-11-08",
    event: "장기 연체(미납)",
    eventDetail:
      "보험료 미납 연체 (LA20135260370000, 납부기한 2026-02-25)",
    eventDate: "2026-02-25",
    urgency: "urgent",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2021-05-11",
    products: [
      {
        id: "p007",
        name: "한화 건강보험 (기본형)",
        contractNo: "LA20135260370000",
        type: "장기",
        premium: 58000,
        renewalDate: "2026-03-08",
      },
    ],
    contactHistory: [
      {
        date: "2021-05-11",
        type: "LMS",
        content: "보험료 납입 독려",
      },
      {
        date: "2015-02-12",
        type: "DM",
        content: "신규계약 감사",
      },
    ],
    memo: "장기 미접촉 고객. 납부기한 임박. 실효 전 긴급 연락 필요. 분납 또는 유예 안내 검토",
  },
  {
    id: "c008",
    name: "김이순",
    gender: "여",
    age: 64,
    birthDate: "1963-06-03",
    event: "장기 만기 도래",
    eventDetail:
      "장기보험 만기 도래 (LA20164857772000, 만기일 2026-03-08) + 갱신 예정",
    eventDate: "2026-03-08",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2022-12-29",
    products: [
      {
        id: "p008",
        name: "한화 종합건강보험 (일반형)",
        contractNo: "LA20164857772000",
        type: "장기",
        premium: 76000,
        expiryDate: "2026-03-08",
        renewalDate: "2026-03-08",
      },
    ],
    contactHistory: [
      {
        date: "2022-12-29",
        type: "LMS",
        content: "만기 도래 사전 안내",
      },
      {
        date: "2021-05-11",
        type: "LMS",
        content: "보장분석 안내",
      },
      {
        date: "2015-08-11",
        type: "DM",
        content: "신규 계약 감사",
      },
    ],
    memo: "보험 해약 이력 있음. 만기 후 재가입 또는 리모델링 적극 제안 필요",
  },
  {
    id: "c009",
    name: "한선희",
    gender: "여",
    age: 63,
    birthDate: "1964-09-12",
    event: "장기 연체(미납)",
    eventDetail:
      "보험료 미납 연체 (LA20135019382000, 납부기한 2026-02-21)",
    eventDate: "2026-02-21",
    urgency: "urgent",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2021-05-11",
    products: [
      {
        id: "p009",
        name: "한화 건강보험 (표준형)",
        contractNo: "LA20135019382000",
        type: "장기",
        premium: 62000,
        renewalDate: "2026-03-21",
      },
    ],
    contactHistory: [
      {
        date: "2021-05-11",
        type: "LMS",
        content: "보험료 납입 독려",
      },
    ],
    memo: "장기 미접촉 고객. 납부기한 임박. 실효 전 긴급 연락 필요. 분납/유예 안내 검토",
  },
  {
    id: "c010",
    name: "정희정",
    gender: "여",
    age: 49,
    birthDate: "1978-08-06",
    event: "장기 자동이체 미인출",
    eventDetail:
      "보험료 자동이체 미인출 (LA20147821851000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 5,
    carCount: 0,
    lastContact: "2015-08-11",
    products: [
      {
        id: "p010",
        name: "한화 통합건강보험",
        contractNo: "LA20147821851000",
        type: "장기",
        premium: 88000,
        renewalDate: "2026-08-06",
      },
    ],
    contactHistory: [
      {
        date: "2015-08-11",
        type: "DM",
        content: "보장분석 안내",
      },
    ],
    memo: "장기 미접촉 고객. 5건 장기보험 보유. 자동이체 계좌 확인 필요",
  },
  {
    id: "c011",
    name: "김은서",
    gender: "여",
    age: 55,
    birthDate: "1972-12-11",
    event: "가입설계동의 만료",
    eventDetail: "가입설계 동의 만료 예정 (만료일 2026-02-26)",
    eventDate: "2026-02-26",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2024-01-16",
    products: [
      {
        id: "p011a",
        name: "한화 종합보험 (플러스형)",
        contractNo: "LA20222345001000",
        type: "장기",
        premium: 74000,
      },
      {
        id: "p011b",
        name: "한화 실손의료보험",
        contractNo: "LA20222345001001",
        type: "장기",
        premium: 38000,
      },
    ],
    contactHistory: [
      {
        date: "2024-01-16",
        type: "DM",
        content: "가입설계 안내",
      },
    ],
    memo: "가입설계 동의 기한 임박. 동의 연장 또는 재설계 안내 필요",
  },
  {
    id: "c012",
    name: "김한준",
    gender: "남",
    age: 47,
    birthDate: "1980-02-20",
    event: "본인 생일",
    eventDetail: "오늘 생일 (생년월일: 1980-02-25)",
    eventDate: "2026-02-25",
    urgency: "normal",
    longTermCount: 1,
    carCount: 1,
    lastContact: "",
    products: [
      {
        id: "p012a",
        name: "한화 종합건강보험",
        contractNo: "LA20246789001000",
        type: "장기",
        premium: 65000,
      },
      {
        id: "p012b",
        name: "한화 다이렉트 자동차보험",
        contractNo: "CA20246789001001",
        type: "자동차",
        premium: 72000,
        renewalDate: "2026-10-15",
      },
    ],
    contactHistory: [],
    memo: "생일 고객. 장기+자동차 보유. 미접촉이므로 생일 축하 메시지로 관계 구축",
  },
  {
    id: "c013",
    name: "박천일",
    gender: "남",
    age: 54,
    birthDate: "1973-09-18",
    event: "미터치고객",
    eventDetail: "장기 미접촉 고객 (마지막 터치: 2022-10-31)",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2024-06-12",
    products: [
      { id: "p013", name: "한화 장기보험", contractNo: "LA20222634630000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-06-12", type: "LMS", content: "보장분석 안내" },
    ],
    memo: "장기 미접촉. 관계 재구축 필요",
  },
  {
    id: "c014",
    name: "김은정",
    gender: "여",
    age: 58,
    birthDate: "1969-02-06",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2024-03-29",
    products: [],
    contactHistory: [
      { date: "2024-03-29", type: "LMS", content: "보장분석 안내" },
      { date: "2018-05-17", type: "DM", content: "보장분석 안내" },
    ],
    memo: "여성질환 집중케어 담보 보강 제안",
  },
  {
    id: "c015",
    name: "서종석",
    gender: "남",
    age: 65,
    birthDate: "1962-03-11",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20247061357000, 갱신일 2026-03-05)",
    eventDate: "2026-03-05",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2024-06-12",
    products: [
      { id: "p015", name: "한화 장기보험", contractNo: "LA20247061357000", type: "장기", renewalDate: "2026-03-05" },
    ],
    contactHistory: [
      { date: "2024-06-12", type: "LMS", content: "장기보험 갱신 안내" },
    ],
    memo: "고령 고객. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c016",
    name: "전상열",
    gender: "남",
    age: 64,
    birthDate: "1963-12-07",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20118225978000, 갱신일 2026-03-02)",
    eventDate: "2026-03-02",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2015-08-11",
    products: [
      { id: "p016", name: "한화 장기보험", contractNo: "LA20118225978000", type: "장기", renewalDate: "2026-03-02" },
    ],
    contactHistory: [
      { date: "2015-08-11", type: "DM", content: "장기보험 갱신 안내" },
    ],
    memo: "장기보험 2건 보유. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c017",
    name: "차두호",
    gender: "남",
    age: 58,
    birthDate: "1969-04-06",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20167614966000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2022-12-29",
    products: [
      { id: "p017", name: "한화 장기보험", contractNo: "LA20167614966000", type: "장기" },
    ],
    contactHistory: [
      { date: "2022-12-29", type: "LMS", content: "보험료 납입 안내" },
    ],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c018",
    name: "박상윤",
    gender: "여",
    age: 61,
    birthDate: "1966-08-23",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (72W08B042440, 갱신일 2026-03-16)",
    eventDate: "2026-03-16",
    urgency: "high",
    longTermCount: 18,
    carCount: 0,
    lastContact: "2017-10-18",
    products: [
      { id: "p018", name: "한화 장기보험", contractNo: "72W08B042440", type: "장기", renewalDate: "2026-03-16" },
    ],
    contactHistory: [
      { date: "2017-10-18", type: "DM", content: "장기보험 갱신 안내" },
      { date: "2017-10-18", type: "LMS", content: "장기보험 갱신 안내" },
    ],
    memo: "18건 장기보험 보유 VIP. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c019",
    name: "신세희",
    gender: "여",
    age: 36,
    birthDate: "1991-07-23",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2024-05-14",
    products: [],
    contactHistory: [
      { date: "2024-05-14", type: "LMS", content: "보장분석 안내" },
      { date: "2024-01-16", type: "DM", content: "보장분석 안내" },
    ],
    memo: "토탈맘케어 담보 보강 제안",
  },
  {
    id: "c020",
    name: "손인식",
    gender: "남",
    age: 57,
    birthDate: "1970-05-20",
    event: "미터치고객",
    eventDetail: "장기 미접촉 고객 (마지막 터치: 2023-03-13)",
    urgency: "normal",
    longTermCount: 5,
    carCount: 0,
    lastContact: "2024-02-16",
    products: [
      { id: "p020", name: "한화 장기보험", contractNo: "LA20233751886000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-02-16", type: "LMS", content: "보장분석 안내" },
      { date: "2015-01-09", type: "DM", content: "보장분석 안내" },
    ],
    memo: "5건 장기보험 보유 VIP. 장기 미접촉. 관계 재구축 필요",
  },
  {
    id: "c021",
    name: "정현영",
    gender: "여",
    age: 59,
    birthDate: "1968-02-15",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 6건 보강 필요",
    urgency: "normal",
    longTermCount: 6,
    carCount: 0,
    lastContact: "2024-08-19",
    products: [],
    contactHistory: [
      { date: "2024-08-19", type: "LMS", content: "보장분석 안내" },
      { date: "2024-01-16", type: "DM", content: "보장분석 안내" },
    ],
    memo: "6건 장기보험 보유 VIP. 토탈맘케어 담보 보강 제안",
  },
  {
    id: "c022",
    name: "이세미",
    gender: "여",
    age: 30,
    birthDate: "1997-01-21",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20147728048000, 갱신일 2026-03-18)",
    eventDate: "2026-03-18",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2024-04-11",
    products: [
      { id: "p022", name: "한화 장기보험", contractNo: "LA20147728048000", type: "장기", renewalDate: "2026-03-18" },
    ],
    contactHistory: [
      { date: "2024-04-11", type: "LMS", content: "장기보험 갱신 안내" },
    ],
    memo: "장기보험 2건 보유. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c023",
    name: "김보경",
    gender: "여",
    age: 56,
    birthDate: "1971-04-15",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2024-06-12",
    products: [],
    contactHistory: [
      { date: "2024-06-12", type: "LMS", content: "보장분석 안내" },
      { date: "2024-01-16", type: "DM", content: "보장분석 안내" },
    ],
    memo: "여성질환 집중케어 담보 보강 제안",
  },
  {
    id: "c024",
    name: "한지영",
    gender: "여",
    age: 37,
    birthDate: "1990-10-24",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20151636905000, 갱신일 2026-03-06)",
    eventDate: "2026-03-06",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2017-05-12",
    products: [
      { id: "p024", name: "한화 장기보험", contractNo: "LA20151636905000", type: "장기", renewalDate: "2026-03-06" },
    ],
    contactHistory: [
      { date: "2017-05-12", type: "DM", content: "장기보험 갱신 안내" },
    ],
    memo: "갱신 시 보장 재설계 검토",
  },
  {
    id: "c025",
    name: "김춘숙",
    gender: "여",
    age: 62,
    birthDate: "1965-04-12",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 7건 보강 필요",
    urgency: "normal",
    longTermCount: 7,
    carCount: 0,
    lastContact: "2024-08-19",
    products: [],
    contactHistory: [
      { date: "2024-08-19", type: "LMS", content: "보장분석 안내" },
      { date: "2015-01-09", type: "DM", content: "보장분석 안내" },
    ],
    memo: "7건 장기보험 보유 VIP. 토탈맘케어 담보 보강 제안",
  },
  {
    id: "c026",
    name: "남기원",
    gender: "남",
    age: 69,
    birthDate: "1958-07-09",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20247062081000, 갱신일 2026-03-05)",
    eventDate: "2026-03-05",
    urgency: "high",
    longTermCount: 3,
    carCount: 0,
    lastContact: "2024-05-14",
    products: [
      { id: "p026", name: "한화 장기보험", contractNo: "LA20247062081000", type: "장기", renewalDate: "2026-03-05" },
    ],
    contactHistory: [
      { date: "2024-05-14", type: "LMS", content: "장기보험 갱신 안내" },
    ],
    memo: "고령 고객. 장기보험 3건 보유. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c027",
    name: "최영태",
    gender: "남",
    age: 71,
    birthDate: "1956-09-21",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (601970001588, 미인출일 2026-02-10)",
    eventDate: "2026-02-10",
    urgency: "high",
    longTermCount: 4,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p027", name: "한화 장기보험", contractNo: "601970001588", type: "장기" },
    ],
    contactHistory: [],
    memo: "고령 고객. 장기보험 4건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c028",
    name: "소귀섭",
    gender: "남",
    age: 66,
    birthDate: "1961-11-17",
    event: "장기 연체(미납)",
    eventDetail: "보험료 미납 연체 (72S08B004017, 납부기한 2026-02-25)",
    eventDate: "2026-02-25",
    urgency: "urgent",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p028", name: "한화 장기보험", contractNo: "72S08B004017", type: "장기" },
    ],
    contactHistory: [],
    memo: "고령 고객. 납부기한 임박. 실효 전 긴급 연락 필요",
  },
  {
    id: "c029",
    name: "이경숙",
    gender: "여",
    age: 62,
    birthDate: "1965-05-24",
    event: "가입설계동의 만료",
    eventDetail: "가입설계 동의 만료 예정 (만료일 2026-03-05)",
    eventDate: "2026-03-05",
    urgency: "high",
    longTermCount: 6,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "6건 장기보험 보유 VIP. 동의 기한 임박. 연장 또는 재설계 안내 필요",
  },
  {
    id: "c030",
    name: "차윤진",
    gender: "여",
    age: 24,
    birthDate: "2003-01-29",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20147783880000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p030", name: "한화 장기보험", contractNo: "LA20147783880000", type: "장기" },
    ],
    contactHistory: [],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c031",
    name: "황나리",
    gender: "여",
    age: 39,
    birthDate: "1988-02-06",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "토탈맘케어 담보 보강 제안",
  },
  {
    id: "c032",
    name: "안지수",
    gender: "남",
    age: 38,
    birthDate: "1989-04-28",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20151248279000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p032", name: "한화 장기보험", contractNo: "LA20151248279000", type: "장기" },
    ],
    contactHistory: [],
    memo: "자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c033",
    name: "전현영",
    gender: "여",
    age: 55,
    birthDate: "1972-08-31",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20204697857000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2024-08-19",
    products: [
      { id: "p033", name: "한화 장기보험", contractNo: "LA20204697857000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-08-19", type: "LMS", content: "보험료 납입 안내" },
    ],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c034",
    name: "서유정",
    gender: "여",
    age: 59,
    birthDate: "1968-05-01",
    event: "미터치고객",
    eventDetail: "장기 미접촉 고객 (마지막 터치: 2024-01-30)",
    urgency: "normal",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2024-08-19",
    products: [
      { id: "p034", name: "한화 장기보험", contractNo: "LA20246754271000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-08-19", type: "LMS", content: "보장분석 안내" },
      { date: "2015-08-11", type: "DM", content: "보장분석 안내" },
    ],
    memo: "장기보험 2건 보유. 장기 미접촉. 관계 재구축 필요",
  },
  {
    id: "c035",
    name: "김순자",
    gender: "여",
    age: 75,
    birthDate: "1952-05-17",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (7G307B025117, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 6,
    carCount: 0,
    lastContact: "2017-10-24",
    products: [],
    contactHistory: [
      { date: "2017-10-24", type: "LMS", content: "보험료 납입 안내" },
    ],
    memo: "고령 고객. 6건 장기보험 보유 VIP. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c036",
    name: "유숙희",
    gender: "여",
    age: 58,
    birthDate: "1969-04-05",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20147484351000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 16,
    carCount: 0,
    lastContact: "2024-03-12",
    products: [
      { id: "p036", name: "한화 장기보험", contractNo: "LA20147484351000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-03-12", type: "LMS", content: "보험료 납입 안내" },
      { date: "2015-08-11", type: "DM", content: "보험료 납입 안내" },
    ],
    memo: "16건 장기보험 보유 VIP. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c037",
    name: "권금영",
    gender: "여",
    age: 59,
    birthDate: "1968-02-21",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (7Q2040003129, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 3,
    carCount: 0,
    lastContact: "2022-10-21",
    products: [],
    contactHistory: [
      { date: "2022-10-21", type: "LMS", content: "보험료 납입 안내" },
    ],
    memo: "장기보험 3건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c038",
    name: "윤소영",
    gender: "여",
    age: 57,
    birthDate: "1970-02-17",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20152387604000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2018-05-17",
    products: [
      { id: "p038", name: "한화 장기보험", contractNo: "LA20152387604000", type: "장기" },
    ],
    contactHistory: [
      { date: "2018-05-17", type: "DM", content: "보험료 납입 안내" },
    ],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c039",
    name: "조명자",
    gender: "여",
    age: 52,
    birthDate: "1975-03-02",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 1,
    lastContact: "2015-05-08",
    products: [],
    contactHistory: [
      { date: "2015-05-08", type: "DM", content: "보장분석 안내" },
    ],
    memo: "자동차보험 1건. 여성질환 집중케어 담보 보강 제안",
  },
  {
    id: "c040",
    name: "김옥란",
    gender: "여",
    age: 58,
    birthDate: "1969-05-14",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2024-07-09",
    products: [],
    contactHistory: [
      { date: "2024-07-09", type: "LMS", content: "보장분석 안내" },
    ],
    memo: "여성질환 집중케어 담보 보강 제안",
  },
  {
    id: "c041",
    name: "김지영",
    gender: "여",
    age: 52,
    birthDate: "1975-09-01",
    event: "가입설계동의 만료",
    eventDetail: "가입설계 동의 만료 예정 (만료일 2026-02-27)",
    eventDate: "2026-02-27",
    urgency: "high",
    longTermCount: 0,
    carCount: 0,
    lastContact: "2021-07-09",
    products: [],
    contactHistory: [
      { date: "2021-07-09", type: "LMS", content: "가입설계 안내" },
    ],
    memo: "동의 기한 임박. 연장 또는 재설계 안내 필요",
  },
  {
    id: "c042",
    name: "허정호",
    gender: "남",
    age: 44,
    birthDate: "1983-03-07",
    event: "주요담보 저가입고객 안내",
    eventDetail: "RICH간병보험 담보 4건 보강 필요",
    urgency: "normal",
    longTermCount: 4,
    carCount: 1,
    lastContact: "2024-08-19",
    products: [],
    contactHistory: [
      { date: "2024-08-19", type: "LMS", content: "보장분석 안내" },
    ],
    memo: "장기보험 4건 보유. 자동차보험 1건. RICH간병보험 담보 보강 제안",
  },
  {
    id: "c043",
    name: "김미경",
    gender: "여",
    age: 58,
    birthDate: "1969-05-13",
    event: "자동차 만기 도래",
    eventDetail: "자동차보험 만기 당일 (CA20251800589000)",
    eventDate: "2026-02-20",
    urgency: "urgent",
    longTermCount: 5,
    carCount: 1,
    lastContact: "2022-03-08",
    products: [
      { id: "p043", name: "한화 자동차보험", contractNo: "CA20251800589000", type: "자동차", expiryDate: "2026-02-20", renewalDate: "2026-02-20" },
    ],
    contactHistory: [
      { date: "2022-03-08", type: "LMS", content: "자동차보험 만기 안내" },
    ],
    memo: "5건 장기보험 보유 VIP. 자동차보험 1건. 자동차보험 만기. 갱신 또는 재설계 제안",
  },
  {
    id: "c044",
    name: "김송나",
    gender: "여",
    age: 55,
    birthDate: "1972-01-25",
    event: "장기 체결 감사",
    eventDetail: "장기보험 체결 감사 안내 (LA20251257390000, 체결일 2025-02-07)",
    eventDate: "2025-02-07",
    urgency: "low",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2022-03-08",
    products: [
      { id: "p044", name: "한화 장기보험", contractNo: "LA20251257390000", type: "장기" },
    ],
    contactHistory: [
      { date: "2022-03-08", type: "LMS", content: "계약체결 감사 안내" },
    ],
    memo: "장기보험 2건 보유. 체결 감사 연락으로 관계 강화",
  },
  {
    id: "c045",
    name: "김정현",
    gender: "남",
    age: 71,
    birthDate: "1956-09-13",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20149396185000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 18,
    carCount: 1,
    lastContact: "2022-04-26",
    products: [
      { id: "p045", name: "한화 장기보험", contractNo: "LA20149396185000", type: "장기" },
    ],
    contactHistory: [
      { date: "2022-04-26", type: "LMS", content: "보험료 납입 안내" },
      { date: "2017-10-24", type: "DM", content: "보험료 납입 안내" },
    ],
    memo: "고령 고객. 18건 장기보험 보유 VIP. 자동차보험 1건. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c046",
    name: "김병기",
    gender: "남",
    age: 31,
    birthDate: "1996-05-10",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20251004786000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p046", name: "한화 장기보험", contractNo: "LA20251004786000", type: "장기" },
    ],
    contactHistory: [],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c047",
    name: "이동식",
    gender: "남",
    age: 70,
    birthDate: "1957-11-13",
    event: "주요담보 저가입고객 안내",
    eventDetail: "RICH간병보험 담보 3건 보강 필요",
    urgency: "normal",
    longTermCount: 3,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "고령 고객. 장기보험 3건 보유. RICH간병보험 담보 보강 제안",
  },
  {
    id: "c048",
    name: "최성철",
    gender: "남",
    age: 43,
    birthDate: "1984-05-28",
    event: "미터치고객",
    eventDetail: "장기 미접촉 고객 (마지막 터치: 2023-10-31)",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p048", name: "한화 장기보험", contractNo: "LA20235906045000", type: "장기" },
    ],
    contactHistory: [],
    memo: "장기 미접촉. 관계 재구축 필요",
  },
  {
    id: "c049",
    name: "어채민",
    gender: "여",
    age: 51,
    birthDate: "1976-07-07",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20254660388000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 4,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p049", name: "한화 장기보험", contractNo: "LA20254660388000", type: "장기" },
    ],
    contactHistory: [],
    memo: "장기보험 4건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c050",
    name: "방동혁",
    gender: "남",
    age: 56,
    birthDate: "1971-05-06",
    event: "장기 체결 감사",
    eventDetail: "장기보험 체결 감사 안내 (LA20254109819000, 체결일 2025-11-07)",
    eventDate: "2025-11-07",
    urgency: "low",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p050", name: "한화 장기보험", contractNo: "LA20254109819000", type: "장기" },
    ],
    contactHistory: [],
    memo: "체결 감사 연락으로 관계 강화",
  },
  {
    id: "c051",
    name: "박한화",
    gender: "남",
    age: 61,
    birthDate: "1966-09-01",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20199860701000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 5,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p051", name: "한화 장기보험", contractNo: "LA20199860701000", type: "장기" },
    ],
    contactHistory: [],
    memo: "5건 장기보험 보유 VIP. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c052",
    name: "심선희",
    gender: "여",
    age: 51,
    birthDate: "1976-05-12",
    event: "가입설계동의 만료",
    eventDetail: "가입설계 동의 만료 예정 (만료일 2026-02-25)",
    eventDate: "2026-02-25",
    urgency: "high",
    longTermCount: 0,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "동의 기한 임박. 연장 또는 재설계 안내 필요",
  },
  {
    id: "c053",
    name: "권정숙",
    gender: "여",
    age: 53,
    birthDate: "1974-01-15",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 2건 보강 필요",
    urgency: "normal",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "장기보험 2건 보유. 여성질환 집중케어 담보 보강 제안",
  },
  {
    id: "c054",
    name: "방주희",
    gender: "여",
    age: 24,
    birthDate: "2003-04-21",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20253141685000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p054", name: "한화 장기보험", contractNo: "LA20253141685000", type: "장기" },
    ],
    contactHistory: [],
    memo: "자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c055",
    name: "조예슬",
    gender: "여",
    age: 33,
    birthDate: "1994-06-24",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "토탈맘케어 담보 보강 제안",
  },
  {
    id: "c056",
    name: "김동영",
    gender: "남",
    age: 67,
    birthDate: "1960-07-04",
    event: "자동차 만기 도래",
    eventDetail: "자동차보험 만기 당일 (CA20251396157000)",
    eventDate: "2026-02-10",
    urgency: "urgent",
    longTermCount: 0,
    carCount: 1,
    lastContact: "2021-05-11",
    products: [
      { id: "p056", name: "한화 자동차보험", contractNo: "CA20251396157000", type: "자동차", expiryDate: "2026-02-10", renewalDate: "2026-02-10" },
    ],
    contactHistory: [
      { date: "2021-05-11", type: "DM", content: "자동차보험 만기 안내" },
    ],
    memo: "고령 고객. 자동차보험 1건. 자동차보험 만기. 갱신 또는 재설계 제안",
  },
  {
    id: "c057",
    name: "조민정",
    gender: "여",
    age: 30,
    birthDate: "1997-04-15",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 2건 보강 필요",
    urgency: "normal",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2024-01-16",
    products: [],
    contactHistory: [
      { date: "2024-01-16", type: "DM", content: "보장분석 안내" },
    ],
    memo: "장기보험 2건 보유. 토탈맘케어 담보 보강 제안",
  },
  {
    id: "c058",
    name: "정미란",
    gender: "여",
    age: 57,
    birthDate: "1970-08-01",
    event: "장기 체결 감사",
    eventDetail: "장기보험 체결 감사 안내 (LA20254067473000, 체결일 2025-11-04)",
    eventDate: "2025-11-04",
    urgency: "low",
    longTermCount: 3,
    carCount: 1,
    lastContact: "2021-05-11",
    products: [
      { id: "p058", name: "한화 장기보험", contractNo: "LA20254067473000", type: "장기" },
    ],
    contactHistory: [
      { date: "2021-05-11", type: "DM", content: "계약체결 감사 안내" },
    ],
    memo: "장기보험 3건 보유. 자동차보험 1건. 체결 감사 연락으로 관계 강화",
  },
  {
    id: "c059",
    name: "김영진",
    gender: "남",
    age: 43,
    birthDate: "1984-06-25",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 12건 보강 필요",
    urgency: "normal",
    longTermCount: 12,
    carCount: 2,
    lastContact: "2024-08-19",
    products: [],
    contactHistory: [
      { date: "2024-08-19", type: "LMS", content: "보장분석 안내" },
      { date: "2022-01-17", type: "DM", content: "보장분석 안내" },
    ],
    memo: "12건 장기보험 보유 VIP. 자동차보험 2건. 여성질환 집중케어 담보 보강 제안",
  },
  {
    id: "c060",
    name: "박정민",
    gender: "여",
    age: 52,
    birthDate: "1975-06-17",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20151759148000, 갱신일 2026-03-20)",
    eventDate: "2026-03-20",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2013-11-04",
    products: [
      { id: "p060", name: "한화 장기보험", contractNo: "LA20151759148000", type: "장기", renewalDate: "2026-03-20" },
    ],
    contactHistory: [
      { date: "2013-11-04", type: "DM", content: "장기보험 갱신 안내" },
    ],
    memo: "장기보험 2건 보유. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c061",
    name: "전미옥",
    gender: "여",
    age: 53,
    birthDate: "1974-04-19",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2023-01-26",
    products: [],
    contactHistory: [
      { date: "2023-01-26", type: "LMS", content: "보장분석 안내" },
    ],
    memo: "토탈맘케어 담보 보강 제안",
  },
  {
    id: "c062",
    name: "박예빈",
    gender: "여",
    age: 32,
    birthDate: "1995-06-09",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 3건 보강 필요",
    urgency: "normal",
    longTermCount: 3,
    carCount: 0,
    lastContact: "2024-01-16",
    products: [],
    contactHistory: [
      { date: "2024-01-16", type: "DM", content: "보장분석 안내" },
    ],
    memo: "장기보험 3건 보유. 토탈맘케어 담보 보강 제안",
  },
  {
    id: "c063",
    name: "김은경",
    gender: "여",
    age: 61,
    birthDate: "1966-07-11",
    event: "미터치고객",
    eventDetail: "장기 미접촉 고객 (마지막 터치: 2023-05-25)",
    urgency: "normal",
    longTermCount: 5,
    carCount: 0,
    lastContact: "2024-08-19",
    products: [
      { id: "p063", name: "한화 장기보험", contractNo: "LA20234385385000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-08-19", type: "LMS", content: "보장분석 안내" },
      { date: "2015-01-09", type: "DM", content: "보장분석 안내" },
    ],
    memo: "5건 장기보험 보유 VIP. 장기 미접촉. 관계 재구축 필요",
  },
  {
    id: "c064",
    name: "최하나",
    gender: "여",
    age: 39,
    birthDate: "1988-02-04",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20147642283000, 갱신일 2026-03-06)",
    eventDate: "2026-03-06",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2024-04-11",
    products: [
      { id: "p064", name: "한화 장기보험", contractNo: "LA20147642283000", type: "장기", renewalDate: "2026-03-06" },
    ],
    contactHistory: [
      { date: "2024-04-11", type: "LMS", content: "장기보험 갱신 안내" },
    ],
    memo: "장기보험 2건 보유. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c065",
    name: "최은지",
    gender: "여",
    age: 40,
    birthDate: "1987-01-21",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20198661921000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 7,
    carCount: 0,
    lastContact: "2022-07-15",
    products: [
      { id: "p065", name: "한화 장기보험", contractNo: "LA20198661921000", type: "장기" },
    ],
    contactHistory: [
      { date: "2022-07-15", type: "LMS", content: "보험료 납입 안내" },
    ],
    memo: "7건 장기보험 보유 VIP. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c066",
    name: "조영선",
    gender: "남",
    age: 63,
    birthDate: "1964-07-02",
    event: "자동차 만기 도래",
    eventDetail: "자동차보험 만기 당일 (CA20251519680000)",
    eventDate: "2026-02-10",
    urgency: "urgent",
    longTermCount: 0,
    carCount: 1,
    lastContact: "",
    products: [
      { id: "p066", name: "한화 자동차보험", contractNo: "CA20251519680000", type: "자동차", expiryDate: "2026-02-10", renewalDate: "2026-02-10" },
    ],
    contactHistory: [],
    memo: "자동차보험 1건. 자동차보험 만기. 갱신 또는 재설계 제안",
  },
  {
    id: "c067",
    name: "김양수",
    gender: "남",
    age: 68,
    birthDate: "1959-02-20",
    event: "본인 생일",
    eventDetail: "오늘 생일 (생년월일: 1959-02-25)",
    eventDate: "2026-02-25",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "고령 고객. 생일 축하 메시지로 관계 구축",
  },
  {
    id: "c068",
    name: "김형준",
    gender: "남",
    age: 55,
    birthDate: "1972-07-06",
    event: "가입설계동의 만료",
    eventDetail: "가입설계 동의 만료 예정 (만료일 2026-02-27)",
    eventDate: "2026-02-27",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "장기보험 2건 보유. 동의 기한 임박. 연장 또는 재설계 안내 필요",
  },
  {
    id: "c069",
    name: "윤서희",
    gender: "여",
    age: 61,
    birthDate: "1966-06-10",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20248390067000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 5,
    carCount: 1,
    lastContact: "",
    products: [
      { id: "p069", name: "한화 장기보험", contractNo: "LA20248390067000", type: "장기" },
      { id: "p069b", name: "한화 장기보험", contractNo: "LA20254617262000", type: "장기" },
    ],
    contactHistory: [],
    memo: "5건 장기보험 보유 VIP. 자동차보험 1건. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c070",
    name: "전누리",
    gender: "여",
    age: 35,
    birthDate: "1992-05-21",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20118379681000, 갱신일 2026-03-18)",
    eventDate: "2026-03-18",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p070", name: "한화 장기보험", contractNo: "LA20118379681000", type: "장기", renewalDate: "2026-03-18" },
    ],
    contactHistory: [],
    memo: "갱신 시 보장 재설계 검토",
  },
  {
    id: "c071",
    name: "손경민",
    gender: "여",
    age: 75,
    birthDate: "1952-12-27",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (7Q3050039946, 갱신일 2026-03-16)",
    eventDate: "2026-03-16",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "고령 고객. 장기보험 2건 보유. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c072",
    name: "윤창호",
    gender: "남",
    age: 76,
    birthDate: "1951-04-14",
    event: "장기 체결 감사",
    eventDetail: "장기보험 체결 감사 안내 (LA20254108918000, 체결일 2025-11-07)",
    eventDate: "2025-11-07",
    urgency: "low",
    longTermCount: 3,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p072", name: "한화 장기보험", contractNo: "LA20254108918000", type: "장기" },
    ],
    contactHistory: [],
    memo: "고령 고객. 장기보험 3건 보유. 체결 감사 연락으로 관계 강화",
  },
  {
    id: "c073",
    name: "이가람",
    gender: "여",
    age: 38,
    birthDate: "1989-02-18",
    event: "본인 생일",
    eventDetail: "오늘 생일 (생년월일: 1989-02-25)",
    eventDate: "2026-02-25",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "생일 축하 메시지로 관계 구축",
  },
  {
    id: "c074",
    name: "이예리나",
    gender: "여",
    age: 35,
    birthDate: "1992-06-02",
    event: "주요담보 저가입고객 안내",
    eventDetail: "토탈맘케어 담보 1건 보강 필요",
    urgency: "normal",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "토탈맘케어 담보 보강 제안",
  },
  {
    id: "c075",
    name: "김옥연",
    gender: "남",
    age: 28,
    birthDate: "1999-05-03",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20254748128000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p075", name: "한화 장기보험", contractNo: "LA20254748128000", type: "장기" },
    ],
    contactHistory: [],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c076",
    name: "강하늘",
    gender: "여",
    age: 33,
    birthDate: "1994-12-14",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20185518971000, 미인출일 2026-02-05)",
    eventDate: "2026-02-05",
    urgency: "high",
    longTermCount: 3,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p076", name: "한화 장기보험", contractNo: "LA20185518971000", type: "장기" },
    ],
    contactHistory: [],
    memo: "장기보험 3건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c077",
    name: "김종록",
    gender: "남",
    age: 36,
    birthDate: "1991-10-28",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20177883398000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p077", name: "한화 장기보험", contractNo: "LA20177883398000", type: "장기" },
    ],
    contactHistory: [],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c078",
    name: "차현진",
    gender: "남",
    age: 26,
    birthDate: "2001-06-27",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20147785807000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p078", name: "한화 장기보험", contractNo: "LA20147785807000", type: "장기" },
    ],
    contactHistory: [],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c079",
    name: "김영주",
    gender: "남",
    age: 63,
    birthDate: "1964-08-25",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20246793977000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2024-03-12",
    products: [
      { id: "p079", name: "한화 장기보험", contractNo: "LA20246793977000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-03-12", type: "LMS", content: "보험료 납입 안내" },
    ],
    memo: "장기보험 2건 보유. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c080",
    name: "전해공",
    gender: "남",
    age: 67,
    birthDate: "1960-09-02",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20151751163000, 갱신일 2026-03-19)",
    eventDate: "2026-03-19",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2024-01-16",
    products: [
      { id: "p080", name: "한화 장기보험", contractNo: "LA20151751163000", type: "장기", renewalDate: "2026-03-19" },
    ],
    contactHistory: [
      { date: "2024-01-16", type: "LMS", content: "장기보험 갱신 안내" },
      { date: "2018-05-15", type: "DM", content: "장기보험 갱신 안내" },
    ],
    memo: "고령 고객. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c081",
    name: "이양희",
    gender: "여",
    age: 60,
    birthDate: "1967-09-06",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (72UL30002033, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 7,
    carCount: 2,
    lastContact: "2024-08-19",
    products: [
      { id: "p081", name: "한화 장기보험", contractNo: "72UL30002033", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-08-19", type: "LMS", content: "보험료 납입 안내" },
      { date: "2024-01-16", type: "DM", content: "보험료 납입 안내" },
    ],
    memo: "7건 장기보험 보유 VIP. 자동차보험 2건. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c082",
    name: "고정애",
    gender: "여",
    age: 50,
    birthDate: "1977-04-26",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 2건 보강 필요",
    urgency: "normal",
    longTermCount: 2,
    carCount: 0,
    lastContact: "2014-01-10",
    products: [],
    contactHistory: [
      { date: "2014-01-10", type: "DM", content: "보장분석 안내" },
    ],
    memo: "장기보험 2건 보유. 여성질환 집중케어 담보 보강 제안",
  },
  {
    id: "c083",
    name: "임용일",
    gender: "남",
    age: 66,
    birthDate: "1961-06-30",
    event: "장기 만기 도래",
    eventDetail: "장기보험 만기 도래 (LA20164963802000, 만기일 2026-03-18)",
    eventDate: "2026-03-18",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2021-05-11",
    products: [
      { id: "p083", name: "한화 장기보험", contractNo: "LA20164963802000", type: "장기", expiryDate: "2026-03-18", renewalDate: "2026-03-18" },
    ],
    contactHistory: [
      { date: "2021-05-11", type: "DM", content: "장기보험 만기 안내" },
    ],
    memo: "고령 고객. 만기 후 재가입 또는 리모델링 제안",
  },
  {
    id: "c084",
    name: "정하영",
    gender: "여",
    age: 50,
    birthDate: "1977-12-15",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20217159458000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 8,
    carCount: 0,
    lastContact: "2024-02-16",
    products: [
      { id: "p084", name: "한화 장기보험", contractNo: "LA20217159458000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-02-16", type: "LMS", content: "보험료 납입 안내" },
      { date: "2022-01-17", type: "DM", content: "보험료 납입 안내" },
    ],
    memo: "8건 장기보험 보유 VIP. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c085",
    name: "손미라",
    gender: "여",
    age: 54,
    birthDate: "1973-01-25",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20178646892000, 갱신일 2026-03-20)",
    eventDate: "2026-03-20",
    urgency: "high",
    longTermCount: 4,
    carCount: 0,
    lastContact: "2015-08-11",
    products: [
      { id: "p085", name: "한화 장기보험", contractNo: "LA20178646892000", type: "장기", renewalDate: "2026-03-20" },
      { id: "p085b", name: "한화 장기보험", contractNo: "LA20178609133000", type: "장기", renewalDate: "2026-03-15" },
    ],
    contactHistory: [
      { date: "2015-08-11", type: "DM", content: "장기보험 갱신 안내" },
    ],
    memo: "장기보험 4건 보유. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c086",
    name: "권명숙",
    gender: "여",
    age: 64,
    birthDate: "1963-12-15",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20179372819000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 6,
    carCount: 0,
    lastContact: "2024-04-11",
    products: [
      { id: "p086", name: "한화 장기보험", contractNo: "LA20179372819000", type: "장기" },
    ],
    contactHistory: [
      { date: "2024-04-11", type: "LMS", content: "보험료 납입 안내" },
    ],
    memo: "6건 장기보험 보유 VIP. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c087",
    name: "윤민정",
    gender: "여",
    age: 48,
    birthDate: "1979-03-25",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 4건 보강 필요",
    urgency: "normal",
    longTermCount: 4,
    carCount: 0,
    lastContact: "2022-10-21",
    products: [],
    contactHistory: [
      { date: "2022-10-21", type: "LMS", content: "보장분석 안내" },
    ],
    memo: "장기보험 4건 보유. 여성질환 집중케어 담보 보강 제안",
  },
  {
    id: "c088",
    name: "한예슬",
    gender: "여",
    age: 42,
    birthDate: "1985-02-20",
    event: "가입설계동의 만료",
    eventDetail: "가입설계 동의 만료 예정 (만료일 2026-02-25)",
    eventDate: "2026-02-25",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "2015-06-02",
    products: [],
    contactHistory: [
      { date: "2015-06-02", type: "DM", content: "가입설계 안내" },
    ],
    memo: "동의 기한 임박. 연장 또는 재설계 안내 필요",
  },
  {
    id: "c089",
    name: "박예림",
    gender: "여",
    age: 32,
    birthDate: "1995-06-23",
    event: "장기 연체(미납)",
    eventDetail: "보험료 미납 연체 (LA20166862053000, 납부기한 2026-02-25)",
    eventDate: "2026-02-25",
    urgency: "urgent",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p089", name: "한화 장기보험", contractNo: "LA20166862053000", type: "장기" },
    ],
    contactHistory: [],
    memo: "납부기한 임박. 실효 전 긴급 연락 필요",
  },
  {
    id: "c090",
    name: "배대성",
    gender: "남",
    age: 42,
    birthDate: "1985-12-10",
    event: "주요담보 저가입고객 안내",
    eventDetail: "RICH간병보험 담보 2건 보강 필요",
    urgency: "normal",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "장기보험 2건 보유. RICH간병보험 담보 보강 제안",
  },
  {
    id: "c091",
    name: "박주혜",
    gender: "여",
    age: 32,
    birthDate: "1995-01-07",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20251609705000, 갱신일 2026-03-14)",
    eventDate: "2026-03-14",
    urgency: "high",
    longTermCount: 1,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p091", name: "한화 장기보험", contractNo: "LA20251609705000", type: "장기", renewalDate: "2026-03-14" },
    ],
    contactHistory: [],
    memo: "갱신 시 보장 재설계 검토",
  },
  {
    id: "c092",
    name: "송재섭",
    gender: "남",
    age: 44,
    birthDate: "1983-12-12",
    event: "가입설계동의 만료",
    eventDetail: "가입설계 동의 만료 예정 (만료일 2026-02-27)",
    eventDate: "2026-02-27",
    urgency: "high",
    longTermCount: 0,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "동의 기한 임박. 연장 또는 재설계 안내 필요",
  },
  {
    id: "c093",
    name: "이종숙",
    gender: "여",
    age: 70,
    birthDate: "1957-04-14",
    event: "장기 자동이체 미인출",
    eventDetail: "보험료 자동이체 미인출 (LA20223155866000, 미인출일 2026-02-11)",
    eventDate: "2026-02-11",
    urgency: "high",
    longTermCount: 13,
    carCount: 1,
    lastContact: "",
    products: [
      { id: "p093", name: "한화 장기보험", contractNo: "LA20223155866000", type: "장기" },
    ],
    contactHistory: [],
    memo: "고령 고객. 13건 장기보험 보유 VIP. 자동차보험 1건. 자동이체 미인출. 계좌 확인 및 납부 방법 안내 필요",
  },
  {
    id: "c094",
    name: "문성식",
    gender: "남",
    age: 39,
    birthDate: "1988-02-25",
    event: "장기 갱신",
    eventDetail: "장기보험 갱신 예정 (LA20118370112000, 갱신일 2026-03-18)",
    eventDate: "2026-03-18",
    urgency: "high",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [
      { id: "p094", name: "한화 장기보험", contractNo: "LA20118370112000", type: "장기", renewalDate: "2026-03-18" },
    ],
    contactHistory: [],
    memo: "장기보험 2건 보유. 갱신 시 보장 재설계 검토",
  },
  {
    id: "c095",
    name: "박경련",
    gender: "여",
    age: 73,
    birthDate: "1954-06-05",
    event: "주요담보 저가입고객 안내",
    eventDetail: "여성질환 집중케어 담보 2건 보강 필요",
    urgency: "normal",
    longTermCount: 2,
    carCount: 0,
    lastContact: "",
    products: [],
    contactHistory: [],
    memo: "고령 고객. 장기보험 2건 보유. 여성질환 집중케어 담보 보강 제안",
  },

];

export const LMS_MESSAGES: Record<string, LMSMessage[]> = {
  c001: [
    {
      id: "lms-c001-1",
      customerId: "c001",
      type: "안내형",
      title: "생신 축하 안내",
      content: `[한화손해보험]
고한준 고객님, 생신을 진심으로 축하드립니다! 🎂

늘 저희 한화손해보험을 이용해 주셔서 감사합니다.
건강하고 행복한 한 해 보내시길 기원합니다.

담당 FP 김한화 드림
☎ 010-8024-3219 | 고객센터 1566-8000`,
    },
    {
      id: "lms-c001-2",
      customerId: "c001",
      type: "감성형",
      title: "따뜻한 생일 인사",
      content: `고한준 고객님, 안녕하세요!
한화손해보험 담당 FP 김한화입니다. 🌸

오늘 특별한 생신을 맞이하여
진심으로 축하 인사 드립니다.
오랜 시간 저를 믿고 함께해 주셔서 항상 감사하게 생각합니다.

건강하시고, 행복한 하루 보내세요!
- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c001-3",
      customerId: "c001",
      type: "혜택/관리형",
      title: "생일 기념 보장점검 제안",
      content: `[한화손해보험] 고한준 고객님, 생신을 축하드립니다! 🎊

소중한 생일을 맞아 고객님의 보험 보장 내역을 점검해 드리고 싶습니다.

✅ 현재 자동차보험 1건 가입 중
✅ 나이에 맞는 건강보험 추가 보장 검토 가능

편하신 시간에 연락 주시면 맞춤형 보장 설계를 무료로 제안해 드리겠습니다.
☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c002: [
    {
      id: "lms-c002-1",
      customerId: "c002",
      type: "안내형",
      title: "자동차보험 만기 긴급 안내",
      content: `[한화손해보험] 강충심 고객님,

고객님의 자동차보험(CA20251858775000)이
금일 만기됩니다.

보장 공백이 발생하지 않도록
빠른 시일 내에 갱신 부탁드립니다.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c002-2",
      customerId: "c002",
      type: "감성형",
      title: "만기 안내 + 감사 인사",
      content: `강충심 고객님, 안녕하세요!
한화손해보험 담당 FP 김한화입니다.

오랜 기간 저희 자동차보험을 이용해 주셔서
진심으로 감사드립니다. 😊

고객님의 자동차보험이 오늘 만기를 맞이했습니다.
계속해서 안전한 드라이빙을 응원드리며,
갱신 관련하여 편하게 연락 주세요!

- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c002-3",
      customerId: "c002",
      type: "혜택/관리형",
      title: "갱신 + 보장강화 제안",
      content: `[갱신안내] 강충심 고객님,

자동차보험 만기 도래 안내 드립니다.

✨ 이번 갱신 시 특별 혜택
• 고객님 운전 이력 반영 → 보험료 절감 가능
• 최신 특약 추가로 보장 강화
• 긴급출동 서비스 확대 적용

지금 연락 주시면 더 좋은 조건으로
재설계해 드리겠습니다.

☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c003: [
    {
      id: "lms-c003-1",
      customerId: "c003",
      type: "안내형",
      title: "장기보험 갱신 안내",
      content: `[한화손해보험] 박종석 고객님,

장기보험(LA20147718920000)의
갱신일이 2026년 3월 17일로 다가왔습니다.

갱신 관련 상세 내용 확인 부탁드리며,
궁금한 점은 아래로 문의해 주세요.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c003-2",
      customerId: "c003",
      type: "감성형",
      title: "오랜 고객 감사 + 갱신 안내",
      content: `박종석 고객님, 안녕하세요.
담당 FP 김한화입니다.

오랜 시간 한화손해보험을 믿고 거래해 주셔서
진심으로 감사드립니다. 🙏

장기보험 갱신 시기가 다가오고 있어
미리 안내 드립니다.
혹시 변경사항이나 궁금한 점이 있으시면
언제든지 편하게 연락 주세요.

- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c003-3",
      customerId: "c003",
      type: "혜택/관리형",
      title: "포트폴리오 점검 제안",
      content: `박종석 고객님,
장기보험 갱신 시기입니다.

현재 장기보험 7건을 성실히 유지 중이신
소중한 VIP 고객님께 제안드립니다.

📋 무료 포트폴리오 점검 서비스
• 중복 보장 정리로 보험료 절감
• 갱신 시 최적 조건 재협상
• 노후 대비 보장 재설계 검토

전문적인 상담을 제공해 드리겠습니다.
☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c004: [
    {
      id: "lms-c004-1",
      customerId: "c004",
      type: "안내형",
      title: "여성질환 담보 보강 안내",
      content: `[한화손해보험] 이가영 고객님,

고객님의 보험을 분석한 결과,
여성질환 관련 담보가 부족한 것으로 확인되었습니다.

추가 보장 설계를 원하시면
아래로 문의해 주세요.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c004-2",
      customerId: "c004",
      type: "감성형",
      title: "건강 걱정 + 담보 제안",
      content: `이가영 고객님, 안녕하세요!
한화손해보험 담당 FP 김한화입니다. 😊

고객님의 보험 보장 내역을 검토하던 중
여성 특화 담보 보강이 필요하다고 생각되어
연락드렸습니다.

건강이 최고의 재산인 만큼,
더 든든한 보장을 받으실 수 있도록
도와드리고 싶습니다. 💙

편하신 시간에 연락 주세요!
- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c004-3",
      customerId: "c004",
      type: "혜택/관리형",
      title: "여성 특화 보장 강화 제안",
      content: `이가영 고객님,
보험 포트폴리오 점검 결과를 안내드립니다.

⚠️ 보강 필요 담보 (2건)
• 자궁암·유방암 진단비 → 현재 미가입
• 여성질환 입원비 → 현재 미가입

💡 추천 솔루션
한화 여성질환 집중케어 특약 추가 시
최소 비용으로 최대 보장 확보 가능합니다.

맞춤형 설계안을 무료로 제공해 드립니다.
☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c005: [
    {
      id: "lms-c005-1",
      customerId: "c005",
      type: "안내형",
      title: "자동이체 미인출 안내",
      content: `[한화손해보험] 이용철 고객님,

장기보험(LA20149010060000) 보험료가
2026년 2월 5일 자동이체 미인출 되었습니다.

보장 유지를 위해 빠른 납부 부탁드립니다.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c005-2",
      customerId: "c005",
      type: "감성형",
      title: "걱정스러운 마음으로 연락",
      content: `이용철 고객님, 안녕하세요.
한화손해보험 담당 FP 김한화입니다.

이번 달 보험료가 자동이체에서
출금되지 않아 혹시 불편하신 점이
있으신지 걱정이 되어 연락드렸습니다.

소중한 보장이 끊기지 않도록
빠른 안내 드리겠습니다. 🙏

편하게 연락 주세요.
- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c005-3",
      customerId: "c005",
      type: "혜택/관리형",
      title: "납부 방법 안내 + 보장 유지",
      content: `이용철 고객님,
보험료 자동이체 미인출로
보장 중단 위험이 있습니다.

💡 다양한 납부 방법 안내
• 계좌이체 즉시 납부
• 카드 자동이체 전환
• 분납 또는 납입유예 신청

소중한 보험을 잃지 않도록
지금 바로 연락 주시면
최선의 방법을 찾아드리겠습니다.

☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c006: [
    {
      id: "lms-c006-1",
      customerId: "c006",
      type: "안내형",
      title: "계약 1주년 감사 안내",
      content: `[한화손해보험] 조혜숙 고객님,

한화손해보험과의 소중한 인연
1주년을 맞이하여 진심으로 감사드립니다.

고객님의 건강과 행복을 항상 응원합니다.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c006-2",
      customerId: "c006",
      type: "감성형",
      title: "1주년 진심 어린 감사",
      content: `조혜숙 고객님, 안녕하세요! 😊
어느덧 한화손해보험과 함께한 지
1년이 되었습니다.

그동안 저를 믿고 맡겨주셔서
진심으로 감사드립니다. 🌸

앞으로도 고객님과 소중한 가족의
건강과 안전을 위해 항상 최선을
다하겠습니다.

- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c006-3",
      customerId: "c006",
      type: "혜택/관리형",
      title: "1주년 기념 VIP 보장 점검",
      content: `조혜숙 고객님, 계약 1주년 축하드립니다! 🎊

장기보험 7건을 성실히 유지하고 계신
소중한 VIP 고객님께 특별 감사 인사를 드립니다.

🎁 1주년 특별 혜택
• 전체 보장 내역 무료 점검
• 최신 특약 추가 상담
• 노후 간병 보장 강화 리뷰

편하신 시간에 연락 주시면
찾아뵙겠습니다.

☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c007: [
    {
      id: "lms-c007-1",
      customerId: "c007",
      type: "안내형",
      title: "보험료 미납 긴급 안내",
      content: `[한화손해보험] 손유희 고객님,

장기보험(LA20135260370000) 보험료가
미납 상태입니다.

⚠️ 납부기한: 2026년 2월 25일
기한 내 미납 시 보장이 중단될 수 있습니다.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c007-2",
      customerId: "c007",
      type: "감성형",
      title: "어려움 없으신지 걱정",
      content: `손유희 고객님, 안녕하세요.
한화손해보험 담당 FP 김한화입니다.

보험료 납부 관련하여
어려움이 있으신지 걱정이 되어
연락드렸습니다. 🙏

납부 방법이나 조정에 관해
어떠한 도움이라도 필요하시면
편하게 말씀해 주세요.

- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c007-3",
      customerId: "c007",
      type: "혜택/관리형",
      title: "실효 전 보장 유지 방안",
      content: `손유희 고객님,
보험료 미납으로 납부기한(2.25)이
임박했습니다.

💡 보장 유지 방법 안내
• 분납: 월 보험료를 나눠서 납부
• 납입유예: 최대 1년 납부 유예 가능
• 자동이체 전환: 재발 방지

11년간 유지해 오신 소중한 보험을
잃지 않도록 지금 바로 연락 주세요!

☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c008: [
    {
      id: "lms-c008-1",
      customerId: "c008",
      type: "안내형",
      title: "장기보험 만기 도래 안내",
      content: `[한화손해보험] 김이순 고객님,

장기보험(LA20164857772000)의
만기일이 2026년 3월 8일로 다가왔습니다.

만기 이후 보장 공백이 없도록
미리 상담 받으시기를 권해드립니다.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c008-2",
      customerId: "c008",
      type: "감성형",
      title: "오랜 인연에 감사 + 만기 안내",
      content: `김이순 고객님, 안녕하세요!
한화손해보험 담당 FP 김한화입니다. 😊

오랜 시간 한화손해보험을 이용해
주셔서 진심으로 감사드립니다.

소중하게 유지해 오신 장기보험이
만기를 앞두고 있습니다.

앞으로도 든든한 보장을 받으실 수 있도록
재설계를 도와드리고 싶습니다.

- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c008-3",
      customerId: "c008",
      type: "혜택/관리형",
      title: "만기 후 재가입/리모델링 제안",
      content: `김이순 고객님,
장기보험 만기 후에도 지속적인 보장을 위해
재가입 또는 리모델링을 검토해 드립니다.

✨ 맞춤형 재설계 혜택
• 나이·건강 상태 반영 최적 설계
• 노후 의료비 보장 강화
• 불필요한 보장 정리로 보험료 절감

풍요로운 노후를 함께 준비해 드리겠습니다.
☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c009: [
    {
      id: "lms-c009-1",
      customerId: "c009",
      type: "안내형",
      title: "보험료 미납 긴급 안내",
      content: `[한화손해보험] 한선희 고객님,

장기보험(LA20135019382000) 보험료가
미납 상태입니다.

⚠️ 납부기한: 2026년 2월 21일
기한 내 미납 시 보장이 중단될 수 있습니다.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c009-2",
      customerId: "c009",
      type: "감성형",
      title: "걱정되는 마음으로 연락",
      content: `한선희 고객님, 안녕하세요.
한화손해보험 담당 FP 김한화입니다.

보험료 납부와 관련해 혹시 어려움이
있으신 건 아닌지 걱정이 되어 연락드렸습니다. 🙏

오래 유지해 오신 소중한 보험을
지키실 수 있도록 함께 방법을 찾아보겠습니다.
편하게 연락 주세요.

- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c009-3",
      customerId: "c009",
      type: "혜택/관리형",
      title: "실효 전 납부 방법 안내",
      content: `한선희 고객님,
납부기한(2.21)이 임박하였습니다.

💡 보장 유지 방법 안내
• 즉시 납부: 계좌이체 또는 카드 납부
• 분납: 월 보험료를 나눠서 납부
• 납입유예: 최대 1년 납부 유예 가능

소중한 보험을 잃지 않도록
지금 바로 연락 주시면 도와드리겠습니다.

☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c010: [
    {
      id: "lms-c010-1",
      customerId: "c010",
      type: "안내형",
      title: "자동이체 미인출 안내",
      content: `[한화손해보험] 정희정 고객님,

장기보험(LA20147821851000) 보험료가
2026년 2월 11일 자동이체 미인출 되었습니다.

보장 유지를 위해 빠른 납부 부탁드립니다.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c010-2",
      customerId: "c010",
      type: "감성형",
      title: "미인출 확인 + 걱정 인사",
      content: `정희정 고객님, 안녕하세요!
한화손해보험 담당 FP 김한화입니다.

이번 달 보험료 자동이체가
정상 처리되지 않아 연락드렸습니다.

5건 장기보험을 성실히 유지해 오신
소중한 고객님의 보장이 끊기지 않도록
빠른 안내 드리겠습니다. 😊

편하게 연락 주세요.
- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c010-3",
      customerId: "c010",
      type: "혜택/관리형",
      title: "자동이체 계좌 정비 제안",
      content: `정희정 고객님,
보험료 자동이체 미인출 안내 드립니다.

💡 빠른 해결 방법
• 계좌 잔액 확인 후 즉시 납부
• 새 계좌로 자동이체 전환
• 카드 자동이체 변경 가능

5건 장기보험 모두 안전하게 유지하실 수 있도록
지금 바로 도와드리겠습니다.

☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c011: [
    {
      id: "lms-c011-1",
      customerId: "c011",
      type: "안내형",
      title: "가입설계 동의 만료 안내",
      content: `[한화손해보험] 김은서 고객님,

고객님의 가입설계 동의가
2026년 2월 26일 만료될 예정입니다.

동의 기간 연장 또는 신규 설계 상담을 위해
아래로 문의해 주세요.

📞 담당 FP 김한화 010-8024-3219
📞 고객센터 1566-8000`,
    },
    {
      id: "lms-c011-2",
      customerId: "c011",
      type: "감성형",
      title: "동의 만료 전 안내 인사",
      content: `김은서 고객님, 안녕하세요!
한화손해보험 담당 FP 김한화입니다. 😊

고객님께서 검토해 주신 가입설계 동의 기간이
곧 만료될 예정이어서 연락드렸습니다.

혹시 더 좋은 조건으로 다시 설계를 검토해 보시거나
궁금한 점이 있으시면 편하게 말씀해 주세요.
항상 최선을 다해 도와드리겠습니다.

- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c011-3",
      customerId: "c011",
      type: "혜택/관리형",
      title: "동의 연장 또는 재설계 제안",
      content: `김은서 고객님,
가입설계 동의 만료(2.26) 안내 드립니다.

📋 선택 가능한 옵션
• 기존 설계 동의 연장 (간편 처리)
• 최신 상품으로 재설계 검토
• 현재 보장 보완 사항 무료 분석

2건 장기보험과 함께 더 든든한
보장 구성을 제안해 드릴 수 있습니다.

☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
  c012: [
    {
      id: "lms-c012-1",
      customerId: "c012",
      type: "안내형",
      title: "생신 축하 안내",
      content: `[한화손해보험]
김한준 고객님, 생신을 진심으로 축하드립니다! 🎂

한화손해보험 담당 FP 김한화입니다.
앞으로도 건강하고 행복한 나날 보내시길 바랍니다.

☎ 010-8024-3219 | 고객센터 1566-8000`,
    },
    {
      id: "lms-c012-2",
      customerId: "c012",
      type: "감성형",
      title: "따뜻한 생일 메시지",
      content: `김한준 고객님, 안녕하세요!
한화손해보험 담당 FP 김한화입니다. 🌸

오늘 소중한 생신을 맞이하셔서
진심으로 축하드립니다.

늘 건강하시고 하시는 일 모두
잘 되시길 응원드립니다.
생일 축하드립니다!

- 담당 FP 김한화 드림`,
    },
    {
      id: "lms-c012-3",
      customerId: "c012",
      type: "혜택/관리형",
      title: "생일 기념 보장 점검 제안",
      content: `[한화손해보험] 김한준 고객님, 생신 축하드립니다! 🎊

소중한 생일을 맞아 보험 보장 현황을
점검해 드리고 싶습니다.

✅ 현재 장기보험 + 자동차보험 가입 중
✅ 40대 맞춤 건강보장 강화 검토 가능

편하신 시간에 연락 주시면
무료 보장 분석을 제공해 드리겠습니다.
☎ 담당 FP 김한화 010-8024-3219
☎ 고객센터 1566-8000`,
    },
  ],
};

export const TODAY_TODOS: TodoItem[] = [
  {
    id: "t001",
    text: "만기도래 고객 연락 (강충심 — 오늘 만기)",
    done: false,
    urgency: "urgent",
  },
  {
    id: "t002",
    text: "연체 보험료 안내 (손유희, 한선희)",
    done: false,
    urgency: "urgent",
  },
  {
    id: "t003",
    text: "생일 LMS 발송 (고한준, 김한준)",
    done: true,
    urgency: "normal",
  },
  {
    id: "t004",
    text: "자동이체 미인출 확인 (이용철, 정희정)",
    done: false,
    urgency: "high",
  },
  {
    id: "t005",
    text: "가입설계 동의 만료 안내 (김은서)",
    done: false,
    urgency: "high",
  },
];
