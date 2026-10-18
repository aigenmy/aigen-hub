export const COMPANY_TYPES = ['retail', 'fnb', 'services', 'ecommerce', 'education', 'health', 'property', 'travel', 'other'] as const;
export type CompanyType = (typeof COMPANY_TYPES)[number];

export const TIMEZONES = ['Asia/Kuala_Lumpur', 'Asia/Singapore', 'Asia/Jakarta', 'Asia/Bangkok', 'Asia/Hong_Kong'] as const;

export const INVITE_ROLES = ['admin', 'agent', 'viewer'] as const;
