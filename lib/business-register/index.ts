// Business Register API Service Layer
// Entry point for all Business Register integrations

export { companyService } from './services/company';
export { boardMemberService } from './services/board-members';
export { searchService } from './services/search';

export { businessRegisterConfig } from './config';

export type {
  Company,
  BoardMember,
  CompanyApiResponse,
  BoardMemberApiResponse,
  SearchApiResponse,
} from './types/api-responses';
