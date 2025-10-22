# Live Updates (SSE)

Live tournament data streams in real time via Server‑Sent Events (SSE).

- Stream endpoint: `/api/tournaments/:id/stream`
- Events: `snapshot` (full live state), `update` (typed updates with optional `live` snapshot)
- Triggers: match updates, tournament actions, team check‑in, match generation, stats updates
- Client subscriber: `src/frontend/src/pages/TournamentManage.tsx`

Notes:
- SSE transport is in‑memory; to scale across multiple backend instances, back `EventBus` with a pub/sub (e.g., Redis) and fan out events.
- 30s polling remains as a safety fallback when the stream disconnects.

Example (browser console):

```js
const es = new EventSource('/api/tournaments/<id>/stream');
es.addEventListener('snapshot', e => console.log('snapshot', JSON.parse(e.data)));
es.addEventListener('update', e => console.log('update', JSON.parse(e.data)));
```

