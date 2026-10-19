# AI Solo RPG — Working Plan

Status: MVP in progress. Milestones and acceptance criteria remain open.

## Current workflow

1. Build a runnable UI mockup covering all MVP menus and features visually. Write deployable, reusable application code even when backend integrations are absent; this is an ongoing implementation rule.
2. Once the mockup is mostly final, derive a dedicated UI design document from it and use that document as the reference for subsequent implementation.
3. Implement the MVP while developing a future feature list and milestone guide.

Follow standard Node/Electron security practices, including renderer isolation and narrowly scoped privileged interfaces. A full security audit is required before leaving the MVP phase.

Default model IDs are `gpt-6.1-sol` (high) and `gpt-6.1-luna` (low). Per the project requirements, these use the same endpoint and request variables as `gpt-5.6-xyz`; integration behavior will be checked when wiring the API.

## Implementation and distribution

- Use Electron and plain JavaScript. Favor readable HTML/CSS/JavaScript without React or TypeScript, so the code remains easy for the maintainer to revisit.
- Initially prioritize running from source through npm scripts such as `npm run start` and `npm run dev`. Dedicated Linux and Windows builds come later.
- The project will be open source under the Unlicense. Add the license file when scaffolding the project.
- Use project-local `saves` and `.env` paths for the initial source-run application. Storage paths for future packaged builds remain to be specified.

## Product vision

A clean Electron desktop application for managing and playing AI-led, choice-based solo text RPG adventures. Players bring their own API keys.

The experience is approximately 90% AI-led. The player specifies the kind of story they want, and the AI develops the setting and leads the adventure. The player primarily directs events through generated choices, with custom actions and editing tools available when needed.

## Core gameplay

- The AI narrates scenes and presents 3–6 choices for continuing the story.
- Players can enter a custom response, but this is secondary to the choice-based interface.
- Gameplay is mostly narrative, without a committed formal stats or combat system. App-provided randomness is available to the AI without requiring a formal dice ruleset.
- Character cards and AI-authored state records help maintain continuity.
- Players can edit lore and world state at any time to make corrections or steer the adventure.
- Start with a scrolling story-chat interface. Eventually support both scrolling chat and a scene-focused presentation; the alternate presentation and switching behavior remain to be designed. Keep the underlying story data reusable across both views.

## Adventure creation modes

### Standard

1. The player describes the world and game type they want.
2. The AI generates a storyboard from a template. The player reviews and edits its readable world-card preview on a dedicated world page, with JSON available separately.
3. The player proceeds to a separate character-generation page to generate, review, and edit one to four starting character cards. They can return to the world page without losing their changes.
4. A final review page shows the readable story/world on the left and an independently scrolling list of starting characters on the right, with a Start adventure button in the bottom bar.
5. The player starts play after confirming that final overview.

Generation and preview menus should be tall, using most of the available window height with scrollable contents.
Keep generation and navigation controls in a persistent bottom bar outside the scrolling setup content.

The storyboard template's fields remain experimental. Begin with a provisional template and evolve it based on what the storytelling model uses effectively rather than treating the initial fields as permanent.

Present the generated setup as a readable world card, with a button to view its underlying JSON. Generate the readable text using the configured low model, including the world JSON in its prompt. The text should faithfully present that data without inventing additional lore; the JSON remains the underlying story record. The current UI mockup uses placeholder text until this generation workflow is connected.

### Isekai

Isekai is a randomized, one-click quick-start mode. The app rolls tags for the story and starting character, generates their data and lore in the background, and drops the player directly into the story without initially explaining the situation.

Global Isekai preferences live in Settings, accessible from the main menu. They are not presented as a setup screen when starting a new Isekai adventure.

Preferences should support:

- Whitelisting and blacklisting tags and themes.
- Genre restrictions, such as sci-fi or urban fantasy.
- Starting-character constraints, such as always being male or always being female.
- An optional narrative prompt instruction for an explicit Isekai opening, such as transportation or reincarnation.

The storytelling AI does not inherently need to know that the adventure was created through Isekai mode. Without the optional instruction, it can simply work from the generated world and character setup. Whether the protagonist represents the player or a generated character can depend on the configured setup.

The whitelist and blacklist start empty and accept arbitrary user-entered tags, rather than requiring a fixed tag catalog. Settings with a small set of options, such as character gender, use toggles or dropdowns.

Feed these preferences to the main model to generate a varied setup. A smaller configurable model, such as Luna, then checks whether the generated setup follows the supplied constraints. On validation failure, retry generation once. If the second attempt also fails validation, warn the player and ask whether they want to continue before entering the story. This validation gate happens before the quick-start opening is presented.

Exact randomization rules, preference-conflict handling, validation output, and behavior if the player declines to continue remain to be designed.

## AI-callable tools

The storytelling model can call app-provided tools when it needs capabilities beyond text generation. Start with a ranged random-number generator and add other tools as concrete needs emerge.

### Ranged random-number generator

- The AI supplies an integer minimum and maximum, such as 1–20 or 0–100.
- The app validates the bounds and returns a uniformly sampled integer, including both endpoints, using a system random source rather than model-generated randomness.
- The model can use the result for uncertain outcomes, random events, or other narrative decisions without imposing a fixed dice system on every story.
- Tool requests and results are recorded with the turn for history inspection and debugging. Switching timelines or viewing history does not rerun recorded rolls.
- For outcome checks, the model should specify the stakes and how the range maps to outcomes before receiving the result, so it cannot reinterpret a roll to favor its preferred outcome.
- Outcome checks use integer thresholds: `roll(min, max, cf, s, cs)`. Here `cf` is the inclusive critical-failure ceiling, `s` is the success cutoff, and `cs` is the inclusive critical-success floor. Thresholds are supplied before the roll and validated by the app: `min <= cf < s <= cs <= max`, with all arguments integers and `min < max`.
- The app classifies the result with explicit precedence: `r <= cf` means critical failure; otherwise `r < s` means failure; otherwise `r >= cs` means critical success; otherwise success. Equivalently, ordinary success occupies `s <= r < cs`. This gives critical outcomes priority over ordinary failure/success.
- `s` is a configurable success threshold, not necessarily the statistical median. The thresholds determine the outcome probabilities. Equal `s` and `cs` leaves no ordinary-success results; adjacent `cf` and `s` leaves no ordinary-failure results.
- Return both the numeric roll and its classification as structured data, for example `{ "roll": 1, "outcome": "critical_failure" }`, which can be displayed as "Roll: 1 — Critical Failure". The model narrates the declared outcome rather than assigning a category after seeing the number.
- The three classification thresholds are optional as a group: `roll(min, max)` supports random selection and events that do not have success/failure semantics.

Initially, rolls happen in the background and the AI decides when to request them. Player-visible rolls are a future feature; roll frequency and usage need gameplay testing. Recorded rolls remain available for history/debug inspection.

The model still chooses when to request randomness and proposes the thresholds; app-side classification prevents relabeling the result but does not by itself guarantee fair difficulty or faithful narration. Exact tool schemas, bound limits, future player-facing roll presentation, and how fresh rolls behave during explicit rerolls remain to be designed.

## Story memory and state

The AI has flexible JSON objects it can populate and modify as needed. These records support consistency and compact representation of story information in model context.

Examples include character information, world facts, objects, relationships, and ongoing story developments. These are illustrative categories, not a fixed schema.

- Character cards persist alongside the adventure.
- Start character cards with basic template fields such as name, race, gender, age, bio, and inventory, plus a flexible field for any additional AI-authored details. The exact schema remains provisional.
- State contents can vary according to the story's needs.
- The AI may modify these records as the adventure progresses.
- Players can inspect and edit lore and state in a separate editor menu.
- Player corrections are intended to guide subsequent storytelling.

The precise JSON schemas, record identifiers, validation rules, update protocol, and context-selection strategy remain open. A small stable wrapper around flexible record contents has been suggested but is not yet finalized.

Initially, the storytelling model produces narration and state updates together in the same generation workflow. A separate state-update pass is a possible later alternative, to be evaluated through A/B testing rather than assumed to be better.

## Context and memory strategy

- Begin by sending the model all available story context while it fits the configured budget. Measure behavior and progressively reduce or retrieve material as needed.
- Plan for retrieval-augmented generation (RAG) over character cards and background lore, alongside context compression. Specific retrieval and compression methods require experimentation.
- Provide a configurable context budget, with an initial target in the roughly 50,000–100,000-token range and a requirement to stay below 256,000 tokens. The desired default is not yet fixed.
- The upper bound reflects the user's goal of avoiding higher provider pricing tiers; exact provider thresholds and token accounting must be verified during API design. It is a product constraint, not a verified pricing claim.
- Budget enforcement must also work during the initial send-everything approach. The accounting rules, output/tool reserves, and overflow behavior remain to be designed.
- Allow players to pin critical lore so it remains available to the model. The pinning interface, representation, and behavior when pinned information exceeds the budget remain open.

## Turn history and timelines

Use a Git-style history experience to preserve and inspect story progression and game-state changes. This describes the behavior; it does not commit the app to using Git for storage.

- Completed turns preserve narration, offered choices, the player's action, and associated state changes.
- Players can browse past turns and inspect the game state at those points.
- State diffs make changes understandable and help troubleshoot consistency during development.
- Continuing from an earlier point creates a new timeline while preserving the existing future.
- Players can switch between timelines and resume the one they prefer.
- Timelines share their history up to the point where they diverge, then retain their own progression and state.
- Manual lore and state corrections should remain traceable in history.

The storage approach, snapshot/diff strategy, timeline editor, and exact history-entry granularity remain to be designed. Saving a completed turn and its state changes together is the intended direction.

## Story-chat editing and rerolls

Players can edit messages in the story chat from the main gameplay view. This means editing player and AI story messages, rather than editing the underlying system prompts.

- In the MVP, save edits per message, creating a branch for each saved message edit. Accept the resulting large number of branches during in-house development.
- Alongside the full timeline editor after MVP, introduce batched chat editing: entering edit mode replaces the dialogue choices with Cancel/Save controls, and players can edit multiple messages and delete messages within one session.
- In that later batched flow, Save applies the changes together to one new branch and changes the chat context used for future turns. Individual edits within the session do not each create a branch; Cancel discards the pending edits.
- Editing an older message does not automatically remove later messages from the new branch; players can explicitly delete messages they no longer want.
- The original timeline remains available through the editor.
- Edits do not trigger regeneration.
- Players can explicitly reroll the most recent AI response.
- Chat edits leave saved lore and game state unchanged and do not trigger automatic reconciliation.
- Players can correct state separately through the editor.

Keeping chat edits independent from state is an intentional initial simplification. Revisit it if contradictions become a practical problem.

Whether explicit rerolls always create a new branch remains to be specified, along with the detailed state/history semantics of message deletion.

## Lore visibility and spoilers

There is no initial requirement for a separate player-discovered knowledge system or spoiler-filtered state viewer.

Lore and state editors live in their own menu and expose the underlying information, including information the player has not discovered through play. Opening the editor tray shows a Cancel/Proceed spoiler-warning dialog. Proceed opens the tray; Cancel, Escape, or closing the dialog leaves it closed. Do not repeat the warning inside individual editors.

Story-chat editing remains available in the gameplay view without requiring the player to open the lore/state editor.

## Visual style and layout

The app uses a cyberpunk terminal aesthetic: a dark background, light-gray text, and bold red, green, and blue accents. The visual reference is the utilitarian feel of Git/terminal tools and VS Code, expressed through blocky colored frames.

- Use locally bundled Space Mono as the current primary typeface, with a monospace fallback. This replaces the earlier Consolas and Roboto trials during UI iteration.
- Use thin, square-cornered frames and rectangular controls. Favor crisp borders and clear spacing over rounded cards or decorative effects.
- Keep the layout minimal and focused on reading the story and choosing the next action.
- Keep story text light gray for comfortable reading; use bold RGB colors for frames, active states, controls, and status emphasis.
- Treat the three accents as abstract theme tokens (`colorA`, `colorB`, and `colorC`) that happen to be red, green, and blue in the default theme. Assign them consistently to UI contexts and components; they are not restricted to universal status meanings. Red can appear on ordinary frames and controls, not only warnings.
- Aim for a vibrant interface through deliberate use of all three accents while preserving the minimal layout and readable story text.
- Keep the overall appearance clean and flat: no gradients, bloom, glow, or decorative visual effects.
- Frame styling follows text-terminal/TUI conventions: thin square outlines without overlaid corner glyphs, bracketed text controls and panel labels, and dashed separators. Preserve the established Space Mono typography, accent palette, card proportions, and layout.
- Allow short, responsive interaction animations for clicks and trays opening or closing. Motion should provide immediate feedback and never delay input or navigation; avoid ambient or ornamental animation. Respect reduced-motion preferences.
- User-selectable themes are a future feature. Keep styling token-based from the outset so later themes can replace the palette without changing component behavior.
- Keep supporting tools tucked into trays and submenus rather than permanently filling the gameplay view with panels.
- Present the 3–6 generated choices as the primary gameplay controls, with custom-response entry visually secondary.
- Expose chat-message editing through contextual controls. Place lore/state editing and timeline management in their supporting editor/tray flows.
- Gameplay has a compact 34px header matching the footer height, with the story title and a cog icon opening a pause menu. A collapsible left tray shows inventory, location, and other in-game information; a collapsible right tray contains tools and separate character-card, lore, and game-state editor buttons. Keep the scrolling chat central and choices/text entry anchored above the footer.
- Each completed chat message has Edit and Delete controls at its bottom. Only the most recent AI message has a refresh-icon reroll control; disable message mutations while generation is running.
- Character previews use literal trading-card proportions and framing adapted to the flat cyberpunk theme: nameplate, portrait area, identity strip, biography panel, and footer details. The initial mockup uses a line-art portrait placeholder.
- The left tray places the active player character's card at the top, their inventory in an independently scrolling grid in the middle, and location information at the bottom. Support switching the active character when the adventure has multiple starting characters.
- Character and story preview cards use a 5:7 playing-card aspect ratio. Do not embed character-card previews inside the New Adventure character-editing form; show them on preview screens and in the gameplay tray/card viewer.
- Character-card fields use MTG-inspired proportions: compact nameplate, portrait occupying roughly 42% of the inner card height, thin identity strip, a larger biography/details box, and a small footer. Preserve the app's flat cyberpunk styling.
- Scale character-card typography relative to each card's width, using the same proportions across tray cards, hover previews, grids, and editor previews. Larger cards must display correspondingly larger text rather than keeping fixed pixel font sizes.
- Library replaces Load and is the first main-menu option. It shows a grid of story cards and contains save import controls.
- Player messages have a card icon above their text that opens the speaking character's card. AI messages expose the same controls for referenced NPC dialogue/interactions. Preserve speaker references with each message so switching the active character does not change past speakers.
- A card icon aligned to the top-right of the choices opens a dropdown for selecting the acting player character for the next action.
- Editors use full-screen menus. The character editor opens to a grid of cards with an Edit button per card and top tabs for player characters versus NPCs. Editing a card shows its fields on the left and a live card preview on the right, with Save/Cancel controls at the bottom.
- Lore is edited as plain text, without JSON validation; the game-state editor remains JSON-based. The right tray shows a disabled Timelines button until that feature is implemented. A cog icon in the gameplay header opens a pause menu with Resume, Settings, Export Save, and Main Menu. Settings opens the existing configuration menu; export and main-menu controls live in the pause menu rather than the editor tray.
- Character, lore, and game-state editors occupy the full window. The character editor opens to a card grid with Edit buttons and top tabs for player characters versus NPCs. Individual card editing shows fields on the left and a live card preview on the right, with Save/Cancel controls at the bottom.
- Maintain readable contrast, visible keyboard focus, and text or symbols alongside status colors so color is not the only signal.

Exact color values, accent assignments, spacing, tray placement, and screen layouts remain to be designed. This establishes the visual direction without committing to a UI framework or implementing screens.

## Models and API configuration

- Bring-your-own-API-key access is foundational.
- The intended main storytelling model is GPT 6.1 Sol, chosen for the user's desired consistency characteristics.
- The intended minimum model generation is GPT 5.6 or newer.
- GPT 6.1 Luna and/or GPT 5.6 Luna are intended for smaller supporting tasks, such as tagging and initial character-card generation.
- Model assignments are user-configurable.
- Use a JSON endpoint configuration, defaulting to OpenAI. Support OpenAI-style API calls only; other providers must expose a compatible API.
- Fetch available models from the configured endpoint and let the player select a high-capability model and a lower-cost supporting model in Settings.
- Read the API key from an environment variable, supplied either through the process environment or a `.env` file. Exact variable names, `.env` location, and loading behavior remain to be specified.

These names and capability expectations record the user's intended requirements; availability, exact API identifiers, and supported configurations have not been verified. Resolve them before implementation.

The endpoint JSON schema, supported compatibility subset, model capability checks, generation settings, and cost visibility remain open. Provider compatibility must be tested rather than inferred from OpenAI-style naming alone.

## Saves and portability

- Support multiple independent adventures/games and saves in the MVP.
- Autosave timeline history and state diffs into a `saves` folder.
- Support `.zip` import and export of saves.
- Exact save structure, folder location, autosave transaction/recovery behavior, archive versioning, and backup policy remain to be designed.
- Save exports must not include API credentials or the application's `.env` file.

## Generation controls

- Stream story text where the endpoint and model support it.
- Support cancellation, manual retries, and explicit response rerolls.
- Recovery from interrupted or failed generation is initiated manually; do not silently retry normal gameplay generation.
- Commit narration and state updates together only after a valid response completes. Interrupted text remains available as a draft for manual retry or discard, without committing partial state updates.
- The single automatic retry during Isekai setup validation is a specific exception to the manual-retry policy.
- Exact draft storage, cancellation controls, response validation, and manual recovery UI remain to be designed.

## MVP scope and release approach

The MVP is an in-house milestone, not a public release. It establishes the app's design and delivers a fully playable core loop. Defer most quality-of-life features and visual polish beyond the agreed styling until that foundation works.

Required MVP features:

- Multiple games/saves.
- Standard and Isekai creation modes.
- Scrolling story chat with generated choices and custom text entry.
- Character cards.
- Lore and game-state editors.
- Git-style history, saved state diffs, and the underlying branching data model.
- Configurable compatible endpoint, fetched model selection, and environment-based API credentials.
- Autosaving and `.zip` save import/export.
- Streaming where supported, cancellation, and manual retries/rerolls.
- AI-callable RNG and the initial combined narration/state-update workflow.

Build the full timeline editor immediately after the in-house MVP is working. Do not build a temporary history list, timeline dropdown, or other substitute navigation UI for the MVP. Persistent history, diffs, and branching data remain foundational so the editor can be built on them directly. The MVP does not need player-facing access to every preserved branch. Use per-message edit branches initially and implement batched editing alongside the full timeline editor.

Later features include the full timeline editor, alternate scene presentation, selectable themes, visible gameplay rolls, reusable templates, character portability, and other quality-of-life improvements. Retrieval, compression, and lore pinning remain planned memory capabilities; their initial release depth needs to be decided against playable context-budget requirements.

## Adventure scope and future portability

Adventures are self-contained initially, including their story, character cards, lore, game state, and timelines.

Future design notes, outside the initial scope:

- Reusable world/story templates.
- Exporting character cards and importing them into other adventures.
- Importing a character during adventure creation as a starting character.
- Importing a character mid-game as a new character in an ongoing story.

## Development and troubleshooting

Historical state inspection and diffs are core tools for diagnosing narrative consistency problems.

Potential additional diagnostics include recording the model, prompt version, token usage, and proposed state updates for each generation. Their exact scope, retention, and presentation are not yet decided.

## Remaining planning work

- Main-menu, adventure-management, gameplay, settings, and editor flows.
- Experimental storyboard and character-card template details.
- Flexible state structure and safe update handling.
- AI tool schemas, RNG validation, outcome declarations, and roll history/reroll behavior.
- Prompt construction, context budgets, summaries, and memory retrieval.
- Batched chat-edit implementation, deletion semantics, reroll behavior, and history persistence details.
- Isekai generation, preference conflicts, validation, and failure/decline behavior.
- Endpoint JSON schema, API compatibility, model capability handling, and environment loading.
- Save/archive structure, backup policy, and Electron architecture.
- Streaming/cancellation transaction behavior and manual retry/recovery flows.
- Full timeline editor design and implementation as the first follow-up to the in-house MVP; no interim navigation UI.
- Memory-feature release depth, implementation milestones, and validation criteria.

## UI mockup progress

The initial plain-JavaScript Electron mockup is scaffolded. It includes an adventure library, Standard setup/review, Isekai entry, scrolling gameplay, choices/custom input, per-message edit controls, character and lore/state forms, endpoint/model and Isekai settings, archive placeholders, and simulated generation/cancellation/draft recovery. Backend operations are not implemented; preview changes are in memory only. History diagnostics are development placeholders, not a substitute timeline editor. Visual review and iteration remain open before deriving the dedicated UI design document.
