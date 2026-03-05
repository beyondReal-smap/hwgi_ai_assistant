export type EventType =
  // A 계열: 계약 관련
  | "장기 연체(미납)"
  | "장기 실효(해지)"
  | "장기 해약"
  | "장기계약 부활"
  | "보험금 지급"
  | "장기 갱신"
  | "장기 납입만기(완납)"
  | "장기 만기 도래"
  | "자동차 만기 도래"
  | "장기 체결 감사"
  | "고객정보 수정"
  | "우편물 반송"
  | "장기 자동이체 미인출"
  | "미래보장담보 개시 도래"
  // B 계열: 고객 이벤트/안내
  | "본인 생일"
  | "자녀 입학"
  | "휴면보험금 안내"
  | "자보 이탈고객 만기 안내"
  | "타사 자보만기(장기고객)"
  | "상령월 도래"
  | "가입설계동의 만료"
  | "가망고객정보 삭제"
  | "장기 미터치 이관고객 안내"
  | "주요담보 저가입고객 안내"
  // C 계열: 영업 활동
  | "미터치고객"
  | "담보 부족고객"
  | "상품추가 가입고객"
  | "미가입 가망고객";

export type UrgencyLevel = "urgent" | "high" | "normal" | "low";

export type Gender = "남" | "여";

export type LMSType = "안내형" | "감성형" | "혜택/관리형";

export interface FPProfile {
  name: string;
  employeeId: string;
  branch: string;
  level: string;
  yearsOfExperience: number;
  phone?: string;
  email?: string;
  profileInitials: string;
}

export interface FPAccount extends FPProfile {
  password: string;
}

export interface Product {
  id: string;
  name: string;
  contractNo: string;
  renewalDate?: string;
  expiryDate?: string;
  premium?: number;
  type: "장기" | "자동차" | "기타";
}

export interface ContactHistory {
  date: string;
  type: "LMS" | "DM" | "전화" | "방문" | "이메일";
  content: string;
}

export interface Customer {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  birthDate: string;
  phone?: string;
  event: EventType;
  eventDetail: string;
  eventDate?: string;
  products: Product[];
  urgency: UrgencyLevel;
  lastContact: string | null;
  contactHistory: ContactHistory[];
  longTermCount: number;
  carCount: number;
  memo?: string;
}

export interface LMSMessage {
  id: string;
  customerId: string;
  type: LMSType;
  title: string;
  content: string;
}

export type MessageType = "text" | "customer-list" | "lms-list" | "analysis";

export interface ChatMessage {
  id: string;
  role: "bot" | "user";
  type: MessageType;
  content: string;
  customers?: Customer[];
  lmsMessages?: LMSMessage[];
  customerContext?: Customer;
  timestamp: Date;
}

export interface SidebarStats {
  totalCustomers: number;
  todayTargets: number;
  completedToday: number;
  monthlyAchievement: number;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  urgency?: UrgencyLevel;
}
