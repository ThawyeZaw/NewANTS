import type { Metadata } from 'next';
import React from 'react';
import { OrgTeamMemberDetailView } from '../../../../components/team/views/OrgTeamMemberDetailView';
import { findTeamMemberByUsername } from '../../../../lib/showcase';
import { MOCK_ORG_TEAM_MEMBERS } from '../../../../mocks/showcase-team.mock';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const member = findTeamMemberByUsername(MOCK_ORG_TEAM_MEMBERS, username);
  if (!member) {
    return {
      title: 'Team Member Profile | The ANTs',
    };
  }
  return {
    title: `${member.name} (@${member.username}) | The ANTs`,
    description: member.headline,
  };
}

export default async function OrgTeamMemberPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return <OrgTeamMemberDetailView username={username} />;
}

