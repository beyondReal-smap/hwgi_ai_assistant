export interface Example {
  query: string;
  desc: string;
}

export interface Category {
  title: string;
  icon: string;
  examples: Example[];
}

export interface Scenario {
  title: string;
  steps: string[];
}

export const CATEGORIES: Category[] = [
  {
    title: "오늘 터치 (Daily Touch)",
    icon: "📋",
    examples: [
      { query: "오늘 터치할 고객 보여줘", desc: "전체 터치 리스트" },
      { query: "만기 갱신 고객 알려줘", desc: "자동차/장기 만기 + 갱신" },
      { query: "연체 미인출 고객 보여줘", desc: "장기 연체 + 미인출" },
      { query: "오늘 생일인 고객 있어?", desc: "오늘 생일" },
      { query: "체결 감사 대상 고객", desc: "신규 체결 감사" },
      { query: "미터치 고객 누구야?", desc: "장기 미접촉" },
      { query: "주요담보 저가입 고객", desc: "담보 부족 안내" },
      { query: "가입설계 동의 만료 고객", desc: "동의 만료 예정" },
      { query: "남자 터치 고객", desc: "터치 리스트 내 성별 필터" },
      { query: "50대 터치 고객", desc: "터치 리스트 내 연령 필터" },
      { query: "자동차보험 고객", desc: "자동차(CA) 보유 고객" },
      { query: "긴급 고객 보여줘", desc: "긴급도 필터" },
    ],
  },
  {
    title: "내 전체 고객",
    icon: "👥",
    examples: [
      { query: "내 담당 고객 목록 보여줘", desc: "이름순 정렬" },
      { query: "남자 고객 몇 명이야?", desc: "성별 필터" },
      { query: "여성 고객 목록", desc: "성별 필터" },
      { query: "50대 고객 보여줘", desc: "50~60세" },
      { query: "30세 이상 고객", desc: "30세 이상 전체" },
      { query: "50대 여자 고객", desc: "연령 + 성별 복합 조건" },
      { query: "마케팅 동의 고객", desc: "마케팅 활용 동의" },
      { query: "3월 생일 고객", desc: "특정 월 생일" },
      { query: "이번달 생일 고객", desc: "이번 달 생일" },
    ],
  },
  {
    title: "직장 검색",
    icon: "🏢",
    examples: [
      { query: "우체국 다니는 고객", desc: "직장명: 우체국" },
      { query: "병원 고객", desc: "직장명: 병원" },
      { query: "학생 고객", desc: "직장명: 학생" },
    ],
  },
  {
    title: "설계사 조회",
    icon: "🧑‍💼",
    examples: [
      { query: "우리 지점 설계사 목록 보여줘", desc: "전체 FP 목록" },
      { query: "안옥순 설계사 고객", desc: "특정 FP 고객 조회" },
      { query: "위정숙 담당 고객", desc: "특정 FP 고객 조회" },
    ],
  },
  {
    title: "상품 조회",
    icon: "📦",
    examples: [
      { query: "가장 많이 가입한 상품 순위", desc: "인기 상품 순위" },
      { query: "취급 상품 목록", desc: "전체 상품 목록" },
      { query: "암보험 가입 현황", desc: "상품명 검색" },
      { query: "실손보험 가입 고객", desc: "상품명 검색" },
      { query: "운전자보험 가입자", desc: "상품명 검색" },
      { query: "자녀보험 가입 현황", desc: "상품명 검색" },
      { query: "치아보험 가입 고객", desc: "상품명 검색" },
    ],
  },
  {
    title: "담보 검색",
    icon: "🛡️",
    examples: [
      { query: "질병사망 담보 가입자", desc: "담보명 검색" },
      { query: "수술비 담보 가입 현황", desc: "담보명 검색" },
      { query: "뇌출혈 담보 가입 고객", desc: "담보명 검색" },
      { query: "암진단비 가입자", desc: "담보명 검색" },
    ],
  },
  {
    title: "고객 가입 상세",
    icon: "📄",
    examples: [
      { query: "지미애 가입 담보", desc: "증권별 담보 트리" },
      { query: "박우신 계약 정보", desc: "증권별 담보 트리" },
      { query: "강경민 가입 상품", desc: "증권별 담보 트리" },
    ],
  },
  {
    title: "만기 도래",
    icon: "⏰",
    examples: [
      { query: "올해 만기 도래 담보 현황", desc: "12개월 이내" },
      { query: "3개월 내 만기 계약", desc: "3개월 이내" },
      { query: "6개월 이내 만기 담보", desc: "6개월 이내" },
    ],
  },
  {
    title: "실손의료비 검색",
    icon: "🏥",
    examples: [
      { query: "실손 세대 구분 알려줘", desc: "1~4세대 판매시기·특징" },
      { query: "2014년에 가입한 실손은 몇세대야?", desc: "가입시기 → 세대 확인" },
      { query: "치과 치료는 실손에서 보상돼?", desc: "치과 보상 기준" },
      { query: "실손 자기부담금 비율", desc: "세대별 본인부담 안내" },
      { query: "도수치료 실손 보상 기준", desc: "비급여 도수치료 보상" },
      { query: "실손 면책사항 알려줘", desc: "면책·부담보 조항" },
      { query: "골절 치료 실손 보상 되나요?", desc: "상해/질병 골절 보상" },
      { query: "4세대 실손 급여 비급여 차이", desc: "4세대 보상 구조" },
    ],
  },
];

export const SCENARIOS: Scenario[] = [
  {
    title: "일일 터치 업무",
    steps: [
      "로그인 → 자동 터치 리스트 표시",
      '"연체 미인출 고객 보여줘" → 긴급 고객 확인',
      "고객 카드 클릭 → LMS 생성 → 발송",
    ],
  },
  {
    title: "고객 분석",
    steps: [
      '"내 담당 고객 목록 보여줘" → 전체 고객 확인',
      '"50대 여자 고객" → 복합 필터',
      '"마케팅 동의 고객" → 마케팅 대상 확인',
      '"3월 생일 고객" → 생일 고객 확인',
    ],
  },
  {
    title: "상품/담보 분석",
    steps: [
      '"가장 많이 가입한 상품 순위" → 인기 상품 확인',
      '"암보험 가입 현황" → 특정 상품 가입자',
      '"지미애 가입 담보" → 고객 상세 확인',
      '"올해 만기 도래 담보 현황" → 만기 관리',
    ],
  },
  {
    title: "실손의료비 상담",
    steps: [
      '"실손 세대 구분 알려줘" → 세대별 특징 파악',
      '"2014년에 가입한 실손은 몇세대야?" → 가입시기로 세대 확인',
      '"골절 치료 실손 보상 되나요?" → 보상 기준 확인',
      '"실손 면책사항 알려줘" → 면책·부담보 조항 확인',
    ],
  },
];
