/**
 * ASAKA ZIYO — Islamic Academy Lessons, Daily/Weekly Quiz & Leaderboard Service
 *
 * Uses authentic curated lessons and the verified `VERIFIED_QUIZ_BANK` from
 * `src/data/quizQuestionsData.ts` across all 5 languages.
 */

import { VERIFIED_QUIZ_BANK, QuizQuestionItem } from '../../src/data/quizQuestionsData';
import { toNewUzbekAlphabet } from '../../src/utils/newUzbekAlphabet';
import { TelegramLocale } from '../types';
import { TelegramRepository } from '../database/telegramRepository';
import { CustomEmojiRegistry, FormattedEmojiMessage } from '../emoji/customEmojiRegistry';
import { getTelegramLocaleBundle } from '../locales';

export interface AcademyLesson {
  id: string;
  order: number;
  level: 'beginner' | 'intermediate';
  title: Record<TelegramLocale, string>;
  summary: Record<TelegramLocale, string>;
  keyPoints: Record<TelegramLocale, string[]>;
  source: string;
}

export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: 'lesson-tahorat',
    order: 1,
    level: 'beginner',
    title: {
      'uz-Latn': '1-Dars: Tahorat va poklik odoblari (Hanafiy mazhabi)',
      'uz-Cyrl': '1-Дарс: Таҳорат ва поклик одоблари (Ҳанафий мазҳаби)',
      'uz-Latn-new': '1-Dars: Tahorat va poklik odoblari (Hanafiy mazhabi)',
      ru: 'Урок 1: Омовение (Вуду) и правила чистоты (Ханафитский мазхаб)',
      en: 'Lesson 1: Ablution (Wudu) and Purity Etiquette (Hanafi School)',
    },
    summary: {
      'uz-Latn': 'Namozning kaliti boʻlgan tahoratning 4 farzi, sunnatlari va tahoratni buzadigan amallar.',
      'uz-Cyrl': 'Намознинг калити бўлган таҳоратнинг 4 фарзи, суннатлари ва таҳоратни бузадиган амаллар.',
      'uz-Latn-new': 'Namozning kaliti bölgan tahoratning 4 farzi, sunnatlari va tahoratni buzadigan amallar.',
      ru: 'Четыре столпа омовения, сунны и действия, нарушающие вуду.',
      en: 'The four obligatory acts (fard) of wudu, sunnah practices, and what nullifies it.',
    },
    keyPoints: {
      'uz-Latn': [
        'Farzlari (4 ta): Yuzni yuvish, ikki qoʻlni tirsaklari bilan yuvish, boshning toʻrtdan biriga mash tortish, ikki oyoqni toʻpiqlari bilan yuvish.',
        'Sunnatlari: Bismilloh bilan boshlash, qoʻllarni kaftdan yuvish, misvok ishlatish, ogʻiz va burun chayish, aʼzolarni uch martadan yuvish.',
        'Tahoratni buzadigan holatlar: tabiiy chiqindilar, qon yoki yiring oqishi, ogʻiz toʻlib qusish, yonboshlab uxlash.',
      ],
      'uz-Cyrl': [
        'Фарзлари (4 та): Юзни ювиш, икки қўлни тирсаклари билан ювиш, бошнинг тўртдан бирига масҳ тортиш, икки оёқни тўпиқлари билан ювиш.',
        'Суннатлари: Бисмиллоҳ билан бошлаш, қўлларни кафтдан ювиш, мисвок ишлатиш, оғиз ва бурун чайиш, аъзоларни уч мартадан ювиш.',
      ],
      'uz-Latn-new': [
        'Farzlari (4 ta): Yuzni yuviş, ikki qölni tirsaklari bilan yuviş, boşning törtdan biriga mash tortiş, ikki oyoqni töpiqlari bilan yuviş.',
        'Sunnatlari: Bismilloh bilan boşlaş, qöllarni kaftdan yuviş, misvok işlatiş, oğiz va burun çayiș, aʼzolarni uç martadan yuviş.',
      ],
      ru: [
        '4 фарда вуду: омыть лицо, руки до локтей, протереть 1/4 часть головы и омыть ноги до щиколоток.',
        'Сунны: начать с Бисмиллях, омывать троекратно, полоскать рот и нос, использовать сивак.',
      ],
      en: [
        '4 Fard pillars: Washing face, arms including elbows, wiping 1/4 of head, washing feet including ankles.',
        'Sunnahs: Intention, Bismillah, rinsing mouth and nose, washing limbs three times consecutively.',
      ],
    },
    source: 'Muxtasarul Viqoya; «Moʻminning meʼroji»',
  },
  {
    id: 'lesson-namoz',
    order: 2,
    level: 'beginner',
    title: {
      'uz-Latn': '2-Dars: Besh vaqt namozning shartlari va ruknlari',
      'uz-Cyrl': '2-Дарс: Беш вақт намознинг шартлари ва рукнлари',
      'uz-Latn-new': '2-Dars: Beş vaqt namozning şarlari va ruknlari',
      ru: 'Урок 2: Условия и столпы пятикратного намаза',
      en: 'Lesson 2: Conditions and Pillars of the Five Daily Prayers',
    },
    summary: {
      'uz-Latn': 'Namozning 6 tashqi sharti va 6 ichki rukni (farzi), xushuʼ va namozdagi zikrlar.',
      'uz-Cyrl': 'Намознинг 6 ташқи шарти ва 6 ички рукни (фарзи), хушуъ ва намоздаги зикрлар.',
      'uz-Latn-new': 'Namozning 6 taşqi şarti va 6 içki rukni (farzi), xuşuʼ va namozdagi zikrlar.',
      ru: '6 внешних условий и 6 внутренних столпов намаза, смирение и внимание сердца.',
      en: 'The 6 external prerequisites and 6 internal pillars of Salah.',
    },
    keyPoints: {
      'uz-Latn': [
        'Tashqi shartlari: Badan pokligi, kiyim va joy pokligi, avratni yopish, Qiblaga yuzlanish, vaqt kirishi, niyat.',
        'Ichki ruknlari: Takbiri tahrima, Qiyom, Qiroat, Rukuʼ, Sajda, Qaʼdai oxira.',
      ],
      'uz-Cyrl': [
        'Ташқи шартлари: Бадан поклиги, кийим ва жой поклиги, авратни ёпиш, Қиблага юзланиш, вақт кириши, ният.',
        'Ички рукнлари: Такбири таҳрима, Қиём, Қироат, Рукуъ, Сажда, Қаъдаи охира.',
      ],
      'uz-Latn-new': [
        'Taşqi şartlari: Badan pokligi, kiyim va joy pokligi, avratni yopiş, Qiblaga yuzlaniş, vaqt kirişi, niyat.',
        'Içki ruknlari: Takbiri tahrima, Qiyom, Qiroat, Rukuʼ, Sajda, Qaʼdai oxira.',
      ],
      ru: [
        'Внешние условия: чистота тела/одежды/места, закрытие аурата, Кибла, время, намерение.',
        'Внутренние столпы: Такбират аль-ихрам, Кыям, Кираат, Руку, Суджуд, последнее сидение.',
      ],
      en: [
        'Prerequisites: Purity of body/clothes/place, covering awrah, facing Qiblah, valid time, intention.',
        'Pillars: Opening Takbir, Standing, Quran Recitation, Bowing (Ruku), Prostration (Sujud), Final Sitting.',
      ],
    },
    source: 'Muxtasarul Viqoya',
  },
  {
    id: 'lesson-axloq',
    order: 3,
    level: 'intermediate',
    title: {
      'uz-Latn': '3-Dars: Islomda ota-ona, qoʻshni va jamiyat odoblari',
      'uz-Cyrl': '3-Дарс: Исломда ота-она, қўшни ва жамият одоблари',
      'uz-Latn-new': '3-Dars: Islomda ota-ona, qöşni va jamiyat odoblari',
      ru: 'Урок 3: Этика почитания родителей, соседей и общества в Исламе',
      en: 'Lesson 3: Islamic Ethics Toward Parents, Neighbors & Society',
    },
    summary: {
      'uz-Latn': 'Ota-onaga yaxshilik, qoʻshni haqlari, rostgoʻylik, omonatdorlik va tilni tiyish odoblari.',
      'uz-Cyrl': 'Ота-онага яхшилик, қўшни ҳақлари, ростгўйлик, омонатдорлик ва тилни тийиш одоблари.',
      'uz-Latn-new': 'Ota-onaga yaxşilik, qöşni haqlari, rostgöylik, omonatdorlik va tilni tiyiş odoblari.',
      ru: 'Почтение родителей, права соседей, честность и ответственность верующего.',
      en: 'Honoring parents, neighborly rights, truthfulness, trustworthiness, and guarding speech.',
    },
    keyPoints: {
      'uz-Latn': [
        'Ota-onaning roziligi — Allohning roziligidadir; ularga «uf» ham demaslik Qurʼonda buyurilgan.',
        '«Allohga va oxirat kuniga iymon keltirgan kishi qoʻshnisiga ozor bermasin» (Sahih al-Buxoriy).',
      ],
      'uz-Cyrl': [
        'Ота-онанинг розилиги — Аллоҳнинг розилигидадир; уларга «уф» ҳам демаслик Қуръонда буюрилган.',
        '«Аллоҳга ва охират кунига иймон келтирган киши қўшнисига озор бермасин» (Саҳиҳ ал-Бухорий).',
      ],
      'uz-Latn-new': [
        'Ota-onaning roziligi — Allohning roziligidadir; ularga «uf» ham demaslik Qurʼonda buyurilgan.',
        '«Allohga va oxirat kuniga iymon keltirgan kişi qöşnisiga ozor bermasin» (Sahih al-Buxoriy).',
      ],
      ru: [
        'Довольство Аллаха — в довольстве родителей.',
        '«Пусть тот, кто верует в Аллаха и в Последний день, не причиняет вреда своему соседу» (Аль-Бухари).',
      ],
      en: [
        'Allah commands utmost kindness to parents in the Quran (Surah Al-Isra 17:23).',
        '“Whoever believes in Allah and the Last Day should honor their neighbor” (Sahih al-Bukhari).',
      ],
    },
    source: 'Riyozus-solihiyn; Adabul Mufrad',
  },
];

function localizeQuizText(text: string, locale: TelegramLocale): string {
  return locale === 'uz-Latn-new' ? toNewUzbekAlphabet(text) : text;
}

export class TelegramAcademyQuizService {
  private readonly repo: TelegramRepository;
  // Active quiz session state per user: maps telegramId -> { questionIds, answers, currentIndex }
  private readonly activeQuizzes = new Map<
    string,
    { questionIds: string[]; answers: number[]; currentIndex: number; startedAt: string }
  >();

  constructor(repo: TelegramRepository) {
    this.repo = repo;
  }

  getLessons(): AcademyLesson[] {
    return ACADEMY_LESSONS;
  }

  formatLessonCard(
    lessonIndex: number,
    telegramId: string,
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): { formatted: FormattedEmojiMessage; index: number; total: number; lessonId: string; completed: boolean } {
    const total = ACADEMY_LESSONS.length;
    const safeIdx = ((lessonIndex % total) + total) % total;
    const lesson = ACADEMY_LESSONS[safeIdx];
    const eng = this.repo.getUserEngagement(telegramId);
    const completed = eng.completedLessonIds.includes(lesson.id);
    const dict = getTelegramLocaleBundle(locale);
    const points = lesson.keyPoints[locale] || lesson.keyPoints['uz-Latn'];

    const lines = [
      `${dict.academyTitle} (${safeIdx + 1}/${total})`,
      `{{emoji:brand.book}} ${lesson.title[locale] || lesson.title['uz-Latn']}`,
      `• Holat: ${completed ? '✅ Yakunlangan' : '📖 Oʻqilmoqda'}`,
      '',
      lesson.summary[locale] || lesson.summary['uz-Latn'],
      '',
      ...points.map((p) => `• ${p}`),
      '',
      `📚 Manba: ${lesson.source}`,
    ];

    return {
      formatted: emojiRegistry.formatMessage(lines.join('\n')),
      index: safeIdx,
      total,
      lessonId: lesson.id,
      completed,
    };
  }

  async toggleLessonCompleted(telegramId: string, lessonId: string): Promise<boolean> {
    const eng = this.repo.getUserEngagement(telegramId);
    const idx = eng.completedLessonIds.indexOf(lessonId);
    let completed = false;
    if (idx >= 0) {
      eng.completedLessonIds.splice(idx, 1);
      completed = false;
    } else {
      eng.completedLessonIds.push(lessonId);
      completed = true;
    }
    await this.repo.saveUserEngagement(eng);
    return completed;
  }

  getQuizQuestions(count = 5): QuizQuestionItem[] {
    const approved = VERIFIED_QUIZ_BANK.filter((q) => q.isApproved !== false);
    const daySeed = Math.floor(Date.now() / 86_400_000);
    const start = approved.length > 0 ? daySeed % approved.length : 0;
    const picked: QuizQuestionItem[] = [];
    for (let i = 0; i < Math.min(count, approved.length); i++) {
      picked.push(approved[(start + i) % approved.length]);
    }
    return picked;
  }

  startQuizSession(telegramId: string, count = 5) {
    const questions = this.getQuizQuestions(count);
    const session = {
      questionIds: questions.map((q) => q.id),
      answers: [] as number[],
      currentIndex: 0,
      startedAt: new Date().toISOString(),
    };
    this.activeQuizzes.set(telegramId, session);
    return { session, currentQuestion: questions[0] || null, total: questions.length };
  }

  getCurrentQuizQuestion(telegramId: string): {
    question: QuizQuestionItem;
    index: number;
    total: number;
  } | null {
    const session = this.activeQuizzes.get(telegramId);
    if (!session) return null;
    const qId = session.questionIds[session.currentIndex];
    const q = VERIFIED_QUIZ_BANK.find((item) => item.id === qId);
    if (!q) return null;
    return { question: q, index: session.currentIndex, total: session.questionIds.length };
  }

  async submitQuizAnswer(
    telegramId: string,
    userName: string,
    optionIndex: number,
    locale: TelegramLocale
  ): Promise<{
    isCorrect: boolean;
    explanation: string;
    finished: boolean;
    score: number;
    total: number;
    pointsEarned: number;
  }> {
    const session = this.activeQuizzes.get(telegramId);
    if (!session) {
      return {
        isCorrect: false,
        explanation: 'Viktorina sessiyasi topilmadi.',
        finished: true,
        score: 0,
        total: 0,
        pointsEarned: 0,
      };
    }

    const qId = session.questionIds[session.currentIndex];
    const q = VERIFIED_QUIZ_BANK.find((item) => item.id === qId);
    const isCorrect = Boolean(q && q.correctIndex === optionIndex);
    session.answers.push(optionIndex);
    session.currentIndex++;

    const finished = session.currentIndex >= session.questionIds.length;
    let score = 0;
    let pointsEarned = 0;

    if (finished) {
      session.questionIds.forEach((id, idx) => {
        const item = VERIFIED_QUIZ_BANK.find((x) => x.id === id);
        if (item && item.correctIndex === session.answers[idx]) {
          score++;
        }
      });
      pointsEarned = score * 20;
      const total = session.questionIds.length;

      await this.repo.recordQuizAttempt({
        telegramId,
        userName,
        quizType: 'daily',
        questionIds: session.questionIds,
        answers: session.answers,
        score,
        total,
        pointsEarned,
      });

      const eng = this.repo.getUserEngagement(telegramId);
      eng.quizTotalAttempts += 1;
      eng.quizTotalPoints += pointsEarned;
      eng.quizBestScore = Math.max(eng.quizBestScore, score);
      eng.quizStreak = score >= Math.ceil(total / 2) ? eng.quizStreak + 1 : 0;
      await this.repo.saveUserEngagement(eng);
      this.activeQuizzes.delete(telegramId);

      return {
        isCorrect,
        explanation: q ? localizeQuizText(q.explanationUz, locale) : '',
        finished: true,
        score,
        total,
        pointsEarned,
      };
    }

    return {
      isCorrect,
      explanation: q ? localizeQuizText(q.explanationUz, locale) : '',
      finished: false,
      score: 0,
      total: session.questionIds.length,
      pointsEarned: 0,
    };
  }

  getLeaderboard(limit = 10): Array<{
    rank: number;
    telegramId: string;
    name: string;
    points: number;
    bestScore: number;
    attempts: number;
  }> {
    const entries = this.repo
      .listAllEngagement()
      .filter((e) => e.quizTotalPoints > 0 || e.quizTotalAttempts > 0)
      .sort((a, b) => b.quizTotalPoints - a.quizTotalPoints)
      .slice(0, limit);

    return entries.map((e, i) => {
      const u = this.repo.getUser(e.telegramId);
      const name = u ? [u.firstName, u.lastName].filter(Boolean).join(' ') : `User ${e.telegramId}`;
      return {
        rank: i + 1,
        telegramId: e.telegramId,
        name,
        points: e.quizTotalPoints,
        bestScore: e.quizBestScore,
        attempts: e.quizTotalAttempts,
      };
    });
  }

  formatLeaderboardMessage(
    locale: TelegramLocale,
    emojiRegistry: CustomEmojiRegistry
  ): FormattedEmojiMessage {
    const dict = getTelegramLocaleBundle(locale);
    const board = this.getLeaderboard(10);
    if (board.length === 0) {
      return emojiRegistry.formatMessage(`${dict.leaderboardTitle}\n\nHozircha natijalar yoʻq. Birinchi boʻlib /quiz yeching!`);
    }
    const medals = ['🥇', '🥈', '🥉'];
    const lines = [
      dict.leaderboardTitle,
      '',
      ...board.map(
        (row) =>
          `${medals[row.rank - 1] || `${row.rank}.`} ${row.name} — ${row.points} ball (${row.attempts} ta)`
      ),
    ];
    return emojiRegistry.formatMessage(lines.join('\n'));
  }
}
