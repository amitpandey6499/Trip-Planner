/**
 * Part 18 — /api/docs: a readable page made from the OpenAPI description (no scripts, works under the
 * Content Security Policy, no extra packages). For "try it out", load /api/openapi.json into Swagger Editor or Postman.
 */

const esc = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const resolve = (spec, schema) => {
  if (!schema?.$ref) return schema ?? {};
  const name = schema.$ref.split('/').pop();
  return spec.components.schemas[name] ?? {};
};

/** "string (2–80 chars)", "integer ≥ 1", "one of: a, b", "array of objects" … */
const typeOf = (schema = {}) => {
  if (schema.enum) return `one of: ${schema.enum.map((v) => (v === null ? 'null' : v)).join(', ')}`;
  if (schema.const !== undefined) return `always ${JSON.stringify(schema.const)}`;
  if (schema.anyOf || schema.oneOf) {
    const parts = (schema.anyOf ?? schema.oneOf).map(typeOf).filter((t) => t !== 'null');
    return [...new Set(parts)].join(' or ') + ((schema.anyOf ?? schema.oneOf).some((s) => s.type === 'null') ? ' (or null)' : '');
  }
  if (schema.type === 'array') return `array of ${schema.items ? typeOf(schema.items) : 'values'}`.replace(/of object$/, 'of objects');
  return Array.isArray(schema.type) ? schema.type.join(' / ') : (schema.type ?? 'any');
};

const limits = (s = {}) => {
  const notes = [];
  if (s.minLength !== undefined || s.maxLength !== undefined) notes.push(`${s.minLength ?? 0}–${s.maxLength ?? '…'} characters`);
  if (s.minimum !== undefined || s.maximum !== undefined) notes.push(`${s.minimum ?? '…'} to ${s.maximum ?? '…'}`);
  if (s.exclusiveMinimum !== undefined) notes.push(`more than ${s.exclusiveMinimum}`);
  if (s.minItems !== undefined || s.maxItems !== undefined) notes.push(`${s.minItems ?? 0}–${s.maxItems ?? '…'} items`);
  if (s.pattern) notes.push(`pattern <code>${esc(s.pattern)}</code>`);
  for (const part of s.allOf ?? []) if (part.pattern) notes.push(`must match <code>${esc(part.pattern)}</code>`);
  if (s.format) notes.push(esc(s.format));
  if (s.default !== undefined) notes.push(`default <code>${esc(JSON.stringify(s.default))}</code>`);
  if (s.description) notes.push(esc(s.description));
  return notes.join(' · ');
};

const fieldTable = (schema) => {
  const props = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const rows = Object.entries(props)
    .map(
      ([name, s]) =>
        `<tr><td><code>${esc(name)}</code>${required.has(name) ? ' <span class="req">required</span>' : ''}</td><td>${esc(typeOf(s))}</td><td>${limits(s)}</td></tr>`,
    )
    .join('');
  return rows ? `<table><thead><tr><th>Field</th><th>Type</th><th>Rules</th></tr></thead><tbody>${rows}</tbody></table>` : '';
};

const parameterTable = (params) => {
  const rows = params
    .map(
      (p) =>
        `<tr><td><code>${esc(p.name)}</code>${p.required ? ' <span class="req">required</span>' : ''}</td><td>${esc(p.in)}</td><td>${esc(typeOf(p.schema))}</td><td>${limits({ ...p.schema, description: p.description ?? p.schema?.description })}</td></tr>`,
    )
    .join('');
  return `<table><thead><tr><th>Parameter</th><th>In</th><th>Type</th><th>Rules</th></tr></thead><tbody>${rows}</tbody></table>`;
};

const authBadge = (op) => {
  if (op.description?.includes('Admins only')) return '<span class="badge admin">admin</span>';
  if (op.security?.length === 1 && op.security[0].cookieAuth) return '<span class="badge login">login</span>';
  if (op.security?.length === 2) return '<span class="badge optional">login optional</span>';
  return '<span class="badge public">public</span>';
};

const operationHtml = (spec, method, path, op) => {
  const body = op.requestBody?.content?.['application/json']?.schema;
  const bodySchema = body ? resolve(spec, body) : null;
  const responses = Object.entries(op.responses ?? {})
    .map(([code, r]) => `<li><code>${esc(code)}</code> ${esc(resolveResponse(spec, r).description ?? '')}</li>`)
    .join('');
  return `<details id="${esc(op.operationId)}">
  <summary><span class="method ${method}">${method.toUpperCase()}</span><code class="path">/api${esc(path)}</code><span class="summary">${esc(op.summary)}</span>${authBadge(op)}</summary>
  <div class="op">
    ${op.description ? `<p>${esc(op.description).replace(/`([^`]+)`/g, '<code>$1</code>')}</p>` : ''}
    ${op.parameters?.length ? `<h4>Parameters</h4>${parameterTable(op.parameters)}` : ''}
    ${bodySchema ? `<h4>Request body <span class="muted">(JSON — ${esc(body.$ref?.split('/').pop() ?? 'object')})</span></h4>${fieldTable(bodySchema)}<details class="raw"><summary>JSON schema</summary><pre>${esc(JSON.stringify(bodySchema, null, 2))}</pre></details>` : ''}
    <h4>Responses</h4><ul class="responses">${responses}</ul>
  </div>
</details>`;
};

const resolveResponse = (spec, r) => (r.$ref ? spec.components.responses[r.$ref.split('/').pop()] : r);

export const renderDocsPage = (spec) => {
  const byTag = new Map(spec.tags.map((t) => [t.name, { ...t, ops: [] }]));
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const [method, op] of Object.entries(methods)) byTag.get(op.tags[0]).ops.push(operationHtml(spec, method, path, op));
  }
  const count = [...byTag.values()].reduce((n, t) => n + t.ops.length, 0);
  const nav = [...byTag.values()].map((t) => `<a href="#tag-${esc(t.name.replace(/\s+/g, '-'))}">${esc(t.name)} <span class="muted">${t.ops.length}</span></a>`).join('');
  const sections = [...byTag.values()]
    .map((t) => `<section id="tag-${esc(t.name.replace(/\s+/g, '-'))}"><h2>${esc(t.name)}</h2><p class="muted">${esc(t.description)}</p>${t.ops.join('')}</section>`)
    .join('');
  const intro = esc(spec.info.description).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\n\n/g, '</p><p>');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="icon" href="data:," />
<title>${esc(spec.info.title)} — documentation</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#f8fafc; --blue:#2563eb; }
  * { box-sizing: border-box; }
  body { margin:0; font: 15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; color:var(--ink); background:var(--bg); }
  header { background:#fff; border-bottom:1px solid var(--line); padding:20px 16px; }
  header .wrap, main { max-width:1040px; margin:0 auto; }
  h1 { margin:0 0 4px; font-size:24px; } h2 { margin:32px 0 2px; font-size:19px; } h4 { margin:14px 0 6px; font-size:13px; text-transform:uppercase; letter-spacing:.04em; color:var(--muted); }
  p { margin:6px 0; } .muted { color:var(--muted); font-weight:400; }
  main { padding:8px 16px 48px; }
  nav { display:flex; flex-wrap:wrap; gap:6px; margin-top:12px; }
  nav a { font-size:13px; text-decoration:none; color:var(--ink); background:var(--bg); border:1px solid var(--line); border-radius:999px; padding:3px 10px; }
  a { color:var(--blue); }
  code { font: 13px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background:#f1f5f9; border-radius:4px; padding:1px 4px; }
  details { background:#fff; border:1px solid var(--line); border-radius:10px; margin:8px 0; }
  details > summary { cursor:pointer; list-style:none; display:flex; flex-wrap:wrap; align-items:center; gap:8px; padding:10px 12px; }
  details > summary::-webkit-details-marker { display:none; }
  details[open] > summary { border-bottom:1px solid var(--line); }
  .op { padding:4px 14px 12px; overflow-x:auto; }
  .method { font: 700 11px/1 ui-monospace, monospace; color:#fff; border-radius:5px; padding:5px 7px; min-width:58px; text-align:center; }
  .get { background:#2563eb; } .post { background:#059669; } .put { background:#d97706; } .delete { background:#dc2626; }
  .path { background:none; padding:0; font-weight:600; }
  .summary { color:var(--muted); flex:1 1 220px; }
  .badge { font-size:11px; font-weight:600; border-radius:999px; padding:2px 8px; border:1px solid var(--line); }
  .login { background:#eff6ff; color:#1d4ed8; } .admin { background:#fef2f2; color:#b91c1c; } .optional { background:#f8fafc; color:#475569; } .public { background:#f0fdf4; color:#15803d; }
  table { border-collapse:collapse; width:100%; font-size:13px; }
  th, td { text-align:left; border-bottom:1px solid var(--line); padding:6px 8px; vertical-align:top; }
  th { color:var(--muted); font-weight:600; }
  .req { font-size:10px; font-weight:700; color:#b91c1c; text-transform:uppercase; }
  .raw { border:none; background:none; margin:6px 0 0; } .raw > summary { padding:4px 0; color:var(--blue); font-size:13px; } .raw[open] > summary { border:none; }
  pre { background:#0f172a; color:#e2e8f0; padding:12px; border-radius:8px; overflow:auto; font-size:12px; max-height:420px; }
  ul.responses { margin:4px 0; padding-left:18px; }
</style>
</head>
<body>
<header><div class="wrap">
  <h1>${esc(spec.info.title)} <span class="muted">v${esc(spec.info.version)}</span></h1>
  <p>${intro}</p>
  <p class="muted">${count} endpoints · OpenAPI ${esc(spec.openapi)} · <a href="/api/openapi.json">openapi.json</a> (open it in Swagger Editor or Postman to send requests)</p>
  <nav>${nav}</nav>
</div></header>
<main>${sections}</main>
</body>
</html>`;
};
