import type { Profile } from '@/app/types/database';

export type TeacherSubscriptionPlan = 'free' | 'plus' | 'pro';

export function normalizeTeacherSubscriptionPlan(value?: string | null): TeacherSubscriptionPlan {
  return value === 'plus' || value === 'pro' ? value : 'free';
}

export const TEACHER_SUBSCRIPTION_LIMITS = {
  free: {
    classes: 1,
    students: 35,
  },
  plus: {
    classes: 3,
    students: 100,
  },
  pro: {
    classes: Infinity,
    students: Infinity,
  },
} as const;

export function getTeacherSubscriptionPlan(profile?: Pick<Profile, 'account_type' | 'plan'> | null): TeacherSubscriptionPlan {
  if (!profile || profile.account_type !== 'teacher') {
    return 'free';
  }

  return normalizeTeacherSubscriptionPlan(profile.plan);
}

export function getTeacherSubscriptionLabel(plan: TeacherSubscriptionPlan) {
  switch (plan) {
    case 'plus':
      return 'Plus';
    case 'pro':
      return 'Pro';
    default:
      return 'Free';
  }
}

export function getTeacherSubscriptionSummary(plan: TeacherSubscriptionPlan) {
  switch (plan) {
    case 'plus':
      return '3 classes and up to 100 students';
    case 'pro':
      return 'Unlimited classes and unlimited students';
    default:
      return '1 class and up to 35 students';
  }
}

export function getTeacherSubscriptionPrice(plan: TeacherSubscriptionPlan) {
  switch (plan) {
    case 'plus':
      return '$10';
    case 'pro':
      return '$15';
    default:
      return '$0';
  }
}

export function getTeacherClassLimit(plan: TeacherSubscriptionPlan) {
  return TEACHER_SUBSCRIPTION_LIMITS[plan].classes;
}

export function getTeacherStudentLimit(plan: TeacherSubscriptionPlan) {
  return TEACHER_SUBSCRIPTION_LIMITS[plan].students;
}
