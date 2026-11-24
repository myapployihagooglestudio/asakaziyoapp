import assert from 'node:assert/strict';
import {
  AGENT_FAST_MODEL,
  AGENT_MODEL_CATALOG,
  AGENT_PRIMARY_MODEL,
  AGENT_TOOL_DECLARATIONS,
  PERMITTED_AGENT_TABS,
  isSensitiveFatwaTopic,
  selectAgentModelAndTier,
} from './asakaZiyoAgent';
import { ThinkingLevel } from '@google/genai';

function runUnitTests() {
  console.log('=== ASAKA ZIYO AI AGENT 2026 — UNIT VERIFICATION ===');

  // 1. Model constants & catalog
  assert.equal(AGENT_PRIMARY_MODEL, 'gemini-4-hydrogen');
  assert.equal(AGENT_FAST_MODEL, 'gemini-3.1-flash-lite');
  assert.equal(AGENT_MODEL_CATALOG.length, 2);
  console.log('[PASS] 1. Model catalog & Gemini 4 / 3.1 Flash-Lite constants valid');

  // 2. Smart routing tiers
  const simpleAuto = selectAgentModelAndTier('Assalomu alaykum', 'auto');
  assert.equal(simpleAuto.model, AGENT_FAST_MODEL);
  assert.equal(simpleAuto.tier, 'fast');

  const complexAuto = selectAgentModelAndTier(
    'Baqara surasi tafsirini tushuntiring va namoz vaqtlarini tekshiring',
    'auto'
  );
  assert.equal(complexAuto.model, AGENT_PRIMARY_MODEL);
  assert.equal(complexAuto.tier, 'intelligent');
  assert.equal(complexAuto.thinkingLevel, ThinkingLevel.MEDIUM);

  const deepMode = selectAgentModelAndTier('Salom', 'deep');
  assert.equal(deepMode.model, AGENT_PRIMARY_MODEL);
  assert.equal(deepMode.tier, 'deep');
  assert.equal(deepMode.thinkingLevel, ThinkingLevel.HIGH);

  const fastMode = selectAgentModelAndTier('Tafsiri Hilol va Hanafiy fiqh qiyosiy tahlili', 'fast');
  assert.equal(fastMode.model, AGENT_FAST_MODEL);
  assert.equal(fastMode.tier, 'fast');
  console.log('[PASS] 2. Multi-tier model router (auto/deep/fast) verified');

  // 3. Sensitive fatwa topic detection
  assert.equal(isSensitiveFatwaTopic('Taloq masalasida hukm qanday?'), true);
  assert.equal(isSensitiveFatwaTopic('Meros taqsimoti boʻyicha savolim bor'), true);
  assert.equal(isSensitiveFatwaTopic('Bomdod namozi vaqti nechada?'), false);
  console.log('[PASS] 3. Sensitive personal fatwa detector verified');

  // 4. Permitted navigation security whitelist
  assert.equal(Boolean(PERMITTED_AGENT_TABS.prayer), true);
  assert.equal(Boolean(PERMITTED_AGENT_TABS.quran), true);
  assert.equal(Boolean(PERMITTED_AGENT_TABS.ask_imam), true);
  assert.equal(Boolean((PERMITTED_AGENT_TABS as any).admin), false, 'Admin tab MUST NOT be agent-navigable');
  console.log('[PASS] 4. Permitted navigation whitelist blocks privileged admin tab');

  // 5. All 8 Function Calling tool declarations present
  const toolNames = AGENT_TOOL_DECLARATIONS.map((t) => t.name);
  for (const expected of [
    'get_prayer_times',
    'search_quran_and_tafsir',
    'search_authentic_hadith',
    'search_dhikr_and_duas',
    'search_articles_and_mosque_news',
    'get_qibla_and_mosque_info',
    'navigate_app_section',
    'escalate_to_imam_or_admin',
  ]) {
    assert.ok(toolNames.includes(expected), `Missing tool declaration: ${expected}`);
  }
  console.log(`[PASS] 5. All ${toolNames.length} Gemini Function Calling tools verified`);
  console.log('=== ALL AI AGENT UNIT TESTS PASSED ===');
}

runUnitTests();
