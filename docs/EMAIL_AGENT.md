# Email agent

The agent lives at **Super Admin → Email Agent**. It researches businesses, reads the KadeHub mailbox, sorts mail and writes drafts from real KadeHub data. It only sends what a super admin approved.

It is off until an admin turns it on. Before that it reads nothing and stores nothing.

## How it works

```
Gmail -> poller -> ea_message (one row per Gmail id) -> deterministic triage, in the same transaction
                                                         |
                                                         v
                                   ea_job -> AI classification -> AI draft through read-only tools
                                                                        |
                                                                        v
                                   server validation (one retry) -> human approval -> SendService -> Gmail
```

Outreach joins the same path: a research job finds candidates, the server keeps only addresses it finds printed on the cited page, an admin chooses who to start, and each email in the sequence goes through approval.

| Area | Code |
|---|---|
| Schema and approval triggers | `backend/src/database/migrations-email-agent.ts` |
| Gmail read and send, separate tokens | `backend/src/modules/email-agent/mail/gmail.ts` |
| Message building | `mail/mime.ts` |
| Rules that run with no AI | `triage.ts` |
| Claude calls, budget, cost | `ai.service.ts`, `pipeline.service.ts` |
| Read-only tools | `tools.ts` |
| Draft checks | `validation.ts` |
| Prospect research | `research.service.ts` |
| Human actions | `approval.service.ts` |
| The only code that sends | `send.service.ts` |
| Queue and cron tick | `jobs.service.ts`, `worker.service.ts` |
| Dashboard | `frontend/src/app/super-admin/email-agent`, `frontend/src/components/super-admin/email-agent` |

### Rules enforced in the database

Triggers on `ea_email`, on Postgres and on MySQL/MariaDB:

- States run draft → pending_approval → approved → sending → sent or failed, plus rejected and cancelled. Any other jump is refused.
- `approved` needs a transaction that declares a human actor whose `user` row is an active `SUPER_ADMIN`. The trigger stamps the approver and computes the hash itself, ignoring anything the caller passes.
- Changing the recipient, subject, body or an attachment after approval drops the email back to `pending_approval`.
- `sending` needs the content to still match the pinned hash and the approver to still hold the role.
- Sent content is locked, emails can't be deleted, and `ea_audit_log` refuses UPDATE and DELETE.

**The limit of this.** The app has one database login, so a transaction declares its actor with a session setting. That stops the worker, the AI pipeline, application bugs and ad-hoc SQL, none of which declare a human. It does not stop someone who holds the database password and deliberately sets that value. To close that gap, run the admin API and the worker under separate database roles. `TRUNCATE` also bypasses row triggers, so don't give it to the application role if you add one.

### The send path

`SendService.sendApproved` re-checks the pause, status, hash, approver's current role, suppression and whether the prospect is still active. Then, in one transaction, it takes a slot under the daily limit and claims approved → sending. Double clicks and overlapping workers can't send twice.

| What happens | Result |
|---|---|
| Gmail accepts | Counts as sent. Later bookkeeping errors can't mark it failed. |
| Gmail refuses (4xx) | `failed`, daily slot returned |
| Timeout, 5xx, dropped connection | `failed`, "Outcome unknown", slot kept, not retried |
| Worker dies mid-send | After 10 minutes the sweep looks for the Message-ID in the mailbox. Found: `sent`. Not found: `failed`, "Outcome unknown". Never re-sent automatically. |

A failed email only returns through "Back to approval", which needs a person and a new approval.

### Worker behaviour by state

| State | Reads mail, triage, opt-outs | AI | Sends approved email |
|---|---|---|---|
| Never turned on | No | No | No |
| Paused | Yes | No | No |
| Triage only | Yes | Classification and research only | Yes |
| Drafting | Yes | Yes | Yes |
| Over budget | Yes | No | Yes |

## Models and cost

All three model settings default to `claude-opus-5-5`, editable under Settings. Sorting mail runs at low effort and drafts and research at medium. `claude-haiku-5-5` for sorting and `claude-sonnet-5-5` for drafts are the cheaper options; try them on real mail before relying on them. Server-side refusal fallback (`fallbacks: "default"`) is on for models that support it, and a final refusal goes to a person.

Each call's cost is recorded in `ea_ai_usage` from prices in `ai.service.ts`, and an unlisted model is priced at the highest rate. Update that table when prices change. The budget is checked before every call, so one call in flight can run slightly past it.

## Environment variables

Listed in `backend/.env.example`. Values never reach the browser; Settings only shows ready or missing.

| Name | What it is |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `EMAIL_AGENT_MAILBOX` | The address the agent reads and sends from |
| `GMAIL_OAUTH_CLIENT_ID`, `GMAIL_OAUTH_CLIENT_SECRET` | Google OAuth client |
| `GMAIL_READ_REFRESH_TOKEN` | Refresh token with only `gmail.readonly` |
| `GMAIL_SEND_REFRESH_TOKEN` | Refresh token with only `gmail.send` |
| `EMAIL_AGENT_WORKER_TOKEN` | Cron token, 24+ characters. Shorter counts as not set. |
| `EMAIL_AGENT_UNSUBSCRIBE_SECRET` | Signs unsubscribe links, 24+ characters. Don't rotate it casually: links in sent mail stop working. |
| `EMAIL_AGENT_PUBLIC_API_URL` | Public API base for unsubscribe links, default `https://api.kadehub.com/api` |
| `SUPER_ADMIN_EMAIL`, `SMTP_*` | Where admin alerts go, through the existing notifier |

## Gmail OAuth setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create a project and enable the **Gmail API**.
2. Under **Google Auth Platform → Audience**, choose **Internal** if the mailbox is on Google Workspace. For a personal `@gmail.com` mailbox choose **External** and set the publishing status to **In production**. While an External app is in "Testing", Google expires refresh tokens after 7 days and the agent stops reading mail. Your own unverified app shows a warning screen you can click through, and Google may ask for verification because these are sensitive scopes.
3. Under **Data Access**, add `https://www.googleapis.com/auth/gmail.readonly` and `https://www.googleapis.com/auth/gmail.send`.
4. Under **Clients**, create a **Web application** client with redirect URI `https://developers.google.com/oauthplayground`. Save the id and secret as `GMAIL_OAUTH_CLIENT_ID` and `GMAIL_OAUTH_CLIENT_SECRET`.
5. Open the [OAuth Playground](https://developers.google.com/oauthplayground), click the gear, tick **Use your own OAuth credentials** and enter the client.
6. Authorize **only** `gmail.readonly`, signed in as the mailbox. Exchange the code and save the refresh token as `GMAIL_READ_REFRESH_TOKEN`.
7. Repeat from a clean start with **only** `gmail.send`, and save that token as `GMAIL_SEND_REFRESH_TOKEN`.

Generate the two secrets with `openssl rand -hex 32`.

Add everything to `/home/deploy/AppData/KadeHub/Env/dev.env` on the server. The next deploy applies migration `400_email_agent` automatically at startup.

## Cron

The API is published on port 3001 of the deploy host (`10.1.2.14`). Save the worker token in a file only the deploy user can read:

```bash
install -m 600 /dev/null /home/deploy/AppData/KadeHub/Env/email-agent-worker-token
# put EMAIL_AGENT_WORKER_TOKEN's value in that file, then: crontab -e
```

```cron
* * * * * curl -fsS -m 300 -o /dev/null -X POST -H "Authorization: Bearer $(cat /home/deploy/AppData/KadeHub/Env/email-agent-worker-token)" http://127.0.0.1:3001/api/email-agent/worker/tick
```

Overlapping runs are safe. Analytics shows the last run and warns if it's over 5 minutes old.

## Rollout

Before step 1, write knowledge base articles for anything you want the agent to be able to say, and list approved claims in Settings (for example the exact wording of your free trial). Without these it can only quote your plans and say the team will check.

Also send a test message from the mailbox by hand and confirm SPF and DKIM pass for its domain.

1. **Triage only.** Settings → set the daily limit to 3 → Turn on. Watch the Inbox and Escalations for a few days. Compare how mail was sorted with how you would have sorted it, especially opt-outs.
2. **Drafting with approval.** Stage → Drafting. Read every draft. Reject with notes when one is wrong: the AI reads recent notes before writing again.
3. **Daily cap of 3 for the first week.** Keep it at 3, starting outreach with a few prospects at a time. Watch bounce and opt-out rates in Analytics. Raise the cap slowly, up to the default of 20 or whatever you decide.

**Stop at any time** with Pause now in Settings.

### Bulk mail rules

Cold email carries legal and deliverability risk. Check the rules that apply where you and your recipients are, including data protection and marketing law. Every promotional email carries an opt-out line, says where the address was found, and has `List-Unsubscribe` with one-click. Keep volume low from a mailbox you care about, because spam complaints hurt its reputation for all your mail. A separate sending domain is worth considering before raising volume.

## API

Admin routes are under `/api/super-admin/email-agent`, need a super admin JWT, and the role is re-read from the database on each request.

| Route | Purpose |
|---|---|
| `GET inbox`, `GET escalations`, `GET messages/:id`, `POST messages/:id/resolve` | Mail |
| `GET emails?status=`, `GET emails/pending-count`, `GET emails/:id` | Approval queue. Detail includes `content_hash`. |
| `PATCH emails/:id` | Edit; voids approval |
| `POST emails/:id/approve` | Body `{ content_hash, acknowledge_warnings?, note? }`. 409 if the email changed since it was read. |
| `POST emails/:id/reject` | Body `{ note, redraft? }` |
| `POST emails/:id/cancel`, `POST emails/:id/reopen` | Stop an email; return a failed one to approval |
| `POST`, `GET`, `DELETE emails/:id/attachments[/:attachmentId]` | Multipart field `file`: 5 MB each, 10 MB total, 5 files; PDF, PNG, JPG, TXT, CSV, DOCX, XLSX |
| `GET`, `POST suppressions`, `DELETE suppressions/:id` | Suppression list |
| `GET jobs/failed`, `POST jobs/:id/retry` | Dead-lettered jobs |
| `GET`, `POST knowledge`, `PUT knowledge/:id` | Knowledge base |
| `GET`, `POST campaigns`, `POST campaigns/:id/research` | Research |
| `GET`, `POST prospects`, `POST prospects/start`, `PATCH prospects/:id` | Prospects |
| `GET`, `PATCH settings`, `GET analytics`, `GET audit` | Settings, analytics, audit trail |

Others:

- `POST /api/email-agent/worker/tick` with `Authorization: Bearer <worker token>`.
- `GET` and `POST /api/email-agent/unsubscribe?t=<signed token>`. Public. GET only asks, because mail scanners follow links. POST acts, and is also the RFC 8058 one-click target.

## Tests

`npm test` in `backend` runs everything. Integration tests skip without a database, and refuse any database whose name doesn't contain `test`, because they wipe the `ea_` tables.

```bash
docker run -d --name ea-pg -e POSTGRES_HOST_AUTH_METHOD=trust -e POSTGRES_DB=ea_test -p 55432:5432 postgres:17
docker run -d --name ea-my -e MYSQL_ALLOW_EMPTY_PASSWORD=1 -e MYSQL_DATABASE=ea_test -p 53307:3306 mariadb:10.4

EA_TEST_PG_URL=postgresql://postgres@127.0.0.1:55432/ea_test \
EA_TEST_MYSQL_URL=mysql://root@127.0.0.1:53307/ea_test \
npx jest src/modules/email-agent --runInBand --testTimeout=30000
```

Gmail and Claude are always fakes in the tests, so they can't send mail or spend money.

## Roll back

Set **Pause now** first. `rollbackMigration(ds, '400_email_agent')` in `run-migrations.ts` drops every `ea_` table and trigger, which permanently deletes all agent data including the suppression list. Export `ea_suppression` first. Removing the module from `app.module.ts` alone leaves the data in place.
