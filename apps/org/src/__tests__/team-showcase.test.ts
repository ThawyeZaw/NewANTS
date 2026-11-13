import { describe, expect, it } from 'vitest';
import { summarizeTutorSchedule } from '@ants/ui';
import { OrgTeamMemberDetailView } from '../components/team/views/OrgTeamMemberDetailView';
import { OrgTeamShowcaseView } from '../components/team/views/OrgTeamShowcaseView';
import { TelegramInquiryModalView } from '../components/team/views/TelegramInquiryModalView';
import { TutorAvailabilityDrawerView } from '../components/team/views/TutorAvailabilityDrawerView';
import { computeReedSolomonEcc, encodeQrMatrix } from '../lib/qr';
import {
  countTeamMembersByRole,
  filterTeamMembers,
  findTeamMemberByUsername,
} from '../lib/showcase';
import { MOCK_ORG_TEAM_MEMBERS } from '../mocks/showcase-team.mock';

describe('@ants/org [ZYY-2.2] & [ZYY-2.3] Team Showcase, Tutor Schedule & QR Modal', () => {
  it('exports all Team & Tutor availability views', () => {
    expect(OrgTeamShowcaseView).toBeDefined();
    expect(OrgTeamMemberDetailView).toBeDefined();
    expect(TutorAvailabilityDrawerView).toBeDefined();
    expect(TelegramInquiryModalView).toBeDefined();
  });

  it('filters members cleanly by role category, curriculum board, and search query', () => {
    const counts = countTeamMembersByRole(MOCK_ORG_TEAM_MEMBERS);
    expect(counts.founder).toBeGreaterThanOrEqual(2);
    expect(counts.tutor).toBeGreaterThanOrEqual(3);
    expect(counts.contributor).toBeGreaterThanOrEqual(2);
    expect(counts.alumni).toBeGreaterThanOrEqual(1);

    const founders = filterTeamMembers(MOCK_ORG_TEAM_MEMBERS, {
      roleFilter: 'founder',
      boardFilter: 'all',
      searchQuery: '',
    });
    expect(founders.every((m) => m.isFounder)).toBe(true);

    const wmaResults = filterTeamMembers(MOCK_ORG_TEAM_MEMBERS, {
      roleFilter: 'tutor',
      boardFilter: 'Edexcel IAL',
      searchQuery: 'WMA11',
    });
    expect(wmaResults.length).toBeGreaterThanOrEqual(1);
    expect(wmaResults.some((m) => m.username === 'zaylynnhtet')).toBe(true);
  });

  it('resolves team profiles by handle including optional @ or URL encoding', () => {
    expect(findTeamMemberByUsername(MOCK_ORG_TEAM_MEMBERS, 'thawyezaw')?.isFounder).toBe(true);
    expect(findTeamMemberByUsername(MOCK_ORG_TEAM_MEMBERS, '@zaylynnhtet')?.name).toContain('Zay');
    expect(findTeamMemberByUsername(MOCK_ORG_TEAM_MEMBERS, '%40aungkhant')?.isTutor).toBe(true);
    expect(findTeamMemberByUsername(MOCK_ORG_TEAM_MEMBERS, 'nobody')).toBeNull();
  });

  it('populates real open & flexible weekly hours for every listed tutor', () => {
    const tutors = MOCK_ORG_TEAM_MEMBERS.filter((m) => m.isTutor);
    for (const tutor of tutors) {
      const summary = summarizeTutorSchedule(tutor.weeklySchedule);
      expect(summary.availableHours + summary.flexibleHours).toBeGreaterThan(0);
      expect(tutor.tutorTelegramUsername).toMatch(/^@/);
    }
  });

  it('encodes valid, deterministic ISO QR matrices with finder patterns and RS ECC', () => {
    const url = 'https://t.me/thorin_ants?text=Hi%20Thaw%20Ye%20Zaw';
    const first = encodeQrMatrix(url);
    const second = encodeQrMatrix(url);

    expect(first.modules).toEqual(second.modules);
    expect(first.size).toBeGreaterThanOrEqual(21);
    expect(first.modules.length).toBe(first.size);
    expect(first.modules.every((row) => row.length === first.size)).toBe(true);

    // Verify 7x7 corner finder outer ring corners + center module + mandatory dark module
    const s = first.size;
    expect(first.modules[0]?.[0]).toBe(true);
    expect(first.modules[3]?.[3]).toBe(true);
    expect(first.modules[0]?.[s - 1]).toBe(true);
    expect(first.modules[s - 1]?.[0]).toBe(true);
    expect(first.modules[s - 8]?.[8]).toBe(true);

    // Verify separator border around top-left finder is strictly light (`false`)
    for (let i = 0; i <= 7; i += 1) {
      expect(first.modules[7]?.[i]).toBe(false);
      expect(first.modules[i]?.[7]).toBe(false);
    }

    // Long inquiry URL scales smoothly up to higher QR versions without crashing
    const longUrl = `https://t.me/zay_ants?text=${encodeURIComponent(
      'Hi Zay Lynn Htet, I saw your Sat 09:00-10:00 (available) slot for 9702 AS Physics and would love to discuss past paper practice.'
    )}`;
    const largeQr = encodeQrMatrix(longUrl);
    expect(largeQr.version).toBeGreaterThan(first.version);
    expect(largeQr.truncated).toBe(false);

    // Confirm Reed-Solomon remainder of [data || ecc] evaluates cleanly to zero
    const sampleData = new Uint8Array([0x40, 0xd2, 0x75, 0x47, 0x76, 0x17, 0x32]);
    const ecc = computeReedSolomonEcc(sampleData, 7);
    expect(ecc.length).toBe(7);
    const combined = new Uint8Array(sampleData.length + ecc.length);
    combined.set(sampleData, 0);
    combined.set(ecc, sampleData.length);
    const zeroSyndrome = computeReedSolomonEcc(combined, 7);
    expect(Array.from(zeroSyndrome)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});

