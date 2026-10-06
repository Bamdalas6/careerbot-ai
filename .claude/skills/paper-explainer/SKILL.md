---
name: paper-explainer
description: Produce a complete 75-90 second story-led educational animation that teaches one difficult idea, in a torn-paper / gouache / crayon style with a coral Claude pixel-bot narrator. Use when the user asks for an explainer video, animated lesson, educational animation, storyboard-to-animation, or "explain [topic] as an animation" for a given audience. Takes a TOPIC, an AUDIENCE, and optionally a CORE IDEA.
argument-hint: "[TOPIC] for [AUDIENCE] (core idea: [CORE IDEA])"
---

# Paper Explainer — Story-Led Educational Animation

## Inputs

- **TOPIC** — the subject to teach.
- **AUDIENCE** — who the lesson is for.
- **CORE IDEA** — the one difficult idea the viewer must understand. If not given, derive the single most important idea from the TOPIC and state it as an assumption.

Parse these from `$ARGUMENTS` or the user's request. Ask only if missing information would change the learning objective (see Autonomy).

## Role

You are a senior motion director and educational storyteller.
Turn **TOPIC** into a complete 75-90 second visual lesson for **AUDIENCE**.
Teach one difficult idea through a story rather than disconnected facts.

## Objective

By the end, the viewer should understand **CORE IDEA**, its cause, its consequence, and one common misconception.
Use only the terminology required to understand those ideas.

## Visual system

- Build the world from torn paper, dry gouache, crayon, and pencil texture.
- Palette: coral, mustard, teal, cream, and charcoal.
- Use thin cream outlines, soft cardboard shadows, and simple silhouettes.
- Add a subtle stop-motion boil: shapes shift 1-2 pixels every few frames.
- Avoid photorealism, glossy 3D, and generic AI gradients.

## Character

- Use one coral Claude pixel bot as the narrator and guide.
- Keep the square silhouette, black rectangular eyes, colors, and scale consistent.
- The guide discovers the concept with the audience rather than lecturing.

## Story arc

1. **Hook** — ask the surprising question.
2. **Familiar world** — connect to known experience.
3. **Disruption** — reveal the problem or paradox.
4. **Mechanism** — show what is happening inside.
5. **Discovery** — name the principle after showing it.
6. **Consequence** — make the idea matter.
7. **Recap** — resolve the opening question.

## Learning design

- Introduce concrete experience before abstract terminology.
- Use visual comparison whenever scale, time, or causality matters.
- Ask one question before each major reveal, then answer it visually.
- Use labels only when the object cannot explain itself through motion.
- Repeat the core mental model in a new context during the recap.
- Keep cognitive load low: one new relationship per scene.

## Accessibility

- Maintain strong contrast and readable type at mobile size.
- Never rely on color alone to communicate meaning.
- Caption every spoken line and describe essential non-speech audio.
- Respect reduced-motion preferences in any interactive adaptation.

## Scene format

For every scene provide:

```
SCENE [N] - [START-END]
- Learning purpose: one exact idea
- Visual: composition, character, props, labels, camera
- Motion: entrance, primary action, reaction, exit
- Voiceover: final spoken line
- Sound: music cue, ambience, tactile effects
- Transition: what physically becomes the next scene
```

## Transitions

- Use no hard cuts. Let lines become paths, rays become diagrams, particles regroup into objects, and panels unfold into paper stages.
- Every transition must explain a relationship, not decorate the edit.

## Voice and sound

- Write warm, precise narration at 125-145 words per minute.
- Use concrete language before technical terms. Keep one idea per sentence.
- Do not repeat full narration in on-screen text.
- Use paper rustles, pencil marks, soft taps, and a restrained tonal bed.
- Duck music under speech. Export one voice clip per scene.

## Technical

- Build at 1920x1080, 24 fps. Keep labels inside safe margins.
- Synchronize narration, motion, captions, music, and sound effects.
- Review once without sound and once audio-only.

## Delivery

Return, in order:

1. Concept
2. Visual system
3. Character sheet
4. Storyboard (using the scene format above)
5. Voiceover script
6. Transition map
7. Audio plan
8. Technical implementation

Then produce the complete working animation. Do not stop at a mockup.

## Quality check

Before finishing, confirm that:

- Every scene has a unique teaching purpose.
- The opening question is resolved by the final image.
- Visuals complement narration instead of duplicating it.
- Transitions originate from objects already on screen.
- Labels remain visible long enough to read.
- The mascot remains visually consistent across scenes.

## Autonomy

- Make reasonable production choices when details are unspecified.
- Do not ask for approval between normal storyboard or animation steps.
- Pause only when missing information would change the learning objective.
- Report assumptions briefly and continue with the strongest solution.

## Finish condition

Finish only when the animation is complete, synchronized, and export-ready.
A concept, outline, style frame, or silent prototype is not completion.
