export type EventType =
  | "본인 생일"
  | "자동차 만기 도래"
  | "장기 갱신"
  | "장기 만기 도래"
  | "장기 체결 감사"
  | "장기 자동이체 미인출"
  | "장기 연체(미납)"
  | "주요담보 저가입고객 안내"
  | "미터치고객"
  | "가입설계동의 만료";

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

export type MessageType = "text" | "customer-list" | "lms-list";

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
