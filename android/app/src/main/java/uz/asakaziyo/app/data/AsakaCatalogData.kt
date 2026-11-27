package uz.asakaziyo.app.data

/**
 * ASAKA ZIYO v5.0.0 — Verified Offline-First Islamic Reference Catalog
 *
 * - Complete 114-Surah metadata with accurate Ayah counts, Juz starts (1..30), and Madina Mushaf start pages (1..604).
 * - Verified Sahih Hadiths, Authentic Prophetic Duas, and Daily Dhikr presets available even without internet.
 * - Actual Arabic Qur'an ayahs are loaded ONLY from verified Uthmani Mushaf API / cached SQLite (NEVER AI-generated).
 */
object AsakaCatalogData {

    val allSurahs: List<SurahSummary> = listOf(
        SurahSummary(1, "Fotiha", "الفاتحة", 7, "Makkiy", 1, 1),
        SurahSummary(2, "Baqara", "البقرة", 286, "Madaniy", 1, 2),
        SurahSummary(3, "Oli Imron", "آل عمران", 200, "Madaniy", 3, 50),
        SurahSummary(4, "Niso", "النساء", 176, "Madaniy", 4, 77),
        SurahSummary(5, "Moida", "المائدة", 120, "Madaniy", 6, 106),
        SurahSummary(6, "Anʼom", "الأنعام", 165, "Makkiy", 7, 128),
        SurahSummary(7, "Aʼrof", "الأعراف", 206, "Makkiy", 8, 151),
        SurahSummary(8, "Anfol", "الأنفال", 75, "Madaniy", 9, 177),
        SurahSummary(9, "Tavba", "التوبة", 129, "Madaniy", 10, 187),
        SurahSummary(10, "Yunus", "يونس", 109, "Makkiy", 11, 208),
        SurahSummary(11, "Hud", "هود", 123, "Makkiy", 11, 221),
        SurahSummary(12, "Yusuf", "يوسف", 111, "Makkiy", 12, 235),
        SurahSummary(13, "Raʼd", "الرعد", 43, "Madaniy", 13, 249),
        SurahSummary(14, "Ibrohim", "إبراهيم", 52, "Makkiy", 13, 255),
        SurahSummary(15, "Hijr", "الحجر", 99, "Makkiy", 14, 262),
        SurahSummary(16, "Nahl", "النحل", 128, "Makkiy", 14, 267),
        SurahSummary(17, "Isro", "الإسراء", 111, "Makkiy", 15, 282),
        SurahSummary(18, "Kahf", "الكهف", 110, "Makkiy", 15, 293),
        SurahSummary(19, "Maryam", "مريم", 98, "Makkiy", 16, 305),
        SurahSummary(20, "Toha", "طه", 135, "Makkiy", 16, 312),
        SurahSummary(21, "Anbiyo", "الأنبياء", 112, "Makkiy", 17, 322),
        SurahSummary(22, "Haj", "الحج", 78, "Madaniy", 17, 332),
        SurahSummary(23, "Muʼminun", "المؤمنون", 118, "Makkiy", 18, 342),
        SurahSummary(24, "Nur", "النور", 64, "Madaniy", 18, 350),
        SurahSummary(25, "Furqon", "الفرقان", 77, "Makkiy", 18, 359),
        SurahSummary(26, "Shuaro", "الشعراء", 227, "Makkiy", 19, 367),
        SurahSummary(27, "Naml", "النمل", 93, "Makkiy", 19, 377),
        SurahSummary(28, "Qasas", "القصص", 88, "Makkiy", 20, 385),
        SurahSummary(29, "Ankabut", "العنكبوت", 69, "Makkiy", 20, 396),
        SurahSummary(30, "Rum", "الروم", 60, "Makkiy", 21, 404),
        SurahSummary(31, "Luqmon", "لقمان", 34, "Makkiy", 21, 411),
        SurahSummary(32, "Sajda", "السجدة", 30, "Makkiy", 21, 415),
        SurahSummary(33, "Ahzob", "الأحزاب", 73, "Madaniy", 21, 418),
        SurahSummary(34, "Sabaʼ", "سبأ", 54, "Makkiy", 22, 428),
        SurahSummary(35, "Fotir", "فاطر", 45, "Makkiy", 22, 434),
        SurahSummary(36, "Yosin", "يس", 83, "Makkiy", 22, 440),
        SurahSummary(37, "Soffat", "الصافات", 182, "Makkiy", 23, 446),
        SurahSummary(38, "Sod", "ص", 88, "Makkiy", 23, 453),
        SurahSummary(39, "Zumar", "الزمر", 75, "Makkiy", 23, 458),
        SurahSummary(40, "Gʻofir", "غافر", 85, "Makkiy", 24, 467),
        SurahSummary(41, "Fussilat", "فصلت", 54, "Makkiy", 24, 477),
        SurahSummary(42, "Shoʻro", "الشورى", 53, "Makkiy", 25, 483),
        SurahSummary(43, "Zuxruf", "الزخرف", 89, "Makkiy", 25, 489),
        SurahSummary(44, "Duxon", "الدخان", 59, "Makkiy", 25, 496),
        SurahSummary(45, "Josiya", "الجاثية", 37, "Makkiy", 25, 499),
        SurahSummary(46, "Ahqof", "الأحقاف", 35, "Makkiy", 26, 502),
        SurahSummary(47, "Muhammad", "محمد", 38, "Madaniy", 26, 507),
        SurahSummary(48, "Fath", "الفتح", 29, "Madaniy", 26, 511),
        SurahSummary(49, "Hujurot", "الحجرات", 18, "Madaniy", 26, 515),
        SurahSummary(50, "Qof", "ق", 45, "Makkiy", 26, 518),
        SurahSummary(51, "Zoriyot", "الذاريات", 60, "Makkiy", 26, 520),
        SurahSummary(52, "Tur", "الطور", 49, "Makkiy", 27, 523),
        SurahSummary(53, "Najm", "النجم", 62, "Makkiy", 27, 526),
        SurahSummary(54, "Qamar", "القمر", 55, "Makkiy", 27, 528),
        SurahSummary(55, "Rahmon", "الرحمن", 78, "Madaniy", 27, 531),
        SurahSummary(56, "Voqea", "الواقعة", 96, "Makkiy", 27, 534),
        SurahSummary(57, "Hadid", "الحديد", 29, "Madaniy", 27, 537),
        SurahSummary(58, "Mujodala", "المجادلة", 22, "Madaniy", 28, 542),
        SurahSummary(59, "Hashr", "الحشر", 24, "Madaniy", 28, 545),
        SurahSummary(60, "Mumtahana", "الممتحنة", 13, "Madaniy", 28, 549),
        SurahSummary(61, "Sof", "الصف", 14, "Madaniy", 28, 551),
        SurahSummary(62, "Juma", "الجمعة", 11, "Madaniy", 28, 553),
        SurahSummary(63, "Munofiqun", "المنافقون", 11, "Madaniy", 28, 554),
        SurahSummary(64, "Tagʻobun", "التغابن", 18, "Madaniy", 28, 556),
        SurahSummary(65, "Taloq", "الطلاق", 12, "Madaniy", 28, 558),
        SurahSummary(66, "Tahrim", "التحريم", 12, "Madaniy", 28, 560),
        SurahSummary(67, "Mulk", "الملك", 30, "Makkiy", 29, 562),
        SurahSummary(68, "Qalam", "القلم", 52, "Makkiy", 29, 564),
        SurahSummary(69, "Haqqo", "الحاقة", 52, "Makkiy", 29, 566),
        SurahSummary(70, "Maorij", "المعارج", 44, "Makkiy", 29, 568),
        SurahSummary(71, "Nuh", "نوح", 28, "Makkiy", 29, 570),
        SurahSummary(72, "Jin", "الجن", 28, "Makkiy", 29, 572),
        SurahSummary(73, "Muzzammil", "المزمل", 20, "Makkiy", 29, 574),
        SurahSummary(74, "Muddassir", "المدثر", 56, "Makkiy", 29, 575),
        SurahSummary(75, "Qiyomat", "القيامة", 40, "Makkiy", 29, 577),
        SurahSummary(76, "Inson", "الإنسان", 31, "Madaniy", 29, 578),
        SurahSummary(77, "Mursalot", "المرسلات", 50, "Makkiy", 29, 580),
        SurahSummary(78, "Nabaʼ", "النبأ", 40, "Makkiy", 30, 582),
        SurahSummary(79, "Noziot", "النازعات", 46, "Makkiy", 30, 583),
        SurahSummary(80, "Abasa", "عبس", 42, "Makkiy", 30, 585),
        SurahSummary(81, "Takvir", "التكوير", 29, "Makkiy", 30, 586),
        SurahSummary(82, "Infitor", "الانفطار", 19, "Makkiy", 30, 587),
        SurahSummary(83, "Mutoffifun", "المطففين", 36, "Makkiy", 30, 587),
        SurahSummary(84, "Inshiqoq", "الانشقاق", 25, "Makkiy", 30, 589),
        SurahSummary(85, "Buruj", "البروج", 22, "Makkiy", 30, 590),
        SurahSummary(86, "Toriq", "الطارق", 17, "Makkiy", 30, 591),
        SurahSummary(87, "Aʼlo", "الأعلى", 19, "Makkiy", 30, 591),
        SurahSummary(88, "Gʻoshiya", "الغاشية", 26, "Makkiy", 30, 592),
        SurahSummary(89, "Fajr", "الفجر", 30, "Makkiy", 30, 593),
        SurahSummary(90, "Balad", "البلد", 20, "Makkiy", 30, 594),
        SurahSummary(91, "Shams", "الشمس", 15, "Makkiy", 30, 595),
        SurahSummary(92, "Layl", "الليل", 21, "Makkiy", 30, 595),
        SurahSummary(93, "Zuho", "الضحى", 11, "Makkiy", 30, 596),
        SurahSummary(94, "Sharh", "الشرح", 8, "Makkiy", 30, 596),
        SurahSummary(95, "Tiyn", "التين", 8, "Makkiy", 30, 597),
        SurahSummary(96, "Alaq", "العلق", 19, "Makkiy", 30, 597),
        SurahSummary(97, "Qadr", "القدر", 5, "Makkiy", 30, 598),
        SurahSummary(98, "Bayyina", "البينة", 8, "Madaniy", 30, 598),
        SurahSummary(99, "Zalzala", "الزلزلة", 8, "Madaniy", 30, 599),
        SurahSummary(100, "Odiyot", "العاديات", 11, "Makkiy", 30, 599),
        SurahSummary(101, "Qoria", "القارعة", 11, "Makkiy", 30, 600),
        SurahSummary(102, "Takosur", "التكاثر", 8, "Makkiy", 30, 600),
        SurahSummary(103, "Asr", "العصر", 3, "Makkiy", 30, 601),
        SurahSummary(104, "Humaza", "الهمزة", 9, "Makkiy", 30, 601),
        SurahSummary(105, "Fil", "الفيل", 5, "Makkiy", 30, 601),
        SurahSummary(106, "Quraysh", "قريش", 4, "Makkiy", 30, 602),
        SurahSummary(107, "Moʼun", "الماعون", 7, "Makkiy", 30, 602),
        SurahSummary(108, "Kavsar", "الكوثر", 3, "Makkiy", 30, 602),
        SurahSummary(109, "Kofirun", "الكافرون", 6, "Makkiy", 30, 603),
        SurahSummary(110, "Nasr", "النصر", 3, "Madaniy", 30, 603),
        SurahSummary(111, "Masad", "المسد", 5, "Makkiy", 30, 603),
        SurahSummary(112, "Ixlos", "الإخلاص", 4, "Makkiy", 30, 604),
        SurahSummary(113, "Falaq", "الفلق", 5, "Makkiy", 30, 604),
        SurahSummary(114, "Nos", "الناس", 6, "Makkiy", 30, 604)
    )

    val sahihHadiths: List<HadithItem> = listOf(
        HadithItem(
            titleUz = "Qurʼonni oʻrganish va oʻrgatish fazilati",
            textUz = "«Sizlarning eng yaxshilaringiz Qurʼonni oʻrgangan va uni boshqalarga oʻrgatganlaringizdir».",
            source = "Imom Buxoriy rivoyati (5027)"
        ),
        HadithItem(
            titleUz = "Amallar niyatga bogʻliqdir",
            textUz = "«Albatta, amallar niyatlarga qarab baholanadi. Har bir kishi niyat qilgan narsasiga erishadi».",
            source = "Imom Buxoriy va Imom Muslim"
        ),
        HadithItem(
            titleUz = "Allohga eng mahbub amal",
            textUz = "«Alloh taologa amallarning eng mahbubi — oz boʻlsa ham davomli qilinadiganidir».",
            source = "Imom Buxoriy (6464), Imom Muslim (782)"
        ),
        HadithItem(
            titleUz = "Tilga yengil, mezonda ogʻir zikr",
            textUz = "«Ikki kalima borki, tilga yengil, tarozida ogʻir va Rahmonga suyuklidir: Subhanallohi va bihamdihi, Subhanallohil Aziym».",
            source = "Imom Buxoriy (6406)"
        ),
        HadithItem(
            titleUz = "Goʻzal axloq",
            textUz = "«Moʻminlarning iymoni eng komili — axloqi eng goʻzal boʻlganidir».",
            source = "Imom Termiziy (1162)"
        )
    )

    val authenticDuas: List<DuaItem> = listOf(
        DuaItem(
            titleUz = "Ilm ziyoda boʻlishi duosi",
            arabic = "رَبِّ زِدْنِي عِلْمًا",
            transliteration = "Robbi zidniy ʼilmaa",
            translationUz = "Parvardigorim, ilmimni ziyoda qilgin. (Toha surasi, 114-oyat)"
        ),
        DuaItem(
            titleUz = "Dunyo va oxirat yaxshiligi duosi",
            arabic = "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
            transliteration = "Robbanaa aatinaa fid-dunyaa hasanatan va fil-aaxiroti hasanatan va qinaa ʼazaaban-naar",
            translationUz = "Parvardigorimiz! Bizga bu dunyoda ham yaxshilik ato et, oxiratda ham yaxshilik ato et va bizni doʻzax azobidan asra! (Baqara, 201)"
        ),
        DuaItem(
            titleUz = "Tonggi va kechki himoya duosi",
            arabic = "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
            transliteration = "Bismillaahillaziy laa yazurru maʼasmihi shayʼun fil-arzi va laa fis-samaaʼi va huvas-samiyʼul-ʼaliym",
            translationUz = "Uning ismi bilan yeru osmonda biror narsa zarar yetkaza olmaydigan Allohning nomi bilan boshlayman. U eshituvchi va biluvchidir."
        ),
        DuaItem(
            titleUz = "Ota-ona haqqiga duo",
            arabic = "رَبِّ ارْحَمْهُمَا كَمَا رَبَّيَانِي صَغِيرًا",
            transliteration = "Robbirhamhumaa kamaa robbayaaniy sogʻiyroo",
            translationUz = "Parvardigorim! Meni goʻdakligimda tarbiyalab oʻstirganlaridek, ularga rahm qilgin. (Isro, 24)"
        )
    )

    val dhikrPresets: List<Triple<String, String, Int>> = listOf(
        Triple("Subhanalloh", "سُبْحَانَ اللَّهِ", 33),
        Triple("Alhamdulillah", "الْحَمْدُ لِلَّهِ", 33),
        Triple("Allohu Akbar", "اللَّهُ أَكْبَرُ", 33),
        Triple("Astagʻfirulloh", "أَسْتَغْفِرُ اللَّهَ", 100),
        Triple("Salovot", "اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ", 100)
    )
}
