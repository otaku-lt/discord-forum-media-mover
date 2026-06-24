# Discord Forum Media Mover

A Node.js Discord bot that moves photos and videos from forum threads to a destination channel. It runs once, processes all eligible threads, and exits.

## Features

- Copies media attachments (images and videos) from forum threads to destination threads.
- Skips single-post threads (only the starter post, no replies).
- Skips future events based on the date parsed from the thread name.
- Excludes the starter post's media in multi-post threads; only reply media is posted.
- Processes threads in chronological order by event date.
- Incremental updates: reruns find existing destination threads and append only new media.
- Persists progress in a YAML state file.
- Runs locally or via GitHub Actions.

## Requirements

- Node.js `>= 20.6.0` (the script uses `process.loadEnvFile()`).
- A Discord bot token with access to the source forum and destination channel.

## Installation

```bash
npm install
```

## Configuration

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DISCORD_TOKEN` | Yes | Bot token. |
| `SOURCE_FORUM_ID` | Yes | ID of the source forum channel. |
| `DESTINATION_CHANNEL_ID` | Yes | ID of the destination text channel. |
| `EXCLUDED_THREAD_IDS` | No | Comma-separated list of source thread IDs to always skip. |
| `PROCESSED_THREADS_FILE` | No | Path to the state file. Defaults to `./processed-threads.yml`. |

### Date formats

The bot parses the event date from the thread name to sort threads and skip future events. Supported formats:

- ISO: `2025-01-15 Event Name`
- European: `Event Name 15.02.2025`

Threads without a parseable date are processed after dated threads, sorted alphabetically.

## Usage

```bash
npm start
```

Or directly:

```bash
node index.js
```

The script loads `.env` automatically, logs in, processes all eligible threads, and exits.

## How it works

1. Fetches all active and archived threads from the source forum.
2. Sorts them chronologically by event date.
3. For each thread:
   - Skips excluded, single-post, and future-event threads.
   - Fetches all messages.
   - Skips the starter post (the message whose ID equals the thread ID).
   - Filters out messages already recorded in the state file.
   - Finds or creates the destination thread.
   - Posts the new media as markdown links with a "Jump to original" header.
   - Records the posted source message IDs and destination thread ID.

## State file

The state file (`processed-threads.yml` by default) tracks which source messages have already been posted and where. This makes reruns incremental.

Example:

```yaml
threads:
  source-thread-id:
    destinationThreadId: 'destination-thread-id'
    postedMessageIds:
      - 'source-message-id-1'
      - 'source-message-id-2'
```

If you delete the state file, the bot will not know which destination threads were already created and may create duplicates. The bot can match existing destination threads by name for legacy flat-list state files, but keeping the state file intact is recommended.

## GitHub Actions

The repository includes `.github/workflows/discord-forum-media-mover.yml`. Configure the following secrets in your repository settings:

- `DISCORD_TOKEN`
- `SOURCE_FORUM_ID`
- `DESTINATION_CHANNEL_ID`
- `EXCLUDED_THREAD_IDS` (optional)

The workflow only runs on `workflow_dispatch` (manual trigger). After a successful run, it commits any changes to `processed-threads.yml` back to the repository so the next run is incremental.

## Testing

```bash
npm test
```

Tests are written with Node.js's built-in test runner (`node --test`).

## Notes

- Edits to the starter post or thread title do not create new messages, so they do not affect the single-post check or incremental updates.
- If a destination thread is deleted, the bot detects it on the next run, resets the state, and creates a replacement thread.
- The bot only processes new media since the last run. It does not delete or modify previously posted messages.
