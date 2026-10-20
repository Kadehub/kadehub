export type TaskStatus = 'open' | 'assigned' | 'completed' | 'closed' | 'cancelled';
export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface PublicUser { id: number; name: string; photo_url: string | null }
export interface UserStats { rating_avg: number; rating_count: number; completed_count: number }

export interface Category { id: number; name: string; slug: string; icon: string | null; sort_order?: number; is_active?: boolean }

export interface TaskCard {
  id: number;
  title: string;
  budget: number;
  agreed_amount: number | null;
  status: TaskStatus;
  location_type: 'in_person' | 'remote';
  district: string | null;
  city: string | null;
  due_date: string | null;
  flexible: boolean;
  offers_count: number;
  hidden: boolean;
  created_at: string;
  category: Category | null;
  poster: PublicUser | null;
  thumbnail: string | null;
}

export interface Paged<T> { items: T[]; total: number; page: number; pages: number }

export interface OfferView {
  id: number;
  status: OfferStatus;
  message: string;
  amount: number | null;
  created_at: string;
  tasker: PublicUser & UserStats;
}

export interface QuestionView {
  id: number;
  body: string;
  created_at: string;
  user: PublicUser;
  replies: Omit<QuestionView, 'replies'>[];
}

export interface ReviewView {
  id: number;
  rating: number;
  comment: string | null;
  role: 'tasker' | 'poster';
  reviewee_id?: number;
  reviewer: PublicUser;
  created_at: string;
  task?: { id: number; title: string } | null;
}

export interface TaskDetail {
  task: TaskCard & {
    description: string;
    poster: PublicUser & UserStats;
    assigned_tasker: PublicUser | null;
    attachments: { id: number; url: string }[];
    completed_at: string | null;
    closed_at: string | null;
    cancelled_at: string | null;
  };
  offers: OfferView[];
  questions: QuestionView[];
  reviews: ReviewView[];
  viewer: {
    signed_in: boolean;
    is_poster: boolean;
    is_tasker: boolean;
    my_offer: { id: number; amount: number; status: OfferStatus } | null;
    can_offer: boolean;
    can_review: boolean;
  };
}

export interface MyOffer {
  offer: { id: number; amount: number; status: OfferStatus; created_at: string };
  task: TaskCard;
  assigned_to_me: boolean;
}

export interface Thread {
  task: { id: number; title: string; status: TaskStatus };
  other: PublicUser | null;
  last_message: { body: string; mine: boolean; created_at: string } | null;
  unread: number;
  updated_at: string;
}

export interface MessageView { id: number; body: string; mine: boolean; read_at: string | null; created_at: string }

export interface Notification {
  id: number;
  task_id: number | null;
  type: string;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

export interface PublicProfile {
  user: PublicUser & { member_since: string };
  profile: UserStats & {
    headline: string | null;
    bio: string | null;
    district: string | null;
    skills: string[];
    phone_verified: boolean;
  };
  tasks_posted: number;
  reviews: ReviewView[];
}

export const DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 'Gampaha', 'Hambantota',
  'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale',
  'Matara', 'Monaragala', 'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura',
  'Trincomalee', 'Vavuniya',
];

export const ACCENT = '#F59E0B';
