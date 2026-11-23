# MYSTERY VERSE — Channel Growth & Monetization Plan
Updated: 2026-11-23

## Baseline (owner-provided YouTube Studio screenshot)
- Subscribers: 1
- Views: 1.6K in the last 28 days
- Watch time: 3.4 hours in the last 28 days
- Visible recent uploads: two horror/mystery videos and one unrelated "Building a Magical Mountain City" video.
These dashboard totals are not the same as YPP-eligible public watch hours or eligible Shorts views. Verify the Earn tab for those exact counters.

## Positioning
Primary niche: Indonesian mystery documentary — documented true cases, folklore/urban legends, unexplained places and historical mysteries.
Every episode must be clearly framed as one of:
- Documented case: distinguish confirmed facts, investigative theories and unknowns; cite credible sources in the description.
- Folklore/legend: label as folklore or oral tradition, not verified fact.
- Fictional horror: clearly label as fiction/reconstruction; do not imply it is a real case.

Do not publish unrelated AI fantasy/building videos on this channel going forward. Do not mass-delete existing uploads based only on this snapshot; review each video's audience, traffic and channel identity first.

## Recommended sustainable publishing cadence
- 1 original long-form episode per week (initial target 8–12 minutes; extend to 12–20 minutes only when research and story depth support it).
- 4 Shorts per week, each with a distinct hook and a meaningful narrative arc.
- Each long-form episode can support 2–3 Shorts, but Shorts must be re-edited with their own opening and conclusion, not simply chopped fragments.
- Keep a consistent brand intro/outro, but ensure the main story, visuals, pacing, and commentary are materially different for every episode.

## Editorial quality gate before rendering/publishing
1. Topic and title describe the same actual story.
2. Research notes include at least two reliable sources for documented cases, with publication dates and source URLs.
3. Separate confirmed facts from speculation; no invented quotes, evidence, dates or claims.
4. Original Indonesian narration and meaningful analysis/context.
5. Visuals are licensed, generated for the episode, or otherwise rights-cleared; do not use another creator's footage without a valid basis.
6. Audio is clear, no unwanted echo; narration voice/rate remains the established channel choice.
7. Captions are synchronized and checked; thumbnail/title accurately represent the episode.
8. Review advertiser suitability and sensitive-event treatment.
9. Owner approves the final MP4, title, thumbnail and visibility before upload.

## Automation status and guardrails
- Existing Shorts render pipeline remains 9:16, 1080x1920, 30 fps, Edge TTS ArdiNeural at -10%, word-boundary captions, branded intro and watermark.
- The generator currently contains one authored Setagaya episode only. It now rejects a different topic rather than outputting the Setagaya story under a false title.
- GitHub Actions now runs only on manual dispatch. Pushes to source files no longer trigger an accidental duplicate video build.
- The image step still requires GitHub Actions secret `POLLINATIONS_API_KEY`. Never commit this key.
- Long-form rendering is not implemented yet.
- YouTube upload/scheduling is not implemented yet. Add only after the channel owner authorizes official YouTube OAuth; begin with private uploads and manual review.
- Do not enable a schedule that republishes the same episode or auto-publishes unreviewed AI output.

## Growth metrics to review weekly
Track by format and episode:
- Impressions and click-through rate (long-form)
- Viewed vs swiped away (Shorts)
- Average view duration and average percentage viewed
- First 30-second retention and retention dips
- Subscribers gained per 1,000 views
- Returning viewers and traffic sources
- Comments that reveal viewer interest

Make one controlled change at a time (hook, title/thumbnail, pacing, or topic), then compare a group of comparable uploads. Do not judge a format from a single upload.

## YPP targets (verify current Earn tab)
Expanded YPP in eligible regions: 500 subscribers, 3 public uploads in the last 90 days, plus 3,000 valid public watch hours in the last 12 months OR 3 million valid public Shorts views in the last 90 days.
Ad revenue sharing: 1,000 subscribers plus 4,000 valid public watch hours in the last 12 months OR 10 million valid public Shorts views in the last 90 days.
Shorts-feed watch time does not count toward the 4,000-hour long-form threshold. Other eligibility, policy, account security and AdSense requirements also apply.

## Immediate next owner actions
1. Open YouTube Studio > Earn and share a screenshot of the exact eligibility counters.
2. Confirm that `POLLINATIONS_API_KEY` exists in GitHub Actions Secrets (never paste the key into chat).
3. Confirm channel About text and whether the unrelated fantasy video is intentionally part of the channel.
4. Approve the first new episode topic before producing a new episode package.
