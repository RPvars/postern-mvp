import { httpClient } from '../client/http';
import { boardMemberMapper } from '../mappers/company';
import type { BoardMemberApiResponse, BoardMember } from '../types/api-responses';

export class BoardMemberService {
  async getBoardMembers(registrationNumber: string, companyId: string): Promise<BoardMember[]> {
    try {
      const apiResponse = await httpClient.request<BoardMemberApiResponse[]>(
        `/companies/${registrationNumber}/board-members`
      );

      return apiResponse.map(bm => boardMemberMapper.toInternalFormat(bm, companyId));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch board members:', error);
      }
      return [];
    }
  }

  async getCurrentBoardMembers(registrationNumber: string, companyId: string): Promise<BoardMember[]> {
    const allMembers = await this.getBoardMembers(registrationNumber, companyId);
    return allMembers.filter(member => !member.isHistorical);
  }

  async getHistoricalBoardMembers(registrationNumber: string, companyId: string): Promise<BoardMember[]> {
    const allMembers = await this.getBoardMembers(registrationNumber, companyId);
    return allMembers.filter(member => member.isHistorical);
  }
}

export const boardMemberService = new BoardMemberService();
