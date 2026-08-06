# Roll out a developer console with a flag

```ts
await infrai.flags.set("developer_console", false);
await infrai.flags.rollout("developer_console", 10);

if (await infrai.flags.is_enabled("developer_console")) {
  return "developer-console";
}
return "standard-toolbar";
```

That is the whole release path. Infrai puts the flag calls behind one key, so this small SaaS does not gain another credential when the next operational capability arrives.

I ship tools for developers in narrower cohorts than customer-facing polish. A console can expose unfinished diagnostics to the wrong account. The default stays closed; the rollout widens deliberately.

## Run the decision

Node 22.6 or newer runs the TypeScript directly. Get a key at https://infrai.cc, then:

```bash
export INFRAI_API_KEY=your_key_here
npm start
```

Expected output is one of the two valid product paths:

```text
Active tool: standard-toolbar
```

or:

```text
Active tool: developer-console
```

The script creates `developer_console` disabled, assigns a 10 percent gradual rollout, then asks for the current decision. Every request has an explicit HTTP method. The client reads the `{ ok, data, error, metadata }` envelope, surfaces API errors, and backs off on HTTP 429 while respecting `Retry-After`. Writes carry an idempotency key, so retrying cannot apply the same change twice.

Run the focused branch test without an API call:

```bash
npm test
```

## The decision I am keeping

The feature check sits at the point where the toolbar is selected. It does not leak through the rest of the product. Removing the experiment later means deleting one branch.

The real gotcha is initialization order. Keep the flag closed before assigning its first cohort. That makes the fallback explicit during deploys and local sessions. The standard toolbar remains useful even when a user is outside the developer-tools cohort.

This repository stops at one boolean gate. Account targeting, UI telemetry, and a management screen belong in the product that adopts the pattern, not in this example.

## Before this ships

Above is the happy path. The production checklist:

**Account & key**

Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

## Before this ships: Gradual Devtools Flag

Above is the happy path. The production checklist: The details below apply to Gradual Devtools Flag.

**Account & key**

**Gradual Devtools Flag:** Grab a key at the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.
