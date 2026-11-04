import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { GeometricPattern } from '../../ui/GeometricPattern';
import {
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Star,
} from 'lucide-react';

interface QuizQuestion {
  id: number;
  questionUz: string;
  optionsUz: string[];
  correctIndex: number;
  explanationUz: string;
  category: string;
}

const ISLAMIC_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    category: 'Qurʼonshunoslik',
    questionUz: 'Qurʼoni Karimda nechta sura mavjud?',
    optionsUz: ['112 ta', '114 ta', '116 ta', '120 ta'],
    correctIndex: 1,
    explanationUz: 'Qurʼoni Karim jami 114 suradan iborat boʻlib, ularning 86 tasi Makkiy va 28 tasi Madaniydir.',
  },
  {
    id: 2,
    category: 'Hadis ilmi',
    questionUz: 'Eng sahih hadis toʻplami hisoblangan «Sahihi Buxoriy» muallifi kim?',
    optionsUz: [
      'Imom Muslim',
      'Imom Termiziy',
      'Imom Ismoil al-Buxoriy',
      'Imom Nasaiy',
    ],
    correctIndex: 2,
    explanationUz: 'Abu Abdulloh Muhammad ibn Ismoil al-Buxoriy (194–256 hijriy) islom olamidagi eng sahih kitob — «Al-Jomeʼ as-sahih» muallididir.',
  },
  {
    id: 3,
    category: 'Fiqh va Ibodat',
    questionUz: 'Islom dinining besh ustunidan biri boʻlgan zakot qanday ibodat turi hisoblanadi?',
    optionsUz: [
      'Jismoniy ibodat',
      'Moliyaviy ibodat',
      'Faqat ogʻzaki zikr',
      'Ixtiyoriy xayriya',
    ],
    correctIndex: 1,
    explanationUz: 'Zakot — boyligi nisob miqdoriga yetgan musulmonlarning muhtojlarga berishi fariz boʻlgan moliyaviy ibodatdir.',
  },
  {
    id: 4,
    category: 'Tarix va Asaka',
    questionUz: 'Fargʻona vodiysi va Movarounnahrda yetishib chiqqan buyuk hanafiy faqihlari qaysi mazhabga amal qilishgan?',
    optionsUz: [
      'Imom Molik mazhabiga',
      'Imom Shofeʼiy mazhabiga',
      'Imom Aʼzam Abu Hanifa mazhabiga',
      'Imom Ahmad ibn Hanbal mazhabiga',
    ],
    correctIndex: 2,
    explanationUz: 'Movarounnahr va Fargʻona vodiysi, jumladan Andijon va Asaka ulamolari asosan Imom Aʼzam Abu Hanifa rahimahullohning hanafiy mazhabiga amal qilishgan.',
  },
  {
    id: 5,
    category: 'Axloq va Odob',
    questionUz: 'Rasululloh sollallohu alayhi vasallam tavsiya etgan «Sayyidul Istigʻfor» qaysi maqsadda oʻqiladi?',
    optionsUz: [
      'Rizq moʻl boʻlishi uchun',
      'Gunohlarni magʻfirat qilishini soʻrab Allohga iltijo qilish uchun',
      'Safar oldidan oʻqiladigan duo',
      'Uyqudan oldin oʻqiladigan oyat',
    ],
    correctIndex: 1,
    explanationUz: 'Sayyidul Istigʻfor — bandaning Alloh taologa chin dildan tavba qilishi, gunohlarini eʼtirof etishi va magʻfirat soʻrashining eng ulugʻ namunasidir.',
  },
];

export const QuizView: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isQuizFinished, setIsQuizFinished] = useState(false);

  const currentQ = ISLAMIC_QUIZ_QUESTIONS[currentIndex];

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    if (index === currentQ.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex + 1 < ISLAMIC_QUIZ_QUESTIONS.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsQuizFinished(true);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setScore(0);
    setIsAnswered(false);
    setIsQuizFinished(false);
  };

  return (
    <div className="space-y-8 pb-16 max-w-4xl mx-auto">
      {/* Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#c5a869]/30 bg-gradient-to-r from-[#031d17] via-[#071614] to-[#04241d] p-6 sm:p-10 text-white shadow-xl">
        <GeometricPattern opacity={0.06} />
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#c5a869] uppercase tracking-wider">
            <Award className="w-4 h-4 text-[#c5a869]" />
            <span>Asaka Ziyo Maʼrifiy Bilim Testi</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-white">
            Islomiy Bilimlar Viktorinasi
          </h1>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Qurʼon, hadis, fiqh va islom tarixi boʻyicha oʻz bilimingizni sinab koʻring va bilimlaringizni boyiting.
          </p>
        </div>
      </div>

      {!isQuizFinished ? (
        <Card elevated className="p-6 sm:p-8 space-y-6 border-[#c5a869]/30 bg-stone-900/60 backdrop-blur-md">
          {/* Progress Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <span className="px-3 py-1 rounded-full bg-[#c5a869]/20 text-[#c5a869] text-xs font-bold font-mono-numbers">
              {currentQ.category}
            </span>
            <span className="text-xs text-stone-400 font-mono-numbers">
              Savol {currentIndex + 1} / {ISLAMIC_QUIZ_QUESTIONS.length}
            </span>
          </div>

          {/* Question Text */}
          <div className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-white leading-snug">
              {currentQ.questionUz}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="space-y-3">
            {currentQ.optionsUz.map((opt, idx) => {
              let btnStyle = 'border-white/10 bg-black/30 hover:border-[#c5a869]/60 text-stone-200';
              if (isAnswered) {
                if (idx === currentQ.correctIndex) {
                  btnStyle = 'border-emerald-500 bg-emerald-500/20 text-emerald-200 font-bold';
                } else if (idx === selectedOption) {
                  btnStyle = 'border-rose-500 bg-rose-500/20 text-rose-200';
                } else {
                  btnStyle = 'border-white/10 bg-black/20 opacity-50 text-stone-400';
                }
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswered}
                  className={`w-full p-4 rounded-xl border text-left text-xs sm:text-sm transition-all flex items-center justify-between cursor-pointer ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isAnswered && idx === currentQ.correctIndex && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 ml-2" />
                  )}
                  {isAnswered && idx === selectedOption && idx !== currentQ.correctIndex && (
                    <XCircle className="w-5 h-5 text-rose-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation if answered */}
          {isAnswered && (
            <div className="p-4 rounded-xl bg-[#051d18] border border-[#c5a869]/40 space-y-2 animate-fade-in">
              <div className="font-bold text-[#c5a869] text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Ilmiy Izoh:</span>
              </div>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                {currentQ.explanationUz}
              </p>
            </div>
          )}

          {/* Next Button */}
          {isAnswered && (
            <div className="flex justify-end pt-2">
              <Button variant="primary" onClick={handleNextQuestion} className="gap-2">
                <span>{currentIndex + 1 < ISLAMIC_QUIZ_QUESTIONS.length ? 'Keyingi Savol' : 'Natijani Koʻrish'}</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <Card elevated className="p-8 sm:p-12 text-center space-y-6 border-[#c5a869]/40 bg-stone-900/80 backdrop-blur-md">
          <div className="w-20 h-20 rounded-full bg-[#c5a869]/20 text-[#c5a869] flex items-center justify-center mx-auto shadow-xl">
            <Award className="w-10 h-10 animate-bounce" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
              Viktorina yakunlandi!
            </h2>
            <p className="text-sm text-stone-300">
              Siz {ISLAMIC_QUIZ_QUESTIONS.length} ta savoldan <span className="font-bold text-[#c5a869] font-mono-numbers text-lg">{score}</span> tasiga toʻgʻri javob berdingiz.
            </p>
          </div>

          <div className="pt-4 flex justify-center">
            <Button variant="primary" onClick={handleRestartQuiz} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              <span>Qaytadan Boshlash</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
