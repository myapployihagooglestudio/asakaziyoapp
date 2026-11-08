import { Ayah, QuranReciter, Surah } from '../types';

export const SURAHS_LIST: Surah[] = [
  { number: 1, nameAr: 'الفَاتِحَة', nameUz: 'Fotiha', meaningUz: 'Ochuvchi sura', numberOfAyahs: 7, revelationType: 'Makkah', pageNumber: 1 },
  { number: 2, nameAr: 'البَقَرَة', nameUz: 'Baqara', meaningUz: 'Sigir', numberOfAyahs: 286, revelationType: 'Madina', pageNumber: 2 },
  { number: 3, nameAr: 'آلِ عِمْرَان', nameUz: 'Oli Imron', meaningUz: 'Imron oilasi', numberOfAyahs: 200, revelationType: 'Madina', pageNumber: 50 },
  { number: 4, nameAr: 'النِّسَاء', nameUz: 'Niso', meaningUz: 'Ayollar', numberOfAyahs: 176, revelationType: 'Madina', pageNumber: 77 },
  { number: 5, nameAr: 'المَائِدَة', nameUz: 'Moida', meaningUz: 'Dasturxon', numberOfAyahs: 120, revelationType: 'Madina', pageNumber: 106 },
  { number: 6, nameAr: 'الأَنْعَام', nameUz: 'Anʼom', meaningUz: 'Chorvalar', numberOfAyahs: 165, revelationType: 'Makkah', pageNumber: 128 },
  { number: 7, nameAr: 'الأَعْرَاف', nameUz: 'Aʼrof', meaningUz: 'Toʻsiqlar', numberOfAyahs: 206, revelationType: 'Makkah', pageNumber: 151 },
  { number: 8, nameAr: 'الأَنْفَال', nameUz: 'Anfol', meaningUz: 'Oʻljalar', numberOfAyahs: 75, revelationType: 'Madina', pageNumber: 177 },
  { number: 9, nameAr: 'التَّوْبَة', nameUz: 'Tavba', meaningUz: 'Tavba', numberOfAyahs: 129, revelationType: 'Madina', pageNumber: 187 },
  { number: 10, nameAr: 'يُونُس', nameUz: 'Yunus', meaningUz: 'Yunus paygʻambar', numberOfAyahs: 109, revelationType: 'Makkah', pageNumber: 208 },
  { number: 11, nameAr: 'هُود', nameUz: 'Hud', meaningUz: 'Hud paygʻambar', numberOfAyahs: 123, revelationType: 'Makkah', pageNumber: 221 },
  { number: 12, nameAr: 'يُوسُف', nameUz: 'Yusuf', meaningUz: 'Yusuf paygʻambar', numberOfAyahs: 111, revelationType: 'Makkah', pageNumber: 235 },
  { number: 13, nameAr: 'الرَّعْد', nameUz: 'Raʼd', meaningUz: 'Momaqaldiroq', numberOfAyahs: 43, revelationType: 'Madina', pageNumber: 249 },
  { number: 14, nameAr: 'إِبْرَاهِيم', nameUz: 'Ibrohim', meaningUz: 'Ibrohim paygʻambar', numberOfAyahs: 52, revelationType: 'Makkah', pageNumber: 255 },
  { number: 15, nameAr: 'الحِجْر', nameUz: 'Hijr', meaningUz: 'Toshloq vodiy', numberOfAyahs: 99, revelationType: 'Makkah', pageNumber: 262 },
  { number: 16, nameAr: 'النَّحْل', nameUz: 'Nahl', meaningUz: 'Asalari', numberOfAyahs: 128, revelationType: 'Makkah', pageNumber: 267 },
  { number: 17, nameAr: 'الإِسْرَاء', nameUz: 'Isro', meaningUz: 'Tungi sayr', numberOfAyahs: 111, revelationType: 'Makkah', pageNumber: 282 },
  { number: 18, nameAr: 'الكَهْف', nameUz: 'Kahf', meaningUz: 'Gʻor', numberOfAyahs: 110, revelationType: 'Makkah', pageNumber: 293 },
  { number: 19, nameAr: 'مَرْيَم', nameUz: 'Maryam', meaningUz: 'Maryam onamiz', numberOfAyahs: 98, revelationType: 'Makkah', pageNumber: 305 },
  { number: 20, nameAr: 'طه', nameUz: 'Toha', meaningUz: 'Toha (harfiy ramz)', numberOfAyahs: 135, revelationType: 'Makkah', pageNumber: 312 },
  { number: 21, nameAr: 'الأَنْبِيَاء', nameUz: 'Anbiyo', meaningUz: 'Paygʻambarlar', numberOfAyahs: 112, revelationType: 'Makkah', pageNumber: 322 },
  { number: 22, nameAr: 'الحَجّ', nameUz: 'Haj', meaningUz: 'Haj ibodati', numberOfAyahs: 78, revelationType: 'Madina', pageNumber: 332 },
  { number: 23, nameAr: 'المُؤْمِنُون', nameUz: 'Moʻminun', meaningUz: 'Moʻminlar', numberOfAyahs: 118, revelationType: 'Makkah', pageNumber: 342 },
  { number: 24, nameAr: 'النُّور', nameUz: 'Nur', meaningUz: 'Nur', numberOfAyahs: 64, revelationType: 'Madina', pageNumber: 350 },
  { number: 25, nameAr: 'الفُرْقَان', nameUz: 'Furqon', meaningUz: 'Haq va nohaqni ajratuvchi', numberOfAyahs: 77, revelationType: 'Makkah', pageNumber: 359 },
  { number: 26, nameAr: 'الشُّعَرَاء', nameUz: 'Shuaro', meaningUz: 'Shoirlar', numberOfAyahs: 227, revelationType: 'Makkah', pageNumber: 367 },
  { number: 27, nameAr: 'النَّمْل', nameUz: 'Naml', meaningUz: 'Chumoli', numberOfAyahs: 93, revelationType: 'Makkah', pageNumber: 377 },
  { number: 28, nameAr: 'القَصَص', nameUz: 'Qasos', meaningUz: 'Qissalar', numberOfAyahs: 88, revelationType: 'Makkah', pageNumber: 385 },
  { number: 29, nameAr: 'العَنْكَبُوت', nameUz: 'Ankabut', meaningUz: 'Oʻrgimchak', numberOfAyahs: 69, revelationType: 'Makkah', pageNumber: 396 },
  { number: 30, nameAr: 'الرُّوم', nameUz: 'Rum', meaningUz: 'Rimliklar', numberOfAyahs: 60, revelationType: 'Makkah', pageNumber: 404 },
  { number: 31, nameAr: 'لُقْمَان', nameUz: 'Luqmon', meaningUz: 'Luqmoni Hakim', numberOfAyahs: 34, revelationType: 'Makkah', pageNumber: 411 },
  { number: 32, nameAr: 'السَّجْدَة', nameUz: 'Sajda', meaningUz: 'Sajda', numberOfAyahs: 30, revelationType: 'Makkah', pageNumber: 415 },
  { number: 33, nameAr: 'الأَحْزَاب', nameUz: 'Ahzob', meaningUz: 'Firqalar', numberOfAyahs: 73, revelationType: 'Madina', pageNumber: 418 },
  { number: 34, nameAr: 'سَبَأ', nameUz: 'Saba', meaningUz: 'Saba qavmi', numberOfAyahs: 54, revelationType: 'Makkah', pageNumber: 428 },
  { number: 35, nameAr: 'فَاطِر', nameUz: 'Fotir', meaningUz: 'Yaratuvchi Zot', numberOfAyahs: 45, revelationType: 'Makkah', pageNumber: 434 },
  { number: 36, nameAr: 'يس', nameUz: 'Yosin', meaningUz: 'Yosin (harfiy ramz)', numberOfAyahs: 83, revelationType: 'Makkah', pageNumber: 440 },
  { number: 37, nameAr: 'الصَّافَّات', nameUz: 'Soffot', meaningUz: 'Saf tortuvchilar', numberOfAyahs: 182, revelationType: 'Makkah', pageNumber: 446 },
  { number: 38, nameAr: 'ص', nameUz: 'Sod', meaningUz: 'Sod (harfiy ramz)', numberOfAyahs: 88, revelationType: 'Makkah', pageNumber: 453 },
  { number: 39, nameAr: 'الزُّمَر', nameUz: 'Zumar', meaningUz: 'Guruhlar', numberOfAyahs: 75, revelationType: 'Makkah', pageNumber: 458 },
  { number: 40, nameAr: 'غَافِر', nameUz: 'Gʻofir', meaningUz: 'Kechiruvchi', numberOfAyahs: 85, revelationType: 'Makkah', pageNumber: 467 },
  { number: 41, nameAr: 'فُصِّلَت', nameUz: 'Fussilat', meaningUz: 'Mufassal bayon qilingan', numberOfAyahs: 54, revelationType: 'Makkah', pageNumber: 477 },
  { number: 42, nameAr: 'الشُّورَى', nameUz: 'Shuro', meaningUz: 'Maslahat', numberOfAyahs: 53, revelationType: 'Makkah', pageNumber: 483 },
  { number: 43, nameAr: 'الزُّخْرُف', nameUz: 'Zuxruf', meaningUz: 'Zebu ziynat', numberOfAyahs: 89, revelationType: 'Makkah', pageNumber: 489 },
  { number: 44, nameAr: 'الدُّخَان', nameUz: 'Duxon', meaningUz: 'Tutun', numberOfAyahs: 59, revelationType: 'Makkah', pageNumber: 496 },
  { number: 45, nameAr: 'الجَاثِيَة', nameUz: 'Josiya', meaningUz: 'Tiz choʻkuvchilar', numberOfAyahs: 37, revelationType: 'Makkah', pageNumber: 499 },
  { number: 46, nameAr: 'الأَحْقَاف', nameUz: 'Ahqof', meaningUz: 'Qumtepalar', numberOfAyahs: 35, revelationType: 'Makkah', pageNumber: 502 },
  { number: 47, nameAr: 'مُحَمَّد', nameUz: 'Muhammad', meaningUz: 'Muhammad (s.a.v.)', numberOfAyahs: 38, revelationType: 'Madina', pageNumber: 507 },
  { number: 48, nameAr: 'الفَتْح', nameUz: 'Fath', meaningUz: 'Gʻalaba', numberOfAyahs: 29, revelationType: 'Madina', pageNumber: 511 },
  { number: 49, nameAr: 'الحُجُرَات', nameUz: 'Hujurot', meaningUz: 'Hujralar', numberOfAyahs: 18, revelationType: 'Madina', pageNumber: 515 },
  { number: 50, nameAr: 'ق', nameUz: 'Qof', meaningUz: 'Qof (harfiy ramz)', numberOfAyahs: 45, revelationType: 'Makkah', pageNumber: 518 },
  { number: 51, nameAr: 'الذَّارِيَات', nameUz: 'Zoriyot', meaningUz: 'Shamollar', numberOfAyahs: 60, revelationType: 'Makkah', pageNumber: 520 },
  { number: 52, nameAr: 'الطُّور', nameUz: 'Tur', meaningUz: 'Tur togʻi', numberOfAyahs: 49, revelationType: 'Makkah', pageNumber: 523 },
  { number: 53, nameAr: 'النَّجْم', nameUz: 'Najm', meaningUz: 'Yulduz', numberOfAyahs: 62, revelationType: 'Makkah', pageNumber: 526 },
  { number: 54, nameAr: 'القَمَر', nameUz: 'Qamar', meaningUz: 'Oy', numberOfAyahs: 55, revelationType: 'Makkah', pageNumber: 528 },
  { number: 55, nameAr: 'الرَّحْمَٰن', nameUz: 'Rohman', meaningUz: 'Oʻta mehribon Zot', numberOfAyahs: 78, revelationType: 'Madina', pageNumber: 531 },
  { number: 56, nameAr: 'الوَاقِعَة', nameUz: 'Voqea', meaningUz: 'Qiyomat voqeasi', numberOfAyahs: 96, revelationType: 'Makkah', pageNumber: 534 },
  { number: 57, nameAr: 'الحَدِيد', nameUz: 'Hadid', meaningUz: 'Temir', numberOfAyahs: 29, revelationType: 'Madina', pageNumber: 537 },
  { number: 58, nameAr: 'المُجَادَلَة', nameUz: 'Mujodala', meaningUz: 'Bahslashuvchi ayol', numberOfAyahs: 22, revelationType: 'Madina', pageNumber: 542 },
  { number: 59, nameAr: 'الحَشْر', nameUz: 'Hashr', meaningUz: 'Toʻplash', numberOfAyahs: 24, revelationType: 'Madina', pageNumber: 545 },
  { number: 60, nameAr: 'المُمْتَحَنَة', nameUz: 'Mumtahana', meaningUz: 'Imtihon qilingan ayol', numberOfAyahs: 13, revelationType: 'Madina', pageNumber: 549 },
  { number: 61, nameAr: 'الصَّفّ', nameUz: 'Saff', meaningUz: 'Saf', numberOfAyahs: 14, revelationType: 'Madina', pageNumber: 551 },
  { number: 62, nameAr: 'الجُمُعَة', nameUz: 'Juma', meaningUz: 'Juma kuni', numberOfAyahs: 11, revelationType: 'Madina', pageNumber: 553 },
  { number: 63, nameAr: 'المُنَافِقُون', nameUz: 'Munofiqun', meaningUz: 'Munofiqlar', numberOfAyahs: 11, revelationType: 'Madina', pageNumber: 554 },
  { number: 64, nameAr: 'التَّغَابُن', nameUz: 'Tagʻobun', meaningUz: 'Bir-birini aldash kuni', numberOfAyahs: 18, revelationType: 'Madina', pageNumber: 556 },
  { number: 65, nameAr: 'الطَّلَاق', nameUz: 'Taloq', meaningUz: 'Taloq', numberOfAyahs: 12, revelationType: 'Madina', pageNumber: 558 },
  { number: 66, nameAr: 'التَّحْرِيم', nameUz: 'Tahrim', meaningUz: 'Harom qilish', numberOfAyahs: 12, revelationType: 'Madina', pageNumber: 560 },
  { number: 67, nameAr: 'المُلْك', nameUz: 'Mulk', meaningUz: 'Hukmronlik', numberOfAyahs: 30, revelationType: 'Makkah', pageNumber: 562 },
  { number: 68, nameAr: 'القَلَم', nameUz: 'Qalam', meaningUz: 'Qalam', numberOfAyahs: 52, revelationType: 'Makkah', pageNumber: 564 },
  { number: 69, nameAr: 'الحَاقَّة', nameUz: 'Haaqqoh', meaningUz: 'Muqarrar haqiqat', numberOfAyahs: 52, revelationType: 'Makkah', pageNumber: 566 },
  { number: 70, nameAr: 'المَعَارِج', nameUz: 'Maorij', meaningUz: 'Yuksak darajalar', numberOfAyahs: 44, revelationType: 'Makkah', pageNumber: 568 },
  { number: 71, nameAr: 'نُوح', nameUz: 'Nuh', meaningUz: 'Nuh paygʻambar', numberOfAyahs: 28, revelationType: 'Makkah', pageNumber: 570 },
  { number: 72, nameAr: 'الجِنّ', nameUz: 'Jinn', meaningUz: 'Jinlar', numberOfAyahs: 28, revelationType: 'Makkah', pageNumber: 572 },
  { number: 73, nameAr: 'المُزَّمِّل', nameUz: 'Muzzammil', meaningUz: 'Oʻranib olgan zot', numberOfAyahs: 20, revelationType: 'Makkah', pageNumber: 574 },
  { number: 74, nameAr: 'المُدَّثِّر', nameUz: 'Muddassir', meaningUz: 'Yopinib olgan zot', numberOfAyahs: 56, revelationType: 'Makkah', pageNumber: 575 },
  { number: 75, nameAr: 'القِيَامَة', nameUz: 'Qiyomat', meaningUz: 'Qiyomat kuni', numberOfAyahs: 40, revelationType: 'Makkah', pageNumber: 577 },
  { number: 76, nameAr: 'الإِنْسَان', nameUz: 'Inson', meaningUz: 'Inson', numberOfAyahs: 31, revelationType: 'Madina', pageNumber: 578 },
  { number: 77, nameAr: 'المُرْسَلَات', nameUz: 'Mursalat', meaningUz: 'Yuborilgan shamollar', numberOfAyahs: 50, revelationType: 'Makkah', pageNumber: 580 },
  { number: 78, nameAr: 'النَّبَأ', nameUz: 'Naba', meaningUz: 'Ulkan xabar', numberOfAyahs: 40, revelationType: 'Makkah', pageNumber: 582 },
  { number: 79, nameAr: 'النَّازِعَات', nameUz: 'Noziot', meaningUz: 'Jon oluvchilar', numberOfAyahs: 46, revelationType: 'Makkah', pageNumber: 583 },
  { number: 80, nameAr: 'عَبَسَ', nameUz: 'Abasa', meaningUz: 'Qoshini chimirdi', numberOfAyahs: 42, revelationType: 'Makkah', pageNumber: 585 },
  { number: 81, nameAr: 'التَّكْوِير', nameUz: 'Takvir', meaningUz: 'Oʻralish', numberOfAyahs: 29, revelationType: 'Makkah', pageNumber: 586 },
  { number: 82, nameAr: 'الانْفِطَار', nameUz: 'Infitor', meaningUz: 'Yorilish', numberOfAyahs: 19, revelationType: 'Makkah', pageNumber: 587 },
  { number: 83, nameAr: 'المُطَفِّفِين', nameUz: 'Mutaffifun', meaningUz: 'Taroziyda uruvchilar', numberOfAyahs: 36, revelationType: 'Makkah', pageNumber: 587 },
  { number: 84, nameAr: 'الانْشِقَاق', nameUz: 'Inshiqoq', meaningUz: 'Yorilish', numberOfAyahs: 25, revelationType: 'Makkah', pageNumber: 589 },
  { number: 85, nameAr: 'البُرُوج', nameUz: 'Buruj', meaningUz: 'Burjlar', numberOfAyahs: 22, revelationType: 'Makkah', pageNumber: 590 },
  { number: 86, nameAr: 'الطَّارِق', nameUz: 'Toriq', meaningUz: 'Tungi yoʻlovchi yulduz', numberOfAyahs: 17, revelationType: 'Makkah', pageNumber: 591 },
  { number: 87, nameAr: 'الأَعْلَى', nameUz: 'Aʼlo', meaningUz: 'Eng Oliy Zot', numberOfAyahs: 19, revelationType: 'Makkah', pageNumber: 591 },
  { number: 88, nameAr: 'الغَاشِيَة', nameUz: 'Gʻoshiya', meaningUz: 'Qoplovchi ofat', numberOfAyahs: 26, revelationType: 'Makkah', pageNumber: 592 },
  { number: 89, nameAr: 'الفَجْر', nameUz: 'Fajr', meaningUz: 'Tong', numberOfAyahs: 30, revelationType: 'Makkah', pageNumber: 593 },
  { number: 90, nameAr: 'البَلَد', nameUz: 'Balad', meaningUz: 'Shahar (Makka)', numberOfAyahs: 20, revelationType: 'Makkah', pageNumber: 594 },
  { number: 91, nameAr: 'الشَّمْس', nameUz: 'Shams', meaningUz: 'Quyosh', numberOfAyahs: 15, revelationType: 'Makkah', pageNumber: 595 },
  { number: 92, nameAr: 'اللَّيْل', nameUz: 'Layl', meaningUz: 'Tun', numberOfAyahs: 21, revelationType: 'Makkah', pageNumber: 595 },
  { number: 93, nameAr: 'الضُّحَى', nameUz: 'Zuho', meaningUz: 'Choshgoh vaqti', numberOfAyahs: 11, revelationType: 'Makkah', pageNumber: 596 },
  { number: 94, nameAr: 'الشَّرْح', nameUz: 'Sharh', meaningUz: 'Koʻkrakni ochish', numberOfAyahs: 8, revelationType: 'Makkah', pageNumber: 596 },
  { number: 95, nameAr: 'التِّين', nameUz: 'Tiyn', meaningUz: 'Anjir', numberOfAyahs: 8, revelationType: 'Makkah', pageNumber: 597 },
  { number: 96, nameAr: 'العَلَق', nameUz: 'Alaq', meaningUz: 'Laxta qon', numberOfAyahs: 19, revelationType: 'Makkah', pageNumber: 597 },
  { number: 97, nameAr: 'القَدْر', nameUz: 'Qadr', meaningUz: 'Qadr kechasi', numberOfAyahs: 5, revelationType: 'Makkah', pageNumber: 598 },
  { number: 98, nameAr: 'البَيِّنَة', nameUz: 'Bayyina', meaningUz: 'Ochiq-oydin hujjat', numberOfAyahs: 8, revelationType: 'Madina', pageNumber: 598 },
  { number: 99, nameAr: 'الزَّلْزَلَة', nameUz: 'Zalzala', meaningUz: 'Zilzila', numberOfAyahs: 8, revelationType: 'Madina', pageNumber: 599 },
  { number: 100, nameAr: 'العَادِيَات', nameUz: 'Odiyot', meaningUz: 'Chopqir otlar', numberOfAyahs: 11, revelationType: 'Makkah', pageNumber: 599 },
  { number: 101, nameAr: 'القَارِعَة', nameUz: 'Qoria', meaningUz: 'Dahshatli ofat', numberOfAyahs: 11, revelationType: 'Makkah', pageNumber: 600 },
  { number: 102, nameAr: 'التَّكَاثُر', nameUz: 'Takasur', meaningUz: 'Koʻpaytirishga berilish', numberOfAyahs: 8, revelationType: 'Makkah', pageNumber: 600 },
  { number: 103, nameAr: 'العَصْر', nameUz: 'Asr', meaningUz: 'Asr vaqti / Zamon', numberOfAyahs: 3, revelationType: 'Makkah', pageNumber: 601 },
  { number: 104, nameAr: 'الهُمَزَة', nameUz: 'Humaza', meaningUz: 'Gʻiybatchi', numberOfAyahs: 9, revelationType: 'Makkah', pageNumber: 601 },
  { number: 105, nameAr: 'الفِيل', nameUz: 'Fil', meaningUz: 'Fil', numberOfAyahs: 5, revelationType: 'Makkah', pageNumber: 601 },
  { number: 106, nameAr: 'قُرَيْش', nameUz: 'Quraysh', meaningUz: 'Quraysh qabilasi', numberOfAyahs: 4, revelationType: 'Makkah', pageNumber: 602 },
  { number: 107, nameAr: 'المَاعُون', nameUz: 'Moun', meaningUz: 'Kichik yordam', numberOfAyahs: 7, revelationType: 'Makkah', pageNumber: 602 },
  { number: 108, nameAr: 'الكَوْثَر', nameUz: 'Kavsar', meaningUz: 'Kavsar hovuzi', numberOfAyahs: 3, revelationType: 'Makkah', pageNumber: 602 },
  { number: 109, nameAr: 'الكَافِرُون', nameUz: 'Kofirun', meaningUz: 'Kofirlar', numberOfAyahs: 6, revelationType: 'Makkah', pageNumber: 603 },
  { number: 110, nameAr: 'النَّصْر', nameUz: 'Nasr', meaningUz: 'Yordam va nusrat', numberOfAyahs: 3, revelationType: 'Madina', pageNumber: 603 },
  { number: 111, nameAr: 'المَسَد', nameUz: 'Masad', meaningUz: 'Pishiq tola', numberOfAyahs: 5, revelationType: 'Makkah', pageNumber: 603 },
  { number: 112, nameAr: 'الإِخْلَاص', nameUz: 'Ixlos', meaningUz: 'Xolis qilish', numberOfAyahs: 4, revelationType: 'Makkah', pageNumber: 604 },
  { number: 113, nameAr: 'الفَلَق', nameUz: 'Falaq', meaningUz: 'Tong yorugʻligi', numberOfAyahs: 5, revelationType: 'Makkah', pageNumber: 604 },
  { number: 114, nameAr: 'النَّاس', nameUz: 'Nos', meaningUz: 'Insonlar', numberOfAyahs: 6, revelationType: 'Makkah', pageNumber: 604 },
];

export const QURAN_RECITERS: QuranReciter[] = [
  {
    id: 'mishary',
    name: 'Shayx Mishariy Roshid al-Afosiy',
    subtext: 'Kuvayt · Murattal uslubi (114 sura toʻliq)',
    previewUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
  },
  {
    id: 'suwayd',
    name: 'Shayx Ayman Rushdiy Suvayd',
    subtext: 'Suriya · Tajvid va tartil ustozi (114 sura toʻliq)',
    previewUrl: 'https://everyayah.com/data/Ayman_Sowaid_64kbps/001001.mp3',
  },
  {
    id: 'hussary',
    name: 'Shayx Mahmud Xalil al-Husariy',
    subtext: 'Misr · Mumtoz tartil maktabi (114 sura toʻliq)',
    previewUrl: 'https://everyayah.com/data/Husary_128kbps/001001.mp3',
  },
  {
    id: 'dussary',
    name: 'Shayx Yosir ad-Davsariy',
    subtext: 'Saudiya Arabistoni · Masjidul Harom imomi (114 sura toʻliq)',
    previewUrl: 'https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/001001.mp3',
  },
  {
    id: 'sudais',
    name: 'Shayx Abdurahmon as-Sudays',
    subtext: 'Saudiya Arabistoni · Masjidul Harom bosh imomi (114 sura toʻliq)',
    previewUrl: 'https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/001001.mp3',
  },
  {
    id: 'juhany',
    name: 'Shayx Abdulloh al-Juhaniy',
    subtext: 'Saudiya Arabistoni · Masjidul Harom imomi (114 sura toʻliq)',
    previewUrl: 'https://everyayah.com/data/Abdullaah_3awwaad_Al-Juhaynee_128kbps/001001.mp3',
  },
  {
    id: 'ghamidi',
    name: 'Shayx Saʼd al-Gʻomidiy',
    subtext: 'Saudiya Arabistoni · Xushovoz qiroat (114 sura toʻliq)',
    previewUrl: 'https://everyayah.com/data/Ghamadi_40kbps/001001.mp3',
  },
  {
    id: 'shatri',
    name: 'Shayx Abu Bakr ash-Shotiriy',
    subtext: 'Saudiya Arabistoni · Mayin qiroat (114 sura toʻliq)',
    previewUrl: 'https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_128kbps/001001.mp3',
  },
];

export const padNumber = (num: number, digits: number = 3): string => {
  return num.toString().padStart(digits, '0');
};

/**
 * Returns active reciters (combining canonical reciters and admin-managed reciters)
 */
export const getActiveQuranReciters = (): QuranReciter[] => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // 1. Check permanent storage key first
      const permSaved = window.localStorage.getItem('asaka_ziyo_permanent_reciters_v2') ||
        window.localStorage.getItem('asaka_ziyo_reciters_v1');
      if (permSaved) {
        const parsed = JSON.parse(permSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const activeList = parsed
            .filter((r: any) => r.isActive !== false && !r.isArchived)
            .map((r: any) => ({
              id: r.id,
              name: r.name,
              subtext: r.subtext || `${r.country || 'Islom olami'} · ${r.style || 'Murattal'} (${r.uploadedSurahsCount || 114}/114 sura)`,
              previewUrl: r.previewUrl || 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
            }));
          if (activeList.length > 0) return activeList;
        }
      }
    }
  } catch {
    // fallback to canonical
  }
  return QURAN_RECITERS;
};

/**
 * Returns full Surah MP3 URL for streaming across canonical & admin-managed reciters.
 * Checks custom admin-uploaded or overridden Surah recordings first.
 */
export const getReciterSurahAudioUrl = (reciterId: string, surahNumber: number): string => {
  const padded = padNumber(surahNumber, 3);

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // 1. Check permanent storage override
      const permAudioRaw = window.localStorage.getItem('asaka_ziyo_permanent_surah_audio_v2') ||
        window.localStorage.getItem('asaka_ziyo_quran_audio_overrides_v1');
      if (permAudioRaw) {
        const overrides = JSON.parse(permAudioRaw);
        const key = `${reciterId}_${surahNumber}`;
        if (overrides && overrides[key] && overrides[key].audioUrl && overrides[key].publicationStatus !== 'archived') {
          return overrides[key].audioUrl;
        }
      }
      // 2. Check custom reciter base server URL
      const recitersRaw = window.localStorage.getItem('asaka_ziyo_permanent_reciters_v2') ||
        window.localStorage.getItem('asaka_ziyo_reciters_v1');
      if (recitersRaw) {
        const reciters = JSON.parse(recitersRaw);
        const found = Array.isArray(reciters) ? reciters.find((r: any) => r.id === reciterId) : null;
        if (found && found.surahServerBaseUrl) {
          const base = String(found.surahServerBaseUrl).replace(/\/$/, '');
          return `${base}/${padded}.mp3`;
        }
      }
    }
  } catch {
    // fallback to verified CDN
  }

  switch (reciterId) {
    case 'suwayd':
      return `https://server15.mp3quran.net/a-rushdi/Almusshaf-Al-Mo-lim/${padded}.mp3`;
    case 'hussary':
      return `https://server13.mp3quran.net/husr/${padded}.mp3`;
    case 'dussary':
      return `https://server11.mp3quran.net/yasser/${padded}.mp3`;
    case 'sudais':
      return `https://server11.mp3quran.net/sds/${padded}.mp3`;
    case 'juhany':
      return `https://server13.mp3quran.net/jhn/${padded}.mp3`;
    case 'ghamidi':
      return `https://server7.mp3quran.net/s_gmd/${padded}.mp3`;
    case 'shatri':
      return `https://server11.mp3quran.net/shatri/${padded}.mp3`;
    case 'mishary':
    default:
      return `https://server8.mp3quran.net/afs/${padded}.mp3`;
  }
};

/**
 * Default Surah Audio URL
 */
export const getSurahAudioUrl = (surahNumber: number): string => {
  return getReciterSurahAudioUrl('mishary', surahNumber);
};

/**
 * Returns single Ayah MP3 URL based on reciter
 */
export const getReciterAyahAudioUrl = (
  reciterId: string,
  surahNumber: number,
  ayahNumberInSurah: number
): string => {
  const s = padNumber(surahNumber, 3);
  const a = padNumber(ayahNumberInSurah, 3);
  switch (reciterId) {
    case 'suwayd':
      return `https://everyayah.com/data/Ayman_Sowaid_64kbps/${s}${a}.mp3`;
    case 'hussary':
      return `https://everyayah.com/data/Husary_128kbps/${s}${a}.mp3`;
    case 'dussary':
      return `https://everyayah.com/data/Yasser_Ad-Dussary_128kbps/${s}${a}.mp3`;
    case 'sudais':
      return `https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/${s}${a}.mp3`;
    case 'juhany':
      return `https://everyayah.com/data/Abdullaah_3awwaad_Al-Juhaynee_128kbps/${s}${a}.mp3`;
    case 'ghamidi':
      return `https://everyayah.com/data/Ghamadi_40kbps/${s}${a}.mp3`;
    case 'shatri':
      return `https://everyayah.com/data/Abu_Bakr_Ash-Shaatree_128kbps/${s}${a}.mp3`;
    case 'mishary':
    default:
      return `https://everyayah.com/data/Alafasy_128kbps/${s}${a}.mp3`;
  }
};

/**
 * Default single Ayah MP3 URL
 */
export const getAyahAudioUrl = (surahNumber: number, ayahNumberInSurah: number): string => {
  return getReciterAyahAudioUrl('mishary', surahNumber, ayahNumberInSurah);
};

export interface JuzInfo {
  juzNumber: number;
  nameAr: string;
  nameUz: string;
  startSurah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

export const JUZ_LIST: JuzInfo[] = [
  { juzNumber: 1, nameAr: 'الم', nameUz: 'Alif Lam Mim', startSurah: 1, startAyah: 1, endSurah: 2, endAyah: 141 },
  { juzNumber: 2, nameAr: 'سَيَقُولُ', nameUz: 'Sayaqul', startSurah: 2, startAyah: 142, endSurah: 2, endAyah: 252 },
  { juzNumber: 3, nameAr: 'تِلْكَ الرُّسُلُ', nameUz: 'Tilkar Rusul', startSurah: 2, startAyah: 253, endSurah: 3, endAyah: 92 },
  { juzNumber: 4, nameAr: 'لَنْ تَنَالُوا', nameUz: 'Lan Tanalu', startSurah: 3, startAyah: 93, endSurah: 4, endAyah: 23 },
  { juzNumber: 5, nameAr: 'وَالْمُحْصَنَاتُ', nameUz: 'Val Muhsonat', startSurah: 4, startAyah: 24, endSurah: 4, endAyah: 147 },
  { juzNumber: 6, nameAr: 'لَا يُحِبُّ اللَّهُ', nameUz: 'La Yuhibbulloh', startSurah: 4, startAyah: 148, endSurah: 5, endAyah: 81 },
  { juzNumber: 7, nameAr: 'وَإِذَا سَمِعُوا', nameUz: 'Va Iza Samiʼu', startSurah: 5, startAyah: 82, endSurah: 6, endAyah: 110 },
  { juzNumber: 8, nameAr: 'وَلَوْ أَنَّنَا', nameUz: 'Va Lav Annana', startSurah: 6, startAyah: 111, endSurah: 7, endAyah: 87 },
  { juzNumber: 9, nameAr: 'قَالَ الْمَلَأُ', nameUz: 'Qolal Malaʼu', startSurah: 7, startAyah: 88, endSurah: 8, endAyah: 40 },
  { juzNumber: 10, nameAr: 'وَاعْلَمُوا', nameUz: 'Vaʼlamu', startSurah: 8, startAyah: 41, endSurah: 9, endAyah: 92 },
  { juzNumber: 11, nameAr: 'يَعْتَذِرُونَ', nameUz: 'Yaʼtazirun', startSurah: 9, startAyah: 93, endSurah: 11, endAyah: 5 },
  { juzNumber: 12, nameAr: 'وَمَا مِنْ دَابَّةٍ', nameUz: 'Va Ma Min Dabbah', startSurah: 11, startAyah: 6, endSurah: 12, endAyah: 52 },
  { juzNumber: 13, nameAr: 'وَمَا أُبَرِّئُ', nameUz: 'Va Ma Ubarriʼu', startSurah: 12, startAyah: 53, endSurah: 14, endAyah: 52 },
  { juzNumber: 14, nameAr: 'رُبَمَا', nameUz: 'Rubama', startSurah: 15, startAyah: 1, endSurah: 16, endAyah: 128 },
  { juzNumber: 15, nameAr: 'سُبْحَانَ الَّذِي', nameUz: 'Subhanallazi', startSurah: 17, startAyah: 1, endSurah: 18, endAyah: 74 },
  { juzNumber: 16, nameAr: 'قَالَ أَلَمْ', nameUz: 'Qola Alam', startSurah: 18, startAyah: 75, endSurah: 20, endAyah: 135 },
  { juzNumber: 17, nameAr: 'اقْتَرَبَ', nameUz: 'Iqtaraba', startSurah: 21, startAyah: 1, endSurah: 22, endAyah: 78 },
  { juzNumber: 18, nameAr: 'قَدْ أَفْلَحَ', nameUz: 'Qad Aflaha', startSurah: 23, startAyah: 1, endSurah: 25, endAyah: 20 },
  { juzNumber: 19, nameAr: 'وَقَالَ الَّذِينَ', nameUz: 'Va Qolallazina', startSurah: 25, startAyah: 21, endSurah: 27, endAyah: 55 },
  { juzNumber: 20, nameAr: 'أَمَّنْ خَلَقَ', nameUz: 'Amman Xolaqa', startSurah: 27, startAyah: 56, endSurah: 29, endAyah: 45 },
  { juzNumber: 21, nameAr: 'اتْلُ مَا أُوحِيَ', nameUz: 'Utlu Ma Uhiya', startSurah: 29, startAyah: 46, endSurah: 33, endAyah: 30 },
  { juzNumber: 22, nameAr: 'وَمَنْ يَقْنُتْ', nameUz: 'Va Man Yaqnut', startSurah: 33, startAyah: 31, endSurah: 36, endAyah: 27 },
  { juzNumber: 23, nameAr: 'وَمَا لِيَ', nameUz: 'Va Ma Liya', startSurah: 36, startAyah: 28, endSurah: 39, endAyah: 31 },
  { juzNumber: 24, nameAr: 'فَمَنْ أَظْلَمُ', nameUz: 'Faman Azlamu', startSurah: 39, startAyah: 32, endSurah: 41, endAyah: 46 },
  { juzNumber: 25, nameAr: 'إِلَيْهِ يُرَدُّ', nameUz: 'Ilayhi Yuraddu', startSurah: 41, startAyah: 47, endSurah: 45, endAyah: 37 },
  { juzNumber: 26, nameAr: 'حم', nameUz: 'Ha Mim', startSurah: 46, startAyah: 1, endSurah: 51, endAyah: 30 },
  { juzNumber: 27, nameAr: 'قَالَ فَمَا خَطْبُكُمْ', nameUz: 'Qola Fama Xatbukum', startSurah: 51, startAyah: 31, endSurah: 57, endAyah: 29 },
  { juzNumber: 28, nameAr: 'قَدْ سَمِعَ اللَّهُ', nameUz: 'Qod Samiʼalloh', startSurah: 58, startAyah: 1, endSurah: 66, endAyah: 12 },
  { juzNumber: 29, nameAr: 'تَبَارَكَ الَّذِي', nameUz: 'Tabarokallazi', startSurah: 67, startAyah: 1, endSurah: 77, endAyah: 50 },
  { juzNumber: 30, nameAr: 'عَمَّ', nameUz: 'Amma (Juz Amma)', startSurah: 78, startAyah: 1, endSurah: 114, endAyah: 6 },
];

export const VERIFIED_AYAHS: Record<number, Ayah[]> = {
  1: [
    {
      id: '1-1',
      number: 1,
      numberInSurah: 1,
      surahNumber: 1,
      surahNameUz: 'Fotiha',
      textAr: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      translationUz: 'Mehribon va rahmli Allohning nomi ila boshlayman.',
      transliterationUz: 'Bismillahir Rohmanir Rohiym.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3',
      tafsirSummaryUz: 'Har bir yaxshi amal va qiroat Alloh taoloning muqaddas nomi bilan boshlanadi.',
      translations: {
        'uz-Latn': {
          language: 'uz-Latn',
          translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol (Hilol Nashr)',
          version: '2021-nashr',
          text: 'Mehribon va rahmli Allohning nomi ila boshlayman.',
          tafsir: 'Har bir yaxshi amal va qiroat Alloh taoloning muqaddas nomi bilan boshlanadi.',
        },
        'uz-Cyrl': {
          language: 'uz-Cyrl',
          translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф',
          source: 'Тафсири Ҳилол (Ҳилол Нашр)',
          version: '2021-нашр',
          text: 'Меҳрибон ва раҳмли Аллоҳнинг номи ила бошлайман.',
          tafsir: 'Ҳар бир яхши амал ва қироат Аллоҳ таолонинг муқаддас номи билан бошланади.',
        },
        'uz-Latn-new': {
          language: 'uz-Latn-new',
          translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol (Hilol Naşr)',
          version: '2021-naşr (Yangi alifbo)',
          text: 'Mehribon va rahmli Allohning nomi ila boşlayman.',
          tafsir: 'Har bir yaxşi amal va qiroat Alloh taoloning muqaddas nomi bilan boşlanadi.',
        },
        ru: {
          language: 'ru',
          translator: 'Э. Р. Кулиев',
          source: 'Смысловой перевод Священного Корана (Комплекс Короля Фахда)',
          version: 'Издание 2012',
          text: 'С именем Аллаха, Милостивого, Милосердного!',
          tafsir: 'Начинаю чтение с благословенного имени Аллаха, Обладателя совершенного милосердия.',
        },
        en: {
          language: 'en',
          translator: 'Sahih International',
          source: 'The Qur’an: Arabic Text with Corresponding English Meanings',
          version: 'Revised Edition',
          text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
          tafsir: 'Initiating every noble action seeking the barakah of Allah, the Sovereign Lord.',
        },
      },
    },
    {
      id: '1-2',
      number: 2,
      numberInSurah: 2,
      surahNumber: 1,
      surahNameUz: 'Fotiha',
      textAr: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
      translationUz: 'Hamd olamlar Robbi Allohgadir.',
      transliterationUz: 'Alhamdu lillahi Robbil aalamiyn.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001002.mp3',
      tafsirSummaryUz: 'Butun borliq va mavjudotdagi barcha maqtov va shukronalar yagona Yaratguvchiga xosdir.',
      translations: {
        'uz-Latn': {
          language: 'uz-Latn',
          translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Hamd olamlar Robbi Allohgadir.',
        },
        'uz-Cyrl': {
          language: 'uz-Cyrl',
          translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф',
          source: 'Тафсири Ҳилол',
          version: '2021',
          text: 'Ҳамд оламлар Робби Аллоҳгадир.',
        },
        'uz-Latn-new': {
          language: 'uz-Latn-new',
          translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
          source: 'Tafsiri Hilol',
          version: '2021',
          text: 'Hamd olamlar Robbi Allohgadir.',
        },
        ru: {
          language: 'ru',
          translator: 'Э. Р. Кулиев',
          source: 'Смысловой перевод',
          version: '2012',
          text: 'Хвала Аллаху, Господу миров,',
        },
        en: {
          language: 'en',
          translator: 'Sahih International',
          source: 'Sahih International Translation',
          version: '1997',
          text: '[All] praise is [due] to Allah, Lord of the worlds -',
        },
      },
    },
    {
      id: '1-3',
      number: 3,
      numberInSurah: 3,
      surahNumber: 1,
      surahNameUz: 'Fotiha',
      textAr: 'الرَّحْمَٰنِ الرَّحِيمِ',
      translationUz: 'U Rohman va Rohiymdir.',
      transliterationUz: 'Ar-Rohmanir Rohiym.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001003.mp3',
      tafsirSummaryUz: 'Rohman — bu dunyoda barchaga marhamatli, Rohiym — oxiratda faqat moʻminlarga rahm qiluvchidir.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'U Rohman va Rohiymdir.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'У Роҳман ва Роҳиймдир.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'U Rohman va Rohiymdir.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Милостивому, Милосердному,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'The Entirely Merciful, the Especially Merciful,' },
      },
    },
    {
      id: '1-4',
      number: 4,
      numberInSurah: 4,
      surahNumber: 1,
      surahNameUz: 'Fotiha',
      textAr: 'مَالِكِ يَوْمِ الدِّينِ',
      translationUz: 'Jazo va mukofot kunining Egasidir.',
      transliterationUz: 'Maliki yavmid-diyn.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001004.mp3',
      tafsirSummaryUz: 'Qiyomat kuni hech kim hech narsaga ega boʻlmagan vaqtda yagona hukmronlik Allohnikidir.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Jazo va mukofot kunining Egasidir.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Жазо ва мукофот кунининг Эгасидир.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Jazo va mukofot kunining Egasidir.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Властелину Дня воздаяния!' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'Sovereign of the Day of Recompense.' },
      },
    },
    {
      id: '1-5',
      number: 5,
      numberInSurah: 5,
      surahNumber: 1,
      surahNameUz: 'Fotiha',
      textAr: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ',
      translationUz: 'Faqat Sengagina ibodat qilamiz va faqat Sendangina yordam soʻraymiz.',
      transliterationUz: 'Iyyaka naʼbudu va iyyaka nastaʼiyn.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001005.mp3',
      tafsirSummaryUz: 'Tavhidning asosi: sigʻinish faqat Allohga boʻladi va koʻmak faqat Undan tilanadi.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Faqat Sengagina ibodat qilamiz va faqat Sendangina yordam soʻraymiz.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Фақат Сенгагина ибодат қиламиз ва фақат Сендангина ёрдам сўраймиз.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Faqat Sengagina ibodat qilamiz va faqat Sendangina yordam söraymiz.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Тебе одному мы поклоняемся и Тебя одного молим о помощи.' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'It is You we worship and You we ask for help.' },
      },
    },
    {
      id: '1-6',
      number: 6,
      numberInSurah: 6,
      surahNumber: 1,
      surahNameUz: 'Fotiha',
      textAr: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ',
      translationUz: 'Bizni toʻgʻri yoʻlga hidoyat qilgin.',
      transliterationUz: 'Ihdinas-sirotal mustaqiym.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001006.mp3',
      tafsirSummaryUz: 'Moʻmin kishi har doim haqiqat va najot yoʻlida sobitqadam boʻlishni soʻraydi.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Bizni toʻgʻri yoʻlga hidoyat qilgin.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Бизни тўғри йўлга ҳидоят қилгин.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Bizni töğri yölga hidoyat qilgin.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Веди нас прямым путем,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'Guide us to the straight path -' },
      },
    },
    {
      id: '1-7',
      number: 7,
      numberInSurah: 7,
      surahNumber: 1,
      surahNameUz: 'Fotiha',
      textAr: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ',
      translationUz: 'Oʻzing neʼmat berganlarning yoʻliga, gʻazabga uchraganlarnikiga emas, adashganlarnikiga ham emas.',
      transliterationUz: 'Sirotallaziyna anʼamta alayhim, gʻoyril magʻdubi alayhim valaddolliyn.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/001007.mp3',
      tafsirSummaryUz: 'Paygʻambarlar, siddiqlar, shahidlar va solihlarning saodatli yoʻli.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Oʻzing neʼmat berganlarning yoʻliga, gʻazabga uchraganlarnikiga emas, adashganlarnikiga ham emas.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Ўзинг неъмат берганларнинг йўлига, ғазабга учраганларникига эмас, адашганларникига ҳам эмас.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Özing neʼmat berganlarning yöliga, ğazabga uçraganlarnikiga emas, adaşganlarnikiga ham emas.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'путем тех, кого Ты облагодетельствовал, не тех, на кого пал гнев, и не заблудших.' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'The path of those upon whom You have bestowed favor, not of those who have evoked [Your] anger or of those who are astray.' },
      },
    },
  ],
  112: [
    {
      id: '112-1',
      number: 6222,
      numberInSurah: 1,
      surahNumber: 112,
      surahNameUz: 'Ixlos',
      textAr: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
      translationUz: 'Ayt: «U Alloh Yagonadir».',
      transliterationUz: 'Qul huvallohu ahad.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112001.mp3',
      tafsirSummaryUz: 'Alloh taolo zotida, sifatlarida va afʼolida yagona va tengsizdir.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Ayt: «U Alloh Yagonadir».' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Айт: «У Аллоҳ Ягонадир».' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Ayt: «U Alloh Yagonadir».' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Скажи: «Он — Аллах Единый,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'Say, "He is Allah, [who is] One,' },
      },
    },
    {
      id: '112-2',
      number: 6223,
      numberInSurah: 2,
      surahNumber: 112,
      surahNameUz: 'Ixlos',
      textAr: 'اللَّهُ الصَّمَدُ',
      translationUz: 'Alloh Somaddir (Barcha hojatlar bilan Uning Oʻzigagina yuzlaniladi, U hech kimga muhtoj emasdir).',
      transliterationUz: 'Allohus-somad.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112002.mp3',
      tafsirSummaryUz: 'Somad — barcha maxluqotlar Unga ehtiyojmand, U esa hech kimga va hech narsaga muhtoj emas.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Alloh Somaddir.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Аллоҳ Сомаддир.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Alloh Somaddir.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Аллах Самодостаточный.' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'Allah, the Eternal Refuge.' },
      },
    },
    {
      id: '112-3',
      number: 6224,
      numberInSurah: 3,
      surahNumber: 112,
      surahNameUz: 'Ixlos',
      textAr: 'لَمْ يَلِدْ وَلَمْ يُولَدْ',
      translationUz: 'U tugʻmagan va tugʻilmagan.',
      transliterationUz: 'Lam yalid va lam yulad.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112003.mp3',
      tafsirSummaryUz: 'Uning avlodi ham, ota-onasi ham yoʻq, U azaliy va abadiydir.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'U tugʻmagan va tugʻilmagan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'У туғмаган ва туғилмаган.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'U tuğmagan va tuğilmagan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Он не родил и не был рожден,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'He neither begets nor is born,' },
      },
    },
    {
      id: '112-4',
      number: 6225,
      numberInSurah: 4,
      surahNumber: 112,
      surahNameUz: 'Ixlos',
      textAr: 'وَلَمْ يَكُنْ لَهُ كُفُوًا أَحَدٌ',
      translationUz: 'Va Unga hech kim teng boʻlmagan.',
      transliterationUz: 'Va lam yakul-lahu kufuvan ahad.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/112004.mp3',
      tafsirSummaryUz: 'Hech bir mavjudot Allohga oʻxshash yoki teng boʻla olmaydi.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Va Unga hech kim teng boʻlmagan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Ва Унга ҳеч ким тенг бўлмаган.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Va Unga hiç kim teng bölmagan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'и нет никого, равного Ему».' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'Nor is there to Him any equivalent."' },
      },
    },
  ],
  113: [
    {
      id: '113-1',
      number: 6226,
      numberInSurah: 1,
      surahNumber: 113,
      surahNameUz: 'Falaq',
      textAr: 'قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ',
      translationUz: 'Ayt: «Tong Robbidan panoh soʻrayman».',
      transliterationUz: 'Qul aʼuzu birobbil falaq.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113001.mp3',
      tafsirSummaryUz: 'Tongning yorugʻligini yaratuvchi Robbdan yomonliklardan panoh tilash.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Ayt: «Tong Robbidan panoh soʻrayman».' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Айт: «Тонг Роббидан паноҳ сўрайман».' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Ayt: «Tong Robbidan panoh sörayman».' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Скажи: «Уповаю на защиту Господа рассвета' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'Say, "I seek refuge in the Lord of daybreak' },
      },
    },
    {
      id: '113-2',
      number: 6227,
      numberInSurah: 2,
      surahNumber: 113,
      surahNameUz: 'Falaq',
      textAr: 'مِنْ شَرِّ مَا خَلَقَ',
      translationUz: 'U yaratgan narsalarning yomonligidan.',
      transliterationUz: 'Min sharri ma xolaq.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113002.mp3',
      tafsirSummaryUz: 'Barcha maxluqotlar yomonligidan saqlanish.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'U yaratgan narsalarning yomonligidan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'У яратган нарсаларнинг ёмонлигидан.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'U yaratgan narsalarning yomonligidan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'от зла того, что Он сотворил,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'From the evil of that which He created' },
      },
    },
    {
      id: '113-3',
      number: 6228,
      numberInSurah: 3,
      surahNumber: 113,
      surahNameUz: 'Falaq',
      textAr: 'وَمِنْ شَرِّ غَاسِقٍ إِذَا وَقَبَ',
      translationUz: 'Va qorongʻu tushgan tunning yomonligidan.',
      transliterationUz: 'Va min sharri gʻosiqin iza vaqob.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113003.mp3',
      tafsirSummaryUz: 'Zulmatda harakat qiluvchi yovuz kuchlar yomonligidan.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Va qorongʻu tushgan tunning yomonligidan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Ва қоронғу тушган туннинг ёмонлигидан.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Va qorongʻu tuşgan tunning yomonligidan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'от зла мрака, когда он наступает,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'And from the evil of darkness when it settles' },
      },
    },
    {
      id: '113-4',
      number: 6229,
      numberInSurah: 4,
      surahNumber: 113,
      surahNameUz: 'Falaq',
      textAr: 'وَمِنْ شَرِّ النَّفَّاثَاتِ فِي الْعُقَدِ',
      translationUz: 'Va tugunlarga dam soluvchilar yomonligidan.',
      transliterationUz: 'Va min sharrin-naffasati fil uqod.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113004.mp3',
      tafsirSummaryUz: 'Sehrgarlar va fisq-fujur egalarining fitnasidan saqlanish.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Va tugunlarga dam soluvchilar yomonligidan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Ва тугунларга дам солувчилар ёмонлигидан.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Va tugunlarga dam soluvçilar yomonligidan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'от зла колдуний, дующих на узлы,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'And from the evil of the blowers in knots' },
      },
    },
    {
      id: '113-5',
      number: 6230,
      numberInSurah: 5,
      surahNumber: 113,
      surahNameUz: 'Falaq',
      textAr: 'وَمِنْ شَرِّ حَاسِدٍ إِذَا حَسَدَ',
      translationUz: 'Va hasad qilayotgan hasadgʻoʻyning yomonligidan.',
      transliterationUz: 'Va min sharri hasidin iza hasad.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/113005.mp3',
      tafsirSummaryUz: 'Koʻrolmaslik va hasad balosidan Robbdan himoya soʻrash.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Va hasad qilayotgan hasadgʻoʻyning yomonligidan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Ва ҳасад қилаётган ҳасадгўйнинг ёмонлигидан.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Va hasad qilayotgan hasadgöyning yomonligidan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'от зла завистника, когда он завидует».' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'And from the evil of an envier when he envies."' },
      },
    },
  ],
  114: [
    {
      id: '114-1',
      number: 6231,
      numberInSurah: 1,
      surahNumber: 114,
      surahNameUz: 'Nos',
      textAr: 'قُلْ أَعُوذُ بِرَبِّ النَّاسِ',
      translationUz: 'Ayt: «Insonlar Robbidan panoh soʻrayman».',
      transliterationUz: 'Qul aʼuzu birobbin-nas.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114001.mp3',
      tafsirSummaryUz: 'Insoniyatning Yaratuvchisi boʻlgan Allohdan panoh tilash.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Ayt: «Insonlar Robbidan panoh soʻrayman».' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Айт: «Инсонлар Роббидан паноҳ сўрайман».' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Ayt: «Insonlar Robbidan panoh sörayman».' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Скажи: «Уповаю на защиту Господа людей,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'Say, "I seek refuge in the Lord of mankind,' },
      },
    },
    {
      id: '114-2',
      number: 6232,
      numberInSurah: 2,
      surahNumber: 114,
      surahNameUz: 'Nos',
      textAr: 'مَلِكِ النَّاسِ',
      translationUz: 'Insonlar Podshohidan.',
      transliterationUz: 'Malikin-nas.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114002.mp3',
      tafsirSummaryUz: 'Barcha insonlarning haqiqiy Hukmdori.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Insonlar Podshohidan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Инсонлар Подшоҳидан.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Insonlar Podşohidan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Царя людей,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'The Sovereign of mankind,' },
      },
    },
    {
      id: '114-3',
      number: 6233,
      numberInSurah: 3,
      surahNumber: 114,
      surahNameUz: 'Nos',
      textAr: 'إِلَٰهِ النَّاسِ',
      translationUz: 'Insonlar Ilohidan.',
      transliterationUz: 'Ilahin-nas.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114003.mp3',
      tafsirSummaryUz: 'Barcha ibodatga loyiq yagona Zot.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Insonlar Ilohidan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Инсонлар Илоҳидан.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Insonlar Ilohidan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'Бога людей,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'The God of mankind,' },
      },
    },
    {
      id: '114-4',
      number: 6234,
      numberInSurah: 4,
      surahNumber: 114,
      surahNameUz: 'Nos',
      textAr: 'مِنْ شَرِّ الْوَسْوَاسِ الْخَنَّاسِ',
      translationUz: 'Yashirinib yuruvchi vasvasachining yomonligidan.',
      transliterationUz: 'Min sharril vasvasil xonnas.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114004.mp3',
      tafsirSummaryUz: 'Alloh zikr qilinganda qochadigan, gʻaflatda vasvasa qiladigan shaytondan.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Yashirinib yuruvchi vasvasachining yomonligidan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Яшириниб юрувчи васвасачининг ёмонлигидан.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Yaşirinib yuruvçi vasvasaçining yomonligidan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'от зла искусителя, исчезающего при поминании Аллаха,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'From the evil of the retreating whisperer -' },
      },
    },
    {
      id: '114-5',
      number: 6235,
      numberInSurah: 5,
      surahNumber: 114,
      surahNameUz: 'Nos',
      textAr: 'الَّذِي يُوَسْوِسُ فِي صُدُورِ النَّاسِ',
      translationUz: 'U insonlarning dillariga vasvasa solur.',
      transliterationUz: 'Allaziy yuvasvisu fiy sudurin-nas.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114005.mp3',
      tafsirSummaryUz: 'Qalblarga shubha va gunoh fikrlarni urugʻini sepuvchi.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'U insonlarning dillariga vasvasa solur.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'У инсонларнинг дилларига васваса солур.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'U insonlarning dillariga vasvasa solur.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'который наущает в груди людей,' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'Who whispers [evil] into the breasts of mankind -' },
      },
    },
    {
      id: '114-6',
      number: 6236,
      numberInSurah: 6,
      surahNumber: 114,
      surahNameUz: 'Nos',
      textAr: 'مِنَ الْجِنَّةِ وَالنَّاسِ',
      translationUz: 'Jinlardan ham, insonlardan ham boʻlgan (vasvasachilardan).',
      transliterationUz: 'Minal jinnati van-nas.',
      audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/114006.mp3',
      tafsirSummaryUz: 'Vasvasa qiluvchi yovuz kuchlar jinsiga koʻra ham jinlar, ham insonlar toifasidan boʻlishi mumkin.',
      translations: {
        'uz-Latn': { language: 'uz-Latn', translator: 'Shayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Jinlardan ham, insonlardan ham boʻlgan.' },
        'uz-Cyrl': { language: 'uz-Cyrl', translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф', source: 'Тафсири Ҳилол', version: '2021', text: 'Жинлардан ҳам, инсонлардан ҳам бўлган.' },
        'uz-Latn-new': { language: 'uz-Latn-new', translator: 'Şayx Muhammad Sodiq Muhammad Yusuf', source: 'Tafsiri Hilol', version: '2021', text: 'Jinlardan ham, insonlardan ham bölgan.' },
        ru: { language: 'ru', translator: 'Э. Р. Кулиев', source: 'Смысловой перевод', version: '2012', text: 'из числа джиннов и людей».' },
        en: { language: 'en', translator: 'Sahih International', source: 'Sahih International', version: '1997', text: 'From among the jinn and mankind."' },
      },
    },
  ],
};

// Daily Ayah for home screen (Ayat al-Kursi)
export const DAILY_FEATURED_AYAH: Ayah = {
  id: 'daily-2-255',
  number: 262,
  numberInSurah: 255,
  surahNumber: 2,
  surahNameUz: 'Baqara',
  textAr: 'اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ ۚ لَّهُ مَا فِي السَّمَاوَاتِ وَمَا فِي الْأَرْضِ',
  translationUz: 'Alloh — Undan oʻzga iloh yoʻq, U Hayy (Tirik) va Qayyum (Doim qoim)dir. Uni mudroq ham, uyqu ham olmas. Osmonlardagi va yerdagi narsalar Unikidir...',
  transliterationUz: 'Allohu la ilaha illa huval hayyul qoyyum. La taʼxuzuhu sinatuv va la navm. Lahu ma fis-samavati va ma fil ard...',
  audioUrl: 'https://everyayah.com/data/Alafasy_128kbps/002255.mp3',
  tafsirSummaryUz: 'Oyatul Kursiy — Qurʼoni Karimdagi eng ulugʻ oyat boʻlib, Alloh taoloning qudrati va goʻzal sifatlarini oʻzida jamlagan.',
  translations: {
    'uz-Latn': {
      language: 'uz-Latn',
      translator: 'Shayx Muhammad Sodiq Muhammad Yusuf',
      source: 'Tafsiri Hilol (Hilol Nashr)',
      version: '2021',
      text: 'Alloh — Undan oʻzga iloh yoʻq, U Hayy (Tirik) va Qayyum (Doim qoim)dir. Uni mudroq ham, uyqu ham olmas. Osmonlardagi va yerdagi narsalar Unikidir...',
      tafsir: 'Oyatul Kursiy — Alloh taoloning buyukligi va sifatlarini oʻzida jamlagan eng ulugʻ oyatdir.',
    },
    'uz-Cyrl': {
      language: 'uz-Cyrl',
      translator: 'Шайх Муҳаммад Содиқ Муҳаммад Юсуф',
      source: 'Тафсири Ҳилол (Ҳилол Нашр)',
      version: '2021',
      text: 'Аллоҳ — Ундан ўзга илоҳ йўқ, У Ҳайй (Тирик) ва Қайюм (Доим қоим)дир. Уни мудроқ ҳам, уйқу ҳам олмас. Осмонлардаги ва ердаги нарсалар Уникидир...',
      tafsir: 'Оятал Курсий — Аллоҳ таолонинг буюклиги ва сифатларини ўзида жамлаган энг улуғ оятдир.',
    },
    'uz-Latn-new': {
      language: 'uz-Latn-new',
      translator: 'Şayx Muhammad Sodiq Muhammad Yusuf',
      source: 'Tafsiri Hilol',
      version: '2021',
      text: 'Alloh — Undan özga iloh yöq, U Hayy (Tirik) va Qayyum (Doim qoim)dir. Uni mudroq ham, uyqu ham olmas. Osmonlardagi va yerdagi narsalar Unikidir...',
      tafsir: 'Oyatul Kursiy — Alloh taoloning buyukligi va sifatlarini özida jamlagan eng uluğ oyatdir.',
    },
    ru: {
      language: 'ru',
      translator: 'Э. Р. Кулиев',
      source: 'Смысловой перевод Священного Корана',
      version: '2012',
      text: 'Аллах — нет божества, кроме Него, Живого, Вседержителя. Им не овладевают ни дремота, ни сон. Ему принадлежит то, что на небесах, и то, что на земле...',
      tafsir: 'Аят аль-Курси — величайший аят Корана, содержащий возвышенные имена и качества Всевышнего.',
    },
    en: {
      language: 'en',
      translator: 'Sahih International',
      source: 'The Qur’an: English Meanings',
      version: '1997',
      text: 'Allah - there is no deity except Him, the Ever-Living, the Sustainer of [all] existence. Neither drowsiness overtakes Him nor sleep. To Him belongs whatever is in the heavens and whatever is on the earth...',
      tafsir: 'Ayat al-Kursi is the greatest verse in the Quran, articulating the absolute sovereignty of Allah.',
    },
  },
};
