/**
 * ASAKA ZIYO — Authentic Verified Daily Islamic Content
 * Daily Ayah, Daily Hadith, Daily Dhikr.
 * Backed by canonical Islamic scholarly sources:
 * - Qur'oni Karim ma'nolari tarjimasi (Shayx Muhammad Sodiq Muhammad Yusuf, Alouddin Mansur)
 * - Sahih al-Buxoriy, Sahih Muslim, Sunani Termiziy, Imom Navaviy "Arba'in"
 * - Husnul Muslim (Hisnul Muslim), Al-Azkar (Imom Navaviy)
 */

import { Ayah, HadithItem, DhikrItem, SupportedLocale } from '../types';

export interface DailyIslamicBundle {
  id: string;
  dateKey: string; // e.g. "2026-11-03"
  formattedDateUz: string;
  hijriDateUz: string;
  ayah: Ayah;
  hadith: HadithItem;
  dhikr: DhikrItem;
}

export const AUTHENTIC_DAILY_BUNDLES: DailyIslamicBundle[] = [
  {
    id: 'day-bundle-1',
    dateKey: '2026-11-03',
    formattedDateUz: '3-Noyabr, Seshanba, 2026',
    hijriDateUz: '23 Jumodul avval, 1448',
    ayah: {
      id: 'daily-ayah-1',
      number: 255,
      numberInSurah: 255,
      surahNumber: 2,
      surahNameUz: 'Baqara',
      textAr: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ ۗ مَن ذَا الَّذِي يَشْفَعُ عِندَهُ إِلَّا بِإِذْنِهِ ۚ يَعْلَمُ مَا بَيْنَ أَيْدِيهِمْ وَمَا خَلْفَهُمْ ۖ وَلَا يُحِيطُونَ بِشَيْءٍ مِّنْ عِلْمِهِ إِلَّا بِمَا شَاءَ ۚ وَسِعَ كُرْسِيُّهُ السَّمَاوَاتِ وَالْأَرْضَ ۖ وَلَا يَئُودُهُ حِفْظُهُمَا ۚ وَهُوَ الْعَلِيُّ الْعَظِيمُ',
      translationUz: 'Alloh — Undan oʻzga iloh yoʻq, U Tirik va Qayyum (Doim qoim)dir. Uni mudroq ham, uyqu ham olmas. Osmonlardagi va yerdagi barcha narsalar Unikidir. Uning huzurida Oʻzining iznisiz kim ham shafoat qila olardi?! U ularning oldilaridagi va ortlaridagi barcha narsani bilur. Uning Oʻzi xohlaganidan boshqa ilmiga hech kim erisha olmas. Uning Kursiysi osmonlar va yerni qamrab olgandir. Ularni asrash Unga ogʻirlik qilmas. U Oliy va Buyuk Zotdir.',
      transliterationUz: 'Allohu laa ilaaha illaa Huval-Hayyul-Qoyyuum. Laa taʼxuzuhu sinatuv-va laa navm. Lahuu maa fis-samaavaati va maa fil-ard...',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002255.mp3',
      tafsirSummaryUz: 'Oyatul Kursiy — Qurʼoni Karimdagi eng ulugʻ oyat. U Alloh taoloning yakkaxonligi, qudrati va cheksiz ilmini mukammal ifodalaydi. (Tafsiri Hilol)',
      translations: {
        'uz-Latn': {
          language: 'uz-Latn',
          translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Alloh — Undan oʻzga iloh yoʻq, U Tirik va Qayyum (Doim qoim)dir. Uni mudroq ham, uyqu ham olmas. Osmonlardagi va yerdagi barcha narsalar Unikidir...',
          tafsir: 'Oyatul Kursiy — Qurʼoni Karimdagi eng ulugʻ oyat boʻlib, uni oʻqigan kishi tonggacha yoki kechgacha jin va shayton yomonligidan panohda boʻladi.',
        },
        'uz-Cyrl': {
          language: 'uz-Cyrl',
          translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф',
          source: 'Тафсири Ҳилол',
          version: '2021',
          text: 'Аллоҳ — Ундан ўзга илоҳ йўқ, У Ҳайй (Тирик) ва Қайюм (Доим қоим)дир. Уни мудроқ ҳам, уйқу ҳам олмас...',
          tafsir: 'Оятал Курсий — Қуръони Каримдаги энг улуғ оят бўлиб, қалбга тавҳид нури ва тинчлик ато этади.',
        },
        'uz-Latn-new': {
          language: 'uz-Latn-new',
          translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Alloh — Undan özga iloh yöq, U Tirik va Qayyum (Doim qoim)dir. Uni mudroq ham, uyqu ham olmas...',
        },
        ru: {
          language: 'ru',
          translator: 'Э. Р. Кулиев',
          source: 'Смысловой перевод Священного Корана',
          version: '2012',
          text: 'Аллах — нет божества, кроме Него, Живого, Вседержителя. Им не овладевают ни дремота, ни сон. Ему принадлежит то, что на небесах, и то, что на земле...',
        },
        en: {
          language: 'en',
          translator: 'Sahih International',
          source: 'The Qur’an: English Meanings',
          version: '1997',
          text: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep...',
        },
      },
    },
    hadith: {
      id: 'daily-hadith-1',
      collection: 'bukhari',
      collectionNameUz: 'Sahihi Buxoriy',
      number: 1,
      chapterUz: 'Vahiyning boshlanishi va Niyat bobi',
      narratorUz: 'Hazrati Umar ibn al-Xattob roziyallohu anhu',
      textAr: 'إِنَّمَا الأَعْمَالُ بِالنِّيَّاتِ، وَإِنَّمَا لِكُلِّ امْرِئٍ مَا نَوَى، فَمَنْ كَانَتْ هِجْرَتُهُ إِلَى دُنْيَا يُصِيبُهَا أَوْ إِلَى امْرَأَةٍ يَنْكِحُهَا، فَهِجْرَتُهُ إِلَى مَا هَاجَرَ إِلَيْهِ',
      translationUz: '«Albatta, amallar faqat niyatlarga bogʻliqdir. Har bir kishi uchun niyat qilgan narsasigina boʻladi. Bas, kimning hijrati dunyo matohiga yetishish yoki ayolga uylanish uchun boʻlsa, uning hijrati oʻsha koʻzlangan narsasigadir».',
      grade: 'Sahih',
      reference: 'Sahih al-Buxoriy, 1-hadis; Sahih Muslim, 1907-hadis',
      keywords: ['niyat', 'ixlos', 'amal', 'sidq'],
    },
    dhikr: {
      id: 'daily-dhikr-1',
      category: 'sayyidul_istigfor',
      categoryTitleUz: 'Sayyidul Istigʻfor',
      titleUz: 'Sayyidul Istigʻfor (Istigʻforlarning Ulugʻi)',
      textAr: 'اللَّهُمَّ أَنْتَ رَبِّي لاَ إِلَهَ إِلاَّ أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي فَإِنَّهُ لاَ يَغْفِرُ الذُّنُوبَ إِلاَّ أَنْتَ',
      transliterationUz: 'Allohumma Anta Robbiy laa ilaha illa Anta, xolaqtaniy va ana ʻabduka, va ana ʻala ʻahdika va vaʼdika mastataʼtu, aʼuzu bika min sharri ma sonaʼtu, abuuʼu laka biniʼmatika ʻalayya va abuuʼu bizanbiy fagʻfir liy, fainnahu laa yagʻfiruz-zunuba illa Anta.',
      translationUz: '«Yo Alloh! Sen mening Robbitsan, Sendan oʻzga iloh yoʻq. Meni Sen yaratding va men Sening qulingman. Qurbim yetganicha ahding va vaʼdangdaman. Qilgan ishlarimning yomonligidan Sendan panoh soʻrayman. Menga bergan neʼmatingni eʼtirof qilaman va gunohlarimni tan olaman. Bas, meni magʻfirat qilgin, chunki gunohlarni faqat Sengina kechirursan».',
      targetCount: 1,
      virtueUz: 'Rasululloh ﷺ: «Kim bu duoni kunduzi qatʼiy ishonch bilan aytsa va shu kuni kech kirgunicha vafot etsa, jannat ahlidandir. Kim uni kechasi aytib, tong otguncha vafot etsa, u ham jannat ahlidandir».',
      source: 'Sahih al-Buxoriy, 6306-hadis (Shaddod ibn Avs roziyallohu anhudan)',
    },
  },
  {
    id: 'day-bundle-2',
    dateKey: '2026-11-04',
    formattedDateUz: '4-Noyabr, Chorshanba, 2026',
    hijriDateUz: '24 Jumodul avval, 1448',
    ayah: {
      id: 'daily-ayah-2',
      number: 186,
      numberInSurah: 186,
      surahNumber: 2,
      surahNameUz: 'Baqara',
      textAr: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ ۖ أُجِيبُ دَعْوَةَ الدَّاعِ إِذَا دَعَانِ ۖ فَلْيَسْتَجِيبُوا لِي وَلْيُؤْمِنُوا بِي لَعَلَّهُمْ يَرْشُدُونَ',
      translationUz: 'Bandalarim sendan Men haqimda soʻrasalar, bas, Men albatta ularga yaqinman. Duo qiluvchi Menga duo qilgan vaqtida uning duosini ijobat qilaman. Bas, toʻgʻri yoʻlga tushishlari uchun Menga ijobat qilsinlar va Menga iymon keltirsinlar.',
      transliterationUz: 'Va iza saʼalaka ʻibaadiy ʻanniy fainniy qoriib, ujiibu daʼvatad-daaʻi iza daʻaani...',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002186.mp3',
      tafsirSummaryUz: 'Ushbu oyat Alloh taoloning bandalariga nihoyatda yaqinligini, Oʻziga iltijo qilgan qalbni hech qachon quruq qaytarmasligini bayon qiladi.',
      translations: {
        'uz-Latn': {
          language: 'uz-Latn',
          translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Bandalarim sendan Men haqimda soʻrasalar, bas, Men albatta yaqinman. Duo qiluvchi Menga duo qilgan vaqtida uning duosini ijobat qilaman...',
        },
        'uz-Cyrl': {
          language: 'uz-Cyrl',
          translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф',
          source: 'Тафсири Ҳилол',
          version: '2021',
          text: 'Бандаларим сендан Мен ҳақимда сўрасалар, бас, Мен албатта яқинман. Дуо қилувчи Менга дуо қилган вақтида дуосини ижобат қиламан...',
        },
        'uz-Latn-new': {
          language: 'uz-Latn-new',
          translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Bandalarim sendan Men haqimda sörasalar, bas, Men albatta yaqinman...',
        },
        ru: {
          language: 'ru',
          translator: 'Э. Р. Кулиев',
          source: 'Смысловой перевод Священного Корана',
          version: '2012',
          text: 'Если Мои рабы спросят тебя обо Мне, то ведь Я близок и отвечаю на зов молящегося, когда он взывает ко Мне...',
        },
        en: {
          language: 'en',
          translator: 'Sahih International',
          source: 'The Qur’an: English Meanings',
          version: '1997',
          text: 'And when My servants ask you concerning Me, indeed I am near. I respond to the invocation of the supplicant when he calls upon Me...',
        },
      },
    },
    hadith: {
      id: 'daily-hadith-2',
      collection: 'bukhari',
      collectionNameUz: 'Sahihi Buxoriy',
      number: 13,
      chapterUz: 'Iymon kitobi',
      narratorUz: 'Anas ibn Molik roziyallohu anhu',
      textAr: 'لاَ يُؤْمِنُ أَحَدُكُمْ حَتَّى يُحِبَّ لِأَخِيهِ مَا يُحِبُّ لِنَفْسِهِ',
      translationUz: '«Sizlardan birortangiz oʻzi uchun yaxshi koʻrgan narsani birodari uchun ham ravo koʻrmaguncha toʻlaqonli moʻmin boʻla olmaydi».',
      grade: 'Sahih',
      reference: 'Sahih al-Buxoriy, 13-hadis; Sahih Muslim, 45-hadis',
      keywords: ['iymon', 'birodarlik', 'muhabbat', 'saxovat'],
    },
    dhikr: {
      id: 'daily-dhikr-2',
      category: 'tonggi',
      categoryTitleUz: 'Tonggi zikrlar',
      titleUz: 'Tonggi poklanish va ofatlardan panoh duosi',
      textAr: 'بِسْمِ اللَّهِ الَّذِي لاَ يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الأَرْضِ وَلاَ فِي السَّمَاءِ وَهُوَ السَّمِيعُ العَلِيمُ',
      transliterationUz: 'Bismillahillaziy laa yadurru maʻasmihii shayʼun fil-ardi va laa fis-samaaʼi va Huvas-Samiyʻul-ʻAliym.',
      translationUz: '«Allohning ismi ila tong ottirdim. Uning ismi bilan na yerda va na osmonda hech bir narsa zarar yetkaza olmas. U Eshituvchi va Biluvchi Zotdir».',
      targetCount: 3,
      virtueUz: 'Rasululloh ﷺ: «Kim ertalab va kechqurun uch marta ushbu duoni aytsa, unga hech bir balo-ofat zarar bera olmaydi».',
      source: 'Sunani Termiziy, 3388-hadis; Sunani Abu Dovud, 5088-hadis (Sahih)',
    },
  },
  {
    id: 'day-bundle-3',
    dateKey: '2026-11-05',
    formattedDateUz: '5-Noyabr, Payshanba, 2026',
    hijriDateUz: '25 Jumodul avval, 1448',
    ayah: {
      id: 'daily-ayah-3',
      number: 28,
      numberInSurah: 28,
      surahNumber: 13,
      surahNameUz: 'Raʼd',
      textAr: 'الَّذِينَ آمَنُوا وَتَطْمَئِنُّ قُلُوبُهُم بِذِكْرِ اللَّهِ ۗ أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ',
      translationUz: 'Ular iymon keltirgan va Allohning zikri bilan qalblari orom oladigan zotlardir. Ogoh boʻlingizki, Allohning zikri ila qalblar orom va xotirjamlik topur!',
      transliterationUz: 'Allaziyna aamanuu va tatmaʼinnu quluubuhum bizikrilloh, alaa bizikrillahi tatmaʼinnul-quluub.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/013028.mp3',
      tafsirSummaryUz: 'Inson qalbining yagona haqiqiy shifosi va xotirjamligi Allohni eslash va Uning zikrida doimiy boʻlishdadir.',
      translations: {
        'uz-Latn': {
          language: 'uz-Latn',
          translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Ular iymon keltirgan va Allohning zikri bilan qalblari orom oladigan zotlardir. Ogoh boʻlingizki, Allohning zikri ila qalblar orom topur!',
        },
        'uz-Cyrl': {
          language: 'uz-Cyrl',
          translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф',
          source: 'Тафсири Ҳилол',
          version: '2021',
          text: 'Улар иймон келтирган ва Аллоҳнинг зикри билан қалблари ором оладиган зотлардир. Огоҳ бўлингизким, Аллоҳнинг зикри ила қалблар ором топур!',
        },
        'uz-Latn-new': {
          language: 'uz-Latn-new',
          translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Ular iymon keltirgan va Allohning zikri bilan qalblari orom oladigan zotlardir...',
        },
        ru: {
          language: 'ru',
          translator: 'Э. Р. Кулиев',
          source: 'Смысловой перевод Священного Корана',
          version: '2012',
          text: 'Они уверовали, и их сердца утешаются поминанием Аллаха. Разве не поминанием Аллаха утешаются сердца?',
        },
        en: {
          language: 'en',
          translator: 'Sahih International',
          source: 'The Qur’an: English Meanings',
          version: '1997',
          text: 'Those who have believed and whose hearts are assured by the remembrance of Allah. Unquestionably, by the remembrance of Allah hearts are assured.',
        },
      },
    },
    hadith: {
      id: 'daily-hadith-3',
      collection: 'muslim',
      collectionNameUz: 'Sahihi Muslim',
      number: 2699,
      chapterUz: 'Birodarga koʻmak berish va musibatni aritish',
      narratorUz: 'Abu Hurayra roziyallohu anhu',
      textAr: 'مَنْ نَفَّسَ عَنْ مُؤْمِنٍ كُرْبَةً مِنْ كُرَبِ الدُّنْيَا نَفَّسَ اللَّهُ عَنْهُ كُرْبَةً مِنْ كُرَبِ يَوْمِ الْقِيَامَةِ، وَمَنْ يَسَّرَ عَلَى مُعْسِرٍ يَسَّرَ اللَّهُ عَلَيْهِ فِي الدُّنْيَا وَالآخِرَةِ، وَاللَّهُ فِي عَوْنِ الْعَبْدِ مَا كَانَ الْعَبْدُ فِي عَوْنِ أَخِيهِ',
      translationUz: '«Kim bir moʻminning dunyo gʻamlaridan birini aritsa, Alloh undan Qiyomat kunining gʻamlaridan birini aritadi. Kim qiyinchilikka uchragan kishiga yengillik tugʻdirsa, Alloh unga dunyo-yu oxiratda yengillik beradi. Banda oʻz birodarining yordamida boʻlar ekan, Alloh ham uning yordamidadir».',
      grade: 'Sahih',
      reference: 'Sahih Muslim, 2699-hadis',
      keywords: ['koʻmak', 'yengillik', 'muruvvat', 'ajr'],
    },
    dhikr: {
      id: 'daily-dhikr-3',
      category: 'namozdan_keyin',
      categoryTitleUz: 'Namozdan keyingi tasbeh',
      titleUz: 'Subhanalloh, Alhamdulilloh, Allohu Akbar',
      textAr: 'سُبْحَانَ اللَّهِ (٣٣)، الحَمْدُ لِلَّهِ (٣٣)، اللَّهُ أَكْبَرُ (٣٣)، لاَ إِلَهَ إِلاَّ اللَّهُ وَحْدَهُ لاَ شَرِيكَ لَهُ',
      transliterationUz: 'Subhanalloh (33 marta), Alhamdulilloh (33 marta), Allohu Akbar (33 marta), Laa ilaha illallohu vahdahu laa shariyka lah, lahul mulku va lahul hamdu va huva ʻala kulli shayʼin qodiir.',
      translationUz: '«Alloh pokdir (33), Hamd Allohgadir (33), Alloh buyukdir (33). Yagona Allohdan oʻzga iloh yoʻq, Uning sherigi yoʻqdir...»',
      targetCount: 100,
      virtueUz: 'Farz namozlaridan soʻng ushbu tasbehni aytgan kishining gunohlari dengiz koʻpigidek boʻlsa ham kechirilishi bashorat qilingan.',
      source: 'Sahih Muslim, 597-hadis (Abu Hurayra roziyallohu anhudan)',
    },
  },
  {
    id: 'day-bundle-4',
    dateKey: '2026-11-06',
    formattedDateUz: '6-Noyabr, Juma, 2026',
    hijriDateUz: '26 Jumodul avval, 1448',
    ayah: {
      id: 'daily-ayah-4',
      number: 9,
      numberInSurah: 9,
      surahNumber: 62,
      surahNameUz: 'Juma',
      textAr: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِذَا نُودِيَ لِلصَّلَاةِ مِن يَوْمِ الْجُمُعَةِ فَاسْعَوْا إِلَىٰ ذِكْرِ اللَّهِ وَذَرُوا الْبَيْعَ ۚ ذَٰلِكُمْ خَيْرٌ لَّكُمْ إِن كُنتُمْ تَعْلَمُونَ',
      translationUz: 'Ey iymon keltirganlar! Juma kunidagi namozga chorlangan vaqtda darhol Allohning zikriga shoshingiz va savdoni toʻxtatingiz! Agar bilsangiz, ana shuning oʻzi sizlar uchun eng yaxshisidir.',
      transliterationUz: 'Yaa ayyuhallaziyna aamanuu iza nuudiya lis-salaati miy-yavmil-jumuʻati fasʻav ilaa zikrillaahi va zarul-bayʻ...',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/062009.mp3',
      tafsirSummaryUz: 'Muborak juma kunining qadri va juma namozining farz amali ekanligini taʼkidlovchi oyati karima.',
      translations: {
        'uz-Latn': {
          language: 'uz-Latn',
          translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Ey iymon keltirganlar! Juma kunidagi namozga chorlangan vaqtda darhol Allohning zikriga shoshingiz va savdo-sotiqni toʻxtatingiz!...',
        },
        'uz-Cyrl': {
          language: 'uz-Cyrl',
          translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф',
          source: 'Тафсири Ҳилол',
          version: '2021',
          text: 'Эй иймон келтирганлар! Жума кунидаги намозга чорланган вақтда дарҳол Аллоҳнинг зикрига шошингиз ва савдони тўхтатингиз!...',
        },
        'uz-Latn-new': {
          language: 'uz-Latn-new',
          translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Ey iymon keltirganlar! Juma kunidagi namozga çorlangan vaqtda darhol Allohning zikriga şoşingiz...',
        },
        ru: {
          language: 'ru',
          translator: 'Э. Р. Кулиев',
          source: 'Смысловой перевод Священного Корана',
          version: '2012',
          text: 'О те, которые уверовали! Когда призывают на намаз в пятничный день, устремляйтесь к поминанию Аллаха и оставьте торговлю...',
        },
        en: {
          language: 'en',
          translator: 'Sahih International',
          source: 'The Qur’an: English Meanings',
          version: '1997',
          text: 'O you who have believed, when [the adhan] is called for the prayer on the day of Jumuah [Friday], then proceed to the remembrance of Allah and leave trade...',
        },
      },
    },
    hadith: {
      id: 'daily-hadith-4',
      collection: 'nawawi',
      collectionNameUz: 'Arbaʼin (Imom Navaviy 40 Hadis)',
      number: 18,
      chapterUz: 'Taqvo va goʻzal xulq',
      narratorUz: 'Abu Zarr Gʻiforiy va Muoz ibn Jabal roziyallohu anhumo',
      textAr: 'اتَّقِ اللَّهَ حَيْثُمَا كُنْتَ، وَأَتْبِعِ السَّيِّئَةَ الْحَسَنَةَ تَمْحُهَا، وَخَالِقِ النَّاسَ بِخُلُقٍ حَسَنٍ',
      translationUz: '«Qayerda boʻlsang ham Allohga taqvo qil! Yomonlik ketidan darhol yaxshilik qil, uni oʻchirib yuboradi. Odamlar bilan goʻzal xulq ila muomala qil!».',
      grade: 'Hasan',
      reference: 'Sunani Termiziy, 1987-hadis; Imom Navaviy toʻplami',
      keywords: ['taqvo', 'tavba', 'goʻzal xulq', 'odob'],
    },
    dhikr: {
      id: 'daily-dhikr-4',
      category: 'tonggi',
      categoryTitleUz: 'Salovot va duo',
      titleUz: 'Rasululloh sollallohu alayhi vasallamga salovot',
      textAr: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ وَعَلَى آلِ إِبْرَاهِيمَ إِنَّكَ حَمِيدٌ مَجِيدٌ',
      transliterationUz: 'Allohumma solli ʻala Muhammadiv-va ʻala aali Muhammad, kama sollayta ʻala Ibrohiyma va ʻala aali Ibrohiym, innaka Hamiydum-Majiyd.',
      translationUz: '«Yo Alloh! Ibrohim va uning oilasiga salovot yuborganingdek, Muhammad va uning oilasiga ham salovot yuborgin. Albatta Sen Hamdu maqtovga loyiq va Buyuk Zotsan».',
      targetCount: 10,
      virtueUz: 'Paygʻambarimiz ﷺ: «Kim menga bitta salovot aytsa, Alloh unga oʻnta rahmat yogʻdiradi va oʻnta xatosini oʻchiradi». (Juma kuni yanada fazilatli).',
      source: 'Sahih Muslim, 408-hadis; Sahih al-Buxoriy, 3370-hadis',
    },
  },
];

/**
 * Deterministically resolve daily content bundle for any date in Asia/Tashkent.
 * Never jumps or shifts randomly throughout the day.
 */
export function getDailyBundleForDate(dateInput?: Date | string): DailyIslamicBundle {
  let targetKey: string;
  if (!dateInput) {
    // Current date in Asia/Tashkent
    const now = new Date();
    targetKey = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' }); // Returns YYYY-MM-DD
  } else if (typeof dateInput === 'string') {
    targetKey = dateInput.slice(0, 10);
  } else {
    targetKey = dateInput.toLocaleDateString('en-CA', { timeZone: 'Asia/Tashkent' });
  }

  // 1. Direct match by date key
  const exact = AUTHENTIC_DAILY_BUNDLES.find((b) => b.dateKey === targetKey);
  if (exact) return exact;

  // 2. Deterministic modular day hash so future / past dates map stably
  const parts = targetKey.split('-').map((p) => parseInt(p, 10));
  const dayHash = Math.abs((parts[0] || 2026) * 365 + (parts[1] || 11) * 31 + (parts[2] || 3));
  const index = dayHash % AUTHENTIC_DAILY_BUNDLES.length;
  const template = AUTHENTIC_DAILY_BUNDLES[index];

  return {
    ...template,
    dateKey: targetKey,
    formattedDateUz: `${parts[2] || 3}-Noyabr, 2026`,
  };
}

/**
 * Get the current active daily bundle for today
 */
export function getActiveDailyBundle(): DailyIslamicBundle {
  return getDailyBundleForDate();
}

/**
 * Get archive of available historical / upcoming daily content days
 */
export function getDailyArchiveBundles(): DailyIslamicBundle[] {
  return AUTHENTIC_DAILY_BUNDLES;
}
