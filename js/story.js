'use strict';

// Όλα τα κείμενα της ιστορίας, ΑΚΡΙΒΩΣ όπως στο STORY.md (ενότητα 8).
// Βγήκαν αυτόματα από το STORY.md· αν αλλάξει εκεί, άλλαξέ τα κι εδώ ίδια.
// (Οι τίτλοι, οι φράσεις και οι στόχοι των κεφαλαίων είναι στο js/levels.js.)
const STORY = {
  intro: [
    "A snake in the grass. A single bite.",
    "Eurydice never woke again.",
    "Everyone said the dead do not return.",
    "Orpheus did not listen.",
    "At Taenarum, the earth opens downward. He went down.",
    "On the first step he slipped. His lyre shattered on the rocks.",
    "Its strings scattered into the dark.",
    "There is no light down here.",
    "Only what can be heard.",
  ],

  middle: [
    "Orpheus played.",
    "For the first time, something wept in the Underworld.",
    "Persephone leaned toward Hades. He was silent for a long time.",
    "\"Take her,\" he said. \"She will follow you to the light.",
    "But if you turn to look at her before you leave,",
    "she stays here. Forever.\"",
  ],

  good: [
    "Light.",
    "Orpheus stepped into the open air and did not turn. He waited.",
    "A hand touched his shoulder.",
    "\"You didn't look,\" said Eurydice.",
    "In the myth, he looked.",
    "You didn't.",
  ],

  bad: [
    "Orpheus turned.",
    "For a moment he saw her, just as he remembered.",
    "Then the dark took her back, without a sound.",
    "He stepped into the light alone.",
    "Just like in the myth.",
  ],

  // Μηνύματα χαμένων ψυχών: souls[0] είναι το 1 κ.λπ.
  souls: [
    "I thought I would find my way back, too.",
    "I had no obol. I have waited on this shore for a hundred years.",
    "I drank from the river. I don't remember my name. Only that someone was waiting for me.",
    "The shades cannot see. They listen. Walk as if you do not exist.",
    "The queen ate six pomegranate seeds. That is why she can never leave.",
    "Everyone looks back at the end. Everyone.",
  ],

  checkpoint: "The flame is lit. Your progress is saved.",
  charonEmpty: "Charon holds out his hand. Yours is empty.",
  charonPaid: "The obol clinks into his palm. The boat begins to move.",
  jar: "A libation jar. The dead hunger for offerings. Throw it, and they will come.",
  string: (x) => "You found a string " + `(${x}/3)` + ".",
  lyreWhole: "Your lyre is whole again. When you play, the shades remember they were once alive.",
  whisper: "Orpheus...",
  footstepsStop: "The footsteps behind you stop.",

  // Επιλογές μετά το κακό τέλος (STORY.md, ενότητα 5).
  tryAgain: 'Try again from the last checkpoint',
  mainMenu: 'Main menu',
};
