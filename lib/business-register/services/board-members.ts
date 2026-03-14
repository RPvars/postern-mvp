import { companyService } from './company';
import type { BoardMember } from '../types/api-responses';

export class BoardMemberService {
  async getBoardMembers(registrationNumber: string): Promise<BoardMember[]> {
    return companyService.getBoardMembers(registrationNumber);
  }

  async getCurrentBoardMembers(registrationNumber: string): Promise<BoardMember[]> {
    const allMembers = await this.getBoardMembers(registrationNumber);
    return allMembers.filter(member => !member.isHistorical);
  }

  async getHistoricalBoardMembers(registrationNumber: string): Promise<BoardMember[]> {
    const allMembers = await this.getBoardMembers(registrationNumber);
    return allMembers.filter(member => member.isHistorical);
  }
}

export const boardMemberService = new BoardMemberService();
