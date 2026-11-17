# Community — pipo_Study

Status: **Approved** (2026-11-17). Implements audit §12: keep the feed, add report handling.

- A learner who reports a post stops seeing it at once.
- **3 reports** from different learners (since the last review) hide a post from the feed
  (`hide_reported_post` trigger). The author still sees it, marked "under review".
- Moderators (`moderators` table, maintained by the service role in Supabase Studio) review at
  `/moderation`: **Restore** (back in the feed, open reports cleared) or **Remove** (deleted).
- No XP or Coins for likes or posts (farming risk, pillar P2).

To make someone a moderator: Supabase Studio → SQL:
`insert into public.moderators (user_id) values ('<auth user id>');`
