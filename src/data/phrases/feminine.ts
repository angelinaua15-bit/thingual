/** Feminine first-person variants: phrase id → language code → text (with "|romanization" for zh, ja, ko, ar, hi). Only languages whose form actually changes. */
export const FEMININE: Record<string, Partial<Record<'en'|'uk'|'es'|'pt'|'de'|'fr'|'it'|'pl'|'tr'|'zh'|'ja'|'ko'|'ar'|'hi'|'id'|'vi', string>>> = {
  // ---------- basics ----------
  'basics-im-fine': { pt: 'Tudo bem, obrigada!' },
  'basics-nice-to-meet-you': { fr: 'Enchantée !' },
  'basics-thank-you': { pt: 'Obrigada!' },
  'basics-thank-you-very-much': { pt: 'Muito obrigada!' },
  'basics-sorry': { fr: 'Désolée !', ar: 'آسفة!|Āsifa!' },
  'basics-speak-a-little': { hi: 'मैं थोड़ी अंग्रेज़ी बोलती हूँ।|Maiṃ thoṛī aṅgrezī boltī hūṃ.' },

  // ---------- cafe ----------
  'cafe-menu': { hi: 'क्या मैं मेन्यू देख सकती हूँ?|Kyā maiṃ menyū dekh saktī hūṃ?' },
  'cafe-vegetarian': {
    uk: 'Я вегетаріанка.',
    es: 'Soy vegetariana.',
    pt: 'Sou vegetariana.',
    de: 'Ich bin Vegetarierin.',
    fr: 'Je suis végétarienne.',
    it: 'Sono vegetariana.',
    pl: 'Jestem wegetarianką.',
    ar: 'أنا نباتية.|Anā nabātiyya.',
  },
  'cafe-allergic-nuts': {
    es: 'Soy alérgica a los frutos secos.',
    pt: 'Sou alérgica a nozes.',
    it: 'Sono allergica alla frutta secca.',
  },
  'cafe-not-ordered': { uk: 'Я це не замовляла.', pl: 'To nie jest to, co zamówiłam.' },
  'cafe-pay-by-card': { hi: 'क्या मैं कार्ड से पेमेंट कर सकती हूँ?|Kyā maiṃ kārḍ se pemeṇṭ kar saktī hūṃ?' },

  // ---------- shopping ----------
  'shopping-just-looking': {
    pt: 'Só estou olhando, obrigada.',
    hi: 'मैं बस देख रही हूँ, धन्यवाद।|Maiṃ bas dekh rahī hūṃ, dhanyavād.',
  },
  'shopping-looking-for': { hi: 'मैं एक जैकेट ढूँढ रही हूँ।|Maiṃ ek jaikeṭ ḍhūṃḍh rahī hūṃ.' },
  'shopping-try-on': { hi: 'क्या मैं इसे पहनकर देख सकती हूँ?|Kyā maiṃ ise pahankar dekh saktī hūṃ?' },
  'shopping-think-about-it': { hi: 'मैं सोचकर बताऊँगी।|Maiṃ sochkar batāūṃgī.' },
  'shopping-ill-take-it': { hi: 'मैं यह ले लूँगी।|Maiṃ yah le lūṃgī.' },
  'shopping-cash': { hi: 'क्या मैं कैश में दे सकती हूँ?|Kyā maiṃ kaish meṃ de saktī hūṃ?' },
  'shopping-return': { hi: 'क्या मैं इसे वापस कर सकती हूँ?|Kyā maiṃ ise vāpas kar saktī hūṃ?' },
  'shopping-exchange': { hi: 'क्या मैं इसे बदल सकती हूँ?|Kyā maiṃ ise badal saktī hūṃ?' },

  // ---------- directions ----------
  'directions-lost': {
    uk: 'Я заблукала.',
    es: 'Estoy perdida.',
    pt: 'Estou perdida.',
    fr: 'Je suis perdue.',
    it: 'Mi sono persa.',
    pl: 'Zgubiłam się.',
    hi: 'मैं रास्ता भटक गई हूँ।|Maiṃ rāstā bhaṭak gaī hūṃ.',
  },
  'directions-this-address': { hi: 'मैं यह पता ढूँढ रही हूँ।|Maiṃ yah patā ḍhūṃḍh rahī hūṃ.' },

  // ---------- transport ----------
  'transport-missed-bus': { uk: 'Я запізнилася на автобус.' },

  // ---------- hotel ----------
  'hotel-leave-luggage': { hi: 'क्या मैं अपना सामान यहाँ छोड़ सकती हूँ?|Kyā maiṃ apnā sāmān yahāṃ choṛ saktī hūṃ?' },
  'hotel-see-room': { hi: 'क्या मैं कमरा देख सकती हूँ?|Kyā maiṃ kamrā dekh saktī hūṃ?' },
  'hotel-late-checkout': { hi: 'क्या मैं थोड़ा देर से चेक-आउट कर सकती हूँ?|Kyā maiṃ thoṛā der se cek-āuṭ kar saktī hūṃ?' },
  'hotel-pay-card': { hi: 'क्या मैं कार्ड से पैसे दे सकती हूँ?|Kyā maiṃ kārḍ se paise de saktī hūṃ?' },
  'hotel-extra-night': { hi: 'मैं एक रात और रुकना चाहती हूँ।|Maiṃ ek rāt aur ruknā cāhtī hūṃ.' },
  'hotel-key-inside': { uk: 'Я забула ключ у номері.' },

  // ---------- health ----------
  'health-allergic-penicillin': { it: 'Sono allergica alla penicillina.' },
  'health-allergic-nuts': { it: 'Sono allergica alla frutta secca.' },

  // ---------- small talk ----------
  'smalltalk-tired': {
    es: 'Estoy cansada.',
    pt: 'Estou cansada.',
    fr: 'Je suis fatiguée.',
    it: 'Sono stanca.',
    pl: 'Jestem zmęczona.',
    ar: 'أنا متعبة.|Anā mutʿaba.',
    hi: 'मैं थक गई हूँ।|Maiṃ thak gaī hūṃ.',
  },

  // ---------- work ----------
  'work-job': {
    uk: 'Я працюю програмісткою.',
    es: 'Trabajo como programadora.',
    pt: 'Trabalho como programadora.',
    de: 'Ich arbeite als Programmiererin.',
    fr: 'Je travaille comme programmeuse.',
    it: 'Lavoro come programmatrice.',
    pl: 'Pracuję jako programistka.',
    ar: 'أعمل مبرمجةً.|Aʿmalu mubarmijatan.',
    hi: 'मैं प्रोग्रामर के रूप में काम करती हूँ।|Maiṃ progrāmar ke rūp meṃ kām kartī hūṃ.',
  },
  'work-email': { hi: 'मैं आपको ईमेल भेजूँगी।|Maiṃ āpko īmel bhejūṃgī.' },
  'work-call-back': { hi: 'मैं आपको वापस फ़ोन करती हूँ।|Maiṃ āpko vāpas fon kartī hūṃ.' },
  'work-from-home': { hi: 'आज मैं घर से काम कर रही हूँ।|Āj maiṃ ghar se kām kar rahī hūṃ.' },
  'work-on-it': { hi: 'मैं इस पर काम कर रही हूँ।|Maiṃ is par kām kar rahī hūṃ.' },
  'work-busy': {
    uk: 'Я зараз зайнята.',
    es: 'Ahora estoy ocupada.',
    pt: 'Estou ocupada agora.',
    fr: 'Je suis occupée en ce moment.',
    it: 'Sono impegnata in questo momento.',
    pl: 'Jestem teraz zajęta.',
    ar: 'أنا مشغولة الآن.|Anā mashghūla al-ān.',
  },
  'work-leave-early': { hi: 'आज मैं काम से जल्दी निकलूँगी।|Āj maiṃ kām se jaldī nikalūṃgī.' },
  'work-new': {
    es: 'Soy nueva aquí.',
    pt: 'Sou nova aqui.',
    fr: 'Je suis nouvelle ici.',
    it: 'Sono nuova qui.',
    pl: 'Jestem tu nowa.',
    ar: 'أنا جديدة هنا.|Anā jadīda hunā.',
    hi: 'मैं यहाँ नई हूँ।|Maiṃ yahāṃ naī hūṃ.',
  },

  // ---------- home ----------
  'home-im-home': { fr: 'Je suis rentrée !', hi: 'मैं घर आ गई!|Maiṃ ghar ā gaī!' },
  'home-dishes': { hi: 'बर्तन मैं धो दूँगी।|Bartan maiṃ dho dūṃgī.' },
  'home-shower': { hi: 'मैं नहाने जा रही हूँ।|Maiṃ nahāne jā rahī hūṃ.' },
  'home-bed': { hi: 'मैं सोने जा रही हूँ।|Maiṃ sone jā rahī hūṃ.' },

  // ---------- feelings ----------
  'feelings-sad': { ar: 'أنا حزينة.|Anā ḥazīna.' },
  'feelings-lonely': {
    es: 'Me siento sola.',
    pt: 'Estou me sentindo sozinha.',
    fr: 'Je me sens seule.',
    it: 'Mi sento sola.',
    pl: 'Czuję się samotna.',
  },
  'feelings-worried': {
    es: 'Estoy preocupada.',
    pt: 'Estou preocupada.',
    fr: 'Je suis inquiète.',
    it: 'Sono preoccupata.',
    ar: 'أنا قلقة.|Anā qaliqa.',
  },
  'feelings-nervous': {
    es: 'Estoy nerviosa.',
    pt: 'Estou nervosa.',
    fr: 'Je suis nerveuse.',
    it: 'Sono nervosa.',
    ar: 'أنا متوترة.|Anā mutawattira.',
    hi: 'मैं घबराई हुई हूँ।|Maiṃ ghabrāī huī hūṃ.',
  },
  'feelings-stressed': {
    es: 'Estoy estresada.',
    pt: 'Estou estressada.',
    fr: 'Je suis stressée.',
    it: 'Sono stressata.',
    pl: 'Jestem zestresowana.',
  },
  'feelings-scared': { ar: 'أنا خائفة.|Anā khāʾifa.' },
  'feelings-angry': {
    es: 'Estoy enfadada.',
    it: 'Sono arrabbiata.',
    pl: 'Jestem zła.',
    ar: 'أنا غاضبة.|Anā ghāḍiba.',
  },
  'feelings-bored': {
    es: 'Estoy aburrida.',
    pt: 'Estou entediada.',
    hi: 'मैं बोर हो रही हूँ।|Maiṃ bor ho rahī hūṃ.',
  },
  'feelings-disappointed': {
    uk: 'Я розчарована.',
    es: 'Estoy decepcionada.',
    pt: 'Estou decepcionada.',
    fr: 'Je suis déçue.',
    it: 'Sono delusa.',
    pl: 'Jestem rozczarowana.',
  },
  'feelings-confused': {
    uk: 'Я заплуталася.',
    es: 'Estoy confundida.',
    pt: 'Estou confusa.',
    fr: 'Je suis perdue.',
    it: 'Sono confusa.',
    pl: 'Jestem zdezorientowana.',
    ar: 'أنا مرتبكة.|Anā murtabika.',
  },
  'feelings-embarrassed': { fr: 'Je suis gênée.' },
  'feelings-excited': {
    pt: 'Estou muito animada!',
    it: 'Sono emozionatissima!',
    ar: 'أنا متحمسة جدًا!|Anā mutaḥammisa jiddan!',
  },
  'feelings-grateful': {
    uk: 'Я дуже вдячна.',
    es: 'Estoy muy agradecida.',
    pt: 'Sou muito grata.',
    fr: 'Je suis très reconnaissante.',
    it: 'Sono molto grata.',
    pl: 'Jestem bardzo wdzięczna.',
    ar: 'أنا ممتنة جدًا.|Anā mumtanna jiddan.',
  },
  'feelings-proud': {
    es: 'Estoy orgullosa de ti.',
    fr: 'Je suis fière de toi.',
    it: 'Sono fiera di te.',
    pl: 'Jestem z ciebie dumna.',
    ar: 'أنا فخورة بك.|Anā fakhūra bik.',
  },
  'feelings-sorry-to-hear': { fr: 'Je suis désolée d’apprendre ça.' },
  'feelings-understand': { hi: 'मैं आपकी भावना समझती हूँ।|Maiṃ āpkī bhāvnā samajhtī hūṃ.' },
  'feelings-better': { hi: 'अब मैं बेहतर महसूस कर रही हूँ।|Ab maiṃ behtar mahsūs kar rahī hūṃ.' },
};
