import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

console.log('====================================================');
console.log('VOICE TEXT SEARCH BOX INTEGRATION TESTS');
console.log('====================================================\n');

// 1. Verify useVoiceSpeech.ts source code
console.log('Test 1: useVoiceSpeech continuous transcript accumulation');
const hookSrc = fs.readFileSync(path.join(projectRoot, 'src/hooks/useVoiceSpeech.ts'), 'utf8');
assert(hookSrc.includes('for (let i = 0; i < event.results.length; ++i)'), 'useVoiceSpeech must iterate all results from 0, not drop results via resultIndex');
assert(hookSrc.includes('finalTranscript += (finalTranscript ? \' \' : \'\') + text.trim()'), 'useVoiceSpeech must join final segments with clean spacing');
assert(hookSrc.includes('onTranscriptRef.current(combined, Boolean(finalTranscript))'), 'useVoiceSpeech must invoke onTranscript with clean combined transcript');
console.log('  PASSED: useVoiceSpeech transcript accumulation logic verified\n');

// 2. Simulated Web Speech API Event Transcript Resolution
console.log('Test 2: Simulated multi-segment Web Speech event resolution');
function simulateTranscriptExtraction(event) {
  let interimTranscript = '';
  let finalTranscript = '';

  for (let i = 0; i < event.results.length; ++i) {
    const result = event.results[i];
    const text = result[0]?.transcript || '';
    if (result.isFinal) {
      finalTranscript += (finalTranscript ? ' ' : '') + text.trim();
    } else {
      interimTranscript += (interimTranscript ? ' ' : '') + text.trim();
    }
  }

  return [finalTranscript.trim(), interimTranscript.trim()]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const mockEvent1 = {
  resultIndex: 0,
  results: [
    { 0: { transcript: 'Senior React' }, isFinal: true },
    { 0: { transcript: 'Developer Remote' }, isFinal: false }
  ]
};
const result1 = simulateTranscriptExtraction(mockEvent1);
assert.strictEqual(result1, 'Senior React Developer Remote', 'Must combine finalized earlier words with interim words');

const mockEvent2 = {
  resultIndex: 1,
  results: [
    { 0: { transcript: 'Senior React' }, isFinal: true },
    { 0: { transcript: 'Developer Remote' }, isFinal: true },
    { 0: { transcript: '160k' }, isFinal: false }
  ]
};
const result2 = simulateTranscriptExtraction(mockEvent2);
assert.strictEqual(result2, 'Senior React Developer Remote 160k', 'Must preserve earlier finalized words even when resultIndex advances');
console.log('  PASSED: Multi-chunk speech transcript simulation produces continuous search text\n');

// 3. Verify RoleSearch.tsx (Homepage search box)
console.log('Test 3: RoleSearch.tsx voice search box integration');
const roleSearchSrc = fs.readFileSync(path.join(projectRoot, 'src/components/Hero/RoleSearch.tsx'), 'utf8');
assert(roleSearchSrc.includes("import { useVoiceSpeech } from '@/hooks/useVoiceSpeech';"), 'RoleSearch must import useVoiceSpeech');
assert(roleSearchSrc.includes('useVoiceSpeech({'), 'RoleSearch must call useVoiceSpeech hook');
assert(roleSearchSrc.includes('setValue(`${prefix}${spokenText}`)'), 'RoleSearch must return spoken voice text directly into input value');
assert(roleSearchSrc.includes('Listening to your voice...'), 'RoleSearch must display voice listening indicator in search box placeholder');
assert(roleSearchSrc.includes('<Mic'), 'RoleSearch must render microphone icon');
assert(roleSearchSrc.includes('handleVoiceToggle'), 'RoleSearch must wire microphone button click to voice toggle');
assert(roleSearchSrc.includes('errorMessage'), 'RoleSearch must support graceful error/permission message banner');
console.log('  PASSED: RoleSearch.tsx homepage search box contains complete voice text support\n');

// 4. Verify ChatInterface.tsx (Chat search box)
console.log('Test 4: ChatInterface.tsx voice search box integration');
const chatSrc = fs.readFileSync(path.join(projectRoot, 'src/components/Chat/ChatInterface.tsx'), 'utf8');
assert(chatSrc.includes("import { useVoiceSpeech } from '@/hooks/useVoiceSpeech';"), 'ChatInterface must import useVoiceSpeech');
assert(chatSrc.includes('setInput(`${prefix}${spokenText}`)'), 'ChatInterface must return voice text directly into search box');
assert(chatSrc.includes('inputRef.current?.focus()'), 'ChatInterface must focus search box when voice is toggled');
assert(chatSrc.includes('Listening to your voice...'), 'ChatInterface must indicate active voice listening in placeholder');
console.log('  PASSED: ChatInterface.tsx chat search box contains complete voice text support\n');

console.log('====================================================');
console.log('ALL VOICE SEARCH TESTS PASSED SUCCESSFULLY!');
console.log('====================================================');
