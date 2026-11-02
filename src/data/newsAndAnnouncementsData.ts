import { AnnouncementItem, NewsItem } from '../types';

export const COMMUNITY_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Asaka markaziy jome masjidida yangi zamonaviy qiroat zali va kutubxona foydalanishga topshirildi',
    publishedDate: '2-Noyabr, 2026',
    category: 'Masjid hayoti',
    summary: 'Asaka shahridagi markaziy jome masjidida yoshlar va qiroat ihlosmandlari uchun nodir qoʻlyozmalar va zamonaviy kitoblarga ega ziyo maskani ochildi.',
    content: 'Asaka markaziy jome masjidi qoshida yangi taʼmirdan chiqqan kutubxona va tajvid xonasi oʻz ishini boshladi. Unda 3000 dan ziyod diniy va maʼrifiy adabiyotlar, fiqh, hadis, tafsir kitoblari jamlangan boʻlib, shahar aholisi uchun mutolaa qilish imkoniyati yaratildi.',
    source: 'Asaka Ziyo axborot xizmati',
    imageUrl: '/src/assets/images/islamic_scholarship_library_1793634659800.jpg',
    isImportant: true,
    translations: {
      'uz-Cyrl': {
        status: 'PUBLISHED',
        title: 'Асака марказий жоме масжидида янги замонавий қироат зали ва кутубхона фойдаланишга топширилди',
        summary: 'Асака шаҳридаги марказий жоме масжидида ёшлар ва қироат ихлосмандлари учун нодир қўлёзмалар ва замонавий китобларга эга зиё маскани очилди.',
        content: 'Асака марказий жоме масжиди қошида янги таъмирдан чиққан кутубхона ва тажвид хонаси ўз ишини бошлади.',
      },
      ru: {
        status: 'PUBLISHED',
        title: 'В центральной соборной мечети Асаки открылись новый современный зал для чтения Корана и библиотека',
        summary: 'При соборной мечети города Асака начал функционировать духовный центр с редкими рукописями и современными книгами.',
        content: 'В соборной мечети города Асака завершился ремонт библиотеки и класса таджвида. В фонде собрано свыше 3000 томов исламской литературы.',
      },
      en: {
        status: 'PUBLISHED',
        title: 'New Quran Recitation Hall and Islamic Library Inaugurated at Asaka Central Mosque',
        summary: 'A scholarly center housing rare manuscripts and contemporary references has opened for community youth and reciters in Asaka.',
        content: 'A newly renovated library and tajweed learning studio have commenced activities at Asaka Central Juma Mosque, featuring over 3,000 volumes.',
      },
    },
  },
  {
    id: 'news-2',
    title: 'Andijon viloyati boʻyicha qorilar musobaqasining tuman bosqichlari boshlanmoqda',
    publishedDate: '30-Oktyabr, 2026',
    category: 'Musobaqa va anjuman',
    summary: 'Yoshlar oʻrtasida Qurʼoni Karimni yod olish va chiroyli tilovat qilish boʻyicha viloyat koʻrik-tanlovining saralash bosqichlari eʼlon qilindi.',
    content: 'Oʻzbekiston musulmonlari idorasi Andijon viloyat vakilligi tashabbusi bilan hududlarda anʼanaviy Qurʼon musobaqasi oʻtkazilishi belgilandi. Asaka tumani vakillari ham bir necha yoʻnalishda ishtirok etishi kutilmoqda.',
    source: 'OʻMI Andijon vakilligi',
    imageUrl: '/src/assets/images/asaka_islamic_architecture_1793634657962.jpg',
    translations: {
      'uz-Cyrl': {
        status: 'PUBLISHED',
        title: 'Андижон вилояти бўйича қорилар мусобақасининг туман босқичлари бошланмоқда',
        summary: 'Ёшлар ўртасида Қуръони Каримни ёд олиш ва чиройли тиловат қилиш бўйича вилоят кўрик-танловининг саралаш босқичлари эълон қилинди.',
      },
      ru: {
        status: 'PUBLISHED',
        title: 'В Андижанской области стартуют районные отборочные этапы конкурса чтецов Корана',
        summary: 'Объявлены отборочные туры регионального конкурса среди молодежи по заучиванию и благозвучной декламации Священного Корана.',
      },
      en: {
        status: 'PUBLISHED',
        title: 'District Qualifying Rounds of the Regional Quran Reciters Competition Begin in Andijan',
        summary: 'Regional qualifying rounds for youth in memorization (hifz) and melodious recitation of the Holy Quran announced.',
      },
    },
  },
];

export const COMMUNITY_ANNOUNCEMENTS: AnnouncementItem[] = [
  {
    id: 'ann-1',
    title: 'Juma maʼruzasi: «Qoʻshnichilik odoblari va oʻzaro mehr-oqibat»',
    type: 'juma',
    typeLabelUz: 'Juma maʼruzasi',
    date: '6-Noyabr, 2026 (Juma)',
    time: '12:15',
    location: 'Asaka Markaziy Jome Masjidi',
    speaker: 'Bosh imom-xatib',
    description: 'Ushbu haftadagi juma suhbatida islomda qoʻshnining haq-huquqlari, yoshlarga tarbiya va mahallada tinchlik-totuvlikni asrash mavzusi yoritiladi.',
    isPinned: true,
    translations: {
      'uz-Cyrl': {
        status: 'PUBLISHED',
        title: 'Жума маърузаси: «Қўшничилик одоблари ва ўзаро меҳр-оқибат»',
        description: 'Ушбу ҳафтадаги жума суҳбатида исломда қўшнининг ҳақ-ҳуқуқлари, ёшларга тарбия ва маҳаллада тинчлик-тотувликни асраш мавзуси ёритилади.',
      },
      ru: {
        status: 'PUBLISHED',
        title: 'Пятничная проповедь: «Этика добрососедства и взаимное милосердие»',
        description: 'В эту пятницу проповедь будет посвящена правам соседей в Исламе, воспитанию подрастающего поколения и согласию в общине.',
      },
      en: {
        status: 'PUBLISHED',
        title: 'Friday Khutbah: «Neighborly Etiquette and Mutual Benevolence»',
        description: 'This Friday’s sermon addresses the sacred rights of neighbors in Islamic teachings, youth moral upbringing, and communal harmony.',
      },
    },
  },
  {
    id: 'ann-2',
    title: 'Qurʼon savodxonligi va tajvid darslariga yangi guruhlar qabuli',
    type: 'talim',
    typeLabelUz: 'Ilmiy darslik',
    date: '9-Noyabr, 2026',
    time: 'Haftaning dushanba va payshanba kunlari, 16:00',
    location: 'Masjid qoshidagi oʻquv zali',
    speaker: 'Qori ustozlar',
    description: 'Arab alifbosi, harflar maxraji va Qurʼonni tajvid qoidalari asosida toʻgʻri oʻqishni oʻrganish istagidagi shahar yoshlari taklif etiladi.',
    contact: '+998 (74) 233-00-11',
    translations: {
      'uz-Cyrl': {
        status: 'PUBLISHED',
        title: 'Қуръон саводхонлиги ва тажвид дарсларига янги гуруҳлар қабули',
        description: 'Араб алифбоси, ҳарфлар махражи ва Қуръонни тажвид қоидалари асосида тўғри ўқишни ўрганиш истагидаги ёшлар таклиф этилади.',
      },
      ru: {
        status: 'PUBLISHED',
        title: 'Набор новых групп на уроки грамоты чтения Корана и таджвида',
        description: 'Приглашается молодежь города для изучения арабской графики, правильной артикуляции букв (махрадж) и правил таджвида.',
      },
      en: {
        status: 'PUBLISHED',
        title: 'Enrollment Open for New Quranic Literacy and Tajweed Classes',
        description: 'Youth are invited to master the Arabic alphabet, letter articulation points (makharij), and verified tajweed recitation.',
      },
    },
  },
];
