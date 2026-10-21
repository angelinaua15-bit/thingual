import { LangCode } from './languages';
import { WORDS } from './words';

/**
 * Concept-based dictionary: every object is one concept, with labels in every language.
 * Label format per language: "word|article|romanization" (empty fields allowed).
 * Order of labels: en uk es pt de fr it pl tr zh ja ko ar hi id vi
 */
const ORDER: LangCode[] = ['en', 'uk', 'es', 'pt', 'de', 'fr', 'it', 'pl', 'tr', 'zh', 'ja', 'ko', 'ar', 'hi', 'id', 'vi'];

export type Place = 'kitchen' | 'home' | 'street' | 'personal';
export type PartOfSpeech = 'noun';
export type Topic =
  | 'food' | 'fruits' | 'kitchen' | 'home' | 'tools' | 'clothes' | 'body' | 'health' | 'animals' | 'nature'
  | 'transport' | 'city' | 'travel' | 'school' | 'tech' | 'sports' | 'music';
export const TOPICS: Topic[] = ['food', 'fruits', 'kitchen', 'home', 'clothes', 'animals', 'nature', 'city', 'transport', 'travel', 'school', 'tech', 'sports', 'music', 'tools', 'body', 'health'];
/** Icon per topic (same format as BASE_META so scripts/copy-emoji.js picks them up). */
export const TOPIC_EMOJI: Record<Topic, [Topic, string]> = {
  food: ['food', '🍔'], fruits: ['fruits', '🍓'], kitchen: ['kitchen', '🍳'], home: ['home', '🏠'], tools: ['tools', '🔨'],
  clothes: ['clothes', '👕'], body: ['body', '✋'], health: ['health', '💊'], animals: ['animals', '🦊'], nature: ['nature', '🌿'],
  transport: ['transport', '🚆'], city: ['city', '🏙️'], travel: ['travel', '✈️'], school: ['school', '✏️'], tech: ['tech', '🎧'],
  sports: ['sports', '🏀'], music: ['music', '🎸'],
};
const TOPIC_PLACE: Record<Topic, Place> = {
  food: 'kitchen', fruits: 'kitchen', kitchen: 'kitchen', home: 'home', tools: 'home', health: 'home',
  clothes: 'personal', body: 'personal', school: 'personal', tech: 'personal', sports: 'personal', music: 'personal', travel: 'personal',
  animals: 'street', nature: 'street', transport: 'street', city: 'street',
};
/** Topics and emoji for the original hand-picked concepts (they also have real photos). */
const BASE_META: Record<string, [Topic, string]> = {
  window: ['home', '🪟'], door: ['home', '🚪'], cup: ['kitchen', '☕'], plate: ['kitchen', '🍽️'], spoon: ['kitchen', '🥄'], bread: ['food', '🍞'],
  apple: ['fruits', '🍎'], banana: ['fruits', '🍌'], egg: ['food', '🥚'], teapot: ['kitchen', '🫖'], bottle: ['kitchen', '🍾'], coffee: ['food', '☕'],
  chair: ['home', '🪑'], table: ['home', '🪑'], bed: ['home', '🛏️'], lamp: ['home', '💡'], clock: ['home', '🕰️'], book: ['school', '📖'],
  key: ['home', '🔑'], plant: ['nature', '🪴'], mirror: ['home', '🪞'], pillow: ['home', '🛏️'], bicycle: ['transport', '🚲'], car: ['transport', '🚗'],
  tree: ['nature', '🌳'], flower: ['nature', '🌸'], bench: ['city', '🪑'], umbrella: ['travel', '☂️'], bus: ['transport', '🚌'], dog: ['animals', '🐕'],
  cat: ['animals', '🐈'], shoes: ['clothes', '👟'], backpack: ['school', '🎒'], glasses: ['clothes', '👓'], phone: ['tech', '📱'], laptop: ['tech', '💻'],
  hat: ['clothes', '👒'], watch: ['clothes', '⌚'], fork: ['kitchen', '🍴'], knife: ['kitchen', '🔪'], bowl: ['kitchen', '🥣'], glass: ['kitchen', '🥛'],
  orange: ['fruits', '🍊'], carrot: ['fruits', '🥕'], pizza: ['food', '🍕'], cake: ['food', '🍰'], sofa: ['home', '🛋️'], tv: ['tech', '📺'],
  mouse: ['tech', '🖱️'], keyboard: ['tech', '⌨️'], microwave: ['kitchen', '♨️'], fridge: ['kitchen', '🧊'], sink: ['kitchen', '🚰'], vase: ['home', '🏺'],
  scissors: ['school', '✂️'], toothbrush: ['home', '🪥'], bag: ['clothes', '👜'], suitcase: ['travel', '🧳'], ball: ['sports', '⚽'], bird: ['animals', '🐦'],
};

export type Label = { word: string; article?: string; roman?: string };

export type Concept = {
  id: string;
  place: Place;
  topic: Topic;
  /** emoji shown as a 3D illustration when there is no real photo */
  emoji: string;
  ipa: string; // English IPA
  labels: Record<LangCode, Label>;
  examples: Partial<Record<'en' | 'uk' | 'es' | 'de' | 'fr', string>>;
  related: string[]; // other concept ids
};

type Raw = [id: string, place: Place, ipa: string, labels: string, ex: string, related: string];

const RAW: Raw[] = [
  ['window', 'home', '/ˈwɪndoʊ/',
    'window;вікно;ventana|la;janela|a;Fenster|das;fenêtre|la;finestra|la;okno;pencere;窗户||chuānghu;窓||mado;창문||changmun;نافذة||nāfidha;खिड़की||khiṛkī;jendela;cửa sổ',
    'Open the window, please.|Відчини вікно, будь ласка.|Abre la ventana, por favor.|Mach bitte das Fenster auf.|Ouvre la fenêtre, s’il te plaît.',
    'door,plant,lamp'],
  ['door', 'home', '/dɔːr/',
    'door;двері;puerta|la;porta|a;Tür|die;porte|la;porta|la;drzwi;kapı;门||mén;ドア||doa;문||mun;باب||bāb;दरवाज़ा||darvāzā;pintu;cửa',
    'Close the door behind you.|Зачини за собою двері.|Cierra la puerta detrás de ti.|Mach die Tür hinter dir zu.|Ferme la porte derrière toi.',
    'window,key'],
  ['cup', 'kitchen', '/kʌp/',
    'cup;чашка;taza|la;xícara|a;Tasse|die;tasse|la;tazza|la;filiżanka;fincan;杯子||bēizi;カップ||kappu;컵||keop;كوب||kūb;प्याला||pyālā;cangkir;cốc',
    'I drink tea from a big cup.|Я п’ю чай з великої чашки.|Bebo té en una taza grande.|Ich trinke Tee aus einer großen Tasse.|Je bois du thé dans une grande tasse.',
    'coffee,teapot,plate'],
  ['plate', 'kitchen', '/pleɪt/',
    'plate;тарілка;plato|el;prato|o;Teller|der;assiette|l’;piatto|il;talerz;tabak;盘子||pánzi;皿||sara;접시||jeopsi;صحن||ṣaḥn;थाली||thālī;piring;đĩa',
    'Put the plate on the table.|Постав тарілку на стіл.|Pon el plato en la mesa.|Stell den Teller auf den Tisch.|Mets l’assiette sur la table.',
    'spoon,cup,table'],
  ['spoon', 'kitchen', '/spuːn/',
    'spoon;ложка;cuchara|la;colher|a;Löffel|der;cuillère|la;cucchiaio|il;łyżka;kaşık;勺子||sháozi;スプーン||supūn;숟가락||sutgarak;ملعقة||milʿaqa;चम्मच||cammac;sendok;thìa',
    'I need a spoon for the soup.|Мені потрібна ложка для супу.|Necesito una cuchara para la sopa.|Ich brauche einen Löffel für die Suppe.|J’ai besoin d’une cuillère pour la soupe.',
    'plate,cup'],
  ['bread', 'kitchen', '/brɛd/',
    'bread;хліб;pan|el;pão|o;Brot|das;pain|le;pane|il;chleb;ekmek;面包||miànbāo;パン||pan;빵||ppang;خبز||khubz;रोटी||roṭī;roti;bánh mì',
    'The bread is still warm.|Хліб ще теплий.|El pan todavía está caliente.|Das Brot ist noch warm.|Le pain est encore chaud.',
    'egg,coffee'],
  ['apple', 'kitchen', '/ˈæpəl/',
    'apple;яблуко;manzana|la;maçã|a;Apfel|der;pomme|la;mela|la;jabłko;elma;苹果||píngguǒ;りんご||ringo;사과||sagwa;تفاحة||tuffāḥa;सेब||seb;apel;táo',
    'This apple is very sweet.|Це яблуко дуже солодке.|Esta manzana es muy dulce.|Dieser Apfel ist sehr süß.|Cette pomme est très sucrée.',
    'banana,bread'],
  ['banana', 'kitchen', '/bəˈnænə/',
    'banana;банан;plátano|el;banana|a;Banane|die;banane|la;banana|la;banan;muz;香蕉||xiāngjiāo;バナナ||banana;바나나||banana;موزة||mawza;केला||kelā;pisang;chuối',
    'I eat a banana every morning.|Я їм банан щоранку.|Como un plátano cada mañana.|Ich esse jeden Morgen eine Banane.|Je mange une banane chaque matin.',
    'apple'],
  ['egg', 'kitchen', '/ɛɡ/',
    'egg;яйце;huevo|el;ovo|o;Ei|das;œuf|l’;uovo|l’;jajko;yumurta;鸡蛋||jīdàn;卵||tamago;달걀||dalgyal;بيضة||bayḍa;अंडा||aṇḍā;telur;trứng',
    'I would like a boiled egg.|Я б хотів варене яйце.|Quiero un huevo cocido.|Ich hätte gern ein gekochtes Ei.|Je voudrais un œuf dur.',
    'bread,plate'],
  ['teapot', 'kitchen', '/ˈtiːpɒt/',
    'teapot;чайник;tetera|la;bule|o;Teekanne|die;théière|la;teiera|la;czajniczek;demlik;茶壶||cháhú;急須||kyūsu;찻주전자||chatjujeonja;إبريق شاي||ibrīq shāy;केतली||ketlī;teko;ấm trà',
    'The teapot is on the shelf.|Чайник стоїть на полиці.|La tetera está en la estantería.|Die Teekanne steht im Regal.|La théière est sur l’étagère.',
    'cup,coffee'],
  ['bottle', 'kitchen', '/ˈbɒtəl/',
    'bottle;пляшка;botella|la;garrafa|a;Flasche|die;bouteille|la;bottiglia|la;butelka;şişe;瓶子||píngzi;瓶||bin;병||byeong;زجاجة||zujāja;बोतल||botal;botol;chai',
    'Take a bottle of water with you.|Візьми з собою пляшку води.|Lleva una botella de agua.|Nimm eine Flasche Wasser mit.|Prends une bouteille d’eau.',
    'cup,backpack'],
  ['coffee', 'kitchen', '/ˈkɒfi/',
    'coffee;кава;café|el;café|o;Kaffee|der;café|le;caffè|il;kawa;kahve;咖啡||kāfēi;コーヒー||kōhī;커피||keopi;قهوة||qahwa;कॉफ़ी||kŏfī;kopi;cà phê',
    'Let’s get a coffee together.|Ходімо разом на каву.|Vamos a tomar un café juntos.|Lass uns zusammen einen Kaffee trinken.|Allons prendre un café ensemble.',
    'cup,bread'],
  ['chair', 'home', '/tʃɛər/',
    'chair;стілець;silla|la;cadeira|a;Stuhl|der;chaise|la;sedia|la;krzesło;sandalye;椅子||yǐzi;椅子||isu;의자||uija;كرسي||kursī;कुर्सी||kursī;kursi;ghế',
    'Take a chair and sit down.|Візьми стілець і сідай.|Toma una silla y siéntate.|Nimm dir einen Stuhl und setz dich.|Prends une chaise et assieds-toi.',
    'table,lamp'],
  ['table', 'home', '/ˈteɪbəl/',
    'table;стіл;mesa|la;mesa|a;Tisch|der;table|la;tavolo|il;stół;masa;桌子||zhuōzi;テーブル||tēburu;테이블||teibeul;طاولة||ṭāwila;मेज़||mez;meja;bàn',
    'Dinner is on the table.|Вечеря на столі.|La cena está en la mesa.|Das Abendessen steht auf dem Tisch.|Le dîner est sur la table.',
    'chair,plate'],
  ['bed', 'home', '/bɛd/',
    'bed;ліжко;cama|la;cama|a;Bett|das;lit|le;letto|il;łóżko;yatak;床||chuáng;ベッド||beddo;침대||chimdae;سرير||sarīr;बिस्तर||bistar;tempat tidur;giường',
    'It’s late, time for bed.|Вже пізно, час спати.|Es tarde, hora de ir a la cama.|Es ist spät, ab ins Bett.|Il est tard, au lit.',
    'pillow,lamp'],
  ['lamp', 'home', '/læmp/',
    'lamp;лампа;lámpara|la;luminária|a;Lampe|die;lampe|la;lampada|la;lampa;lamba;台灯||táidēng;ランプ||ranpu;램프||raempeu;مصباح||miṣbāḥ;लैंप||laimp;lampu;đèn',
    'Turn on the lamp, it’s dark.|Увімкни лампу, темно.|Enciende la lámpara, está oscuro.|Mach die Lampe an, es ist dunkel.|Allume la lampe, il fait sombre.',
    'window,book'],
  ['clock', 'home', '/klɒk/',
    'clock;годинник;reloj|el;relógio|o;Uhr|die;horloge|l’;orologio|l’;zegar;saat;钟||zhōng;時計||tokei;시계||sigye;ساعة||sāʿa;घड़ी||ghaṛī;jam;đồng hồ',
    'The clock on the wall is slow.|Годинник на стіні відстає.|El reloj de la pared va atrasado.|Die Uhr an der Wand geht nach.|L’horloge au mur retarde.',
    'watch'],
  ['book', 'home', '/bʊk/',
    'book;книга;libro|el;livro|o;Buch|das;livre|le;libro|il;książka;kitap;书||shū;本||hon;책||chaek;كتاب||kitāb;किताब||kitāb;buku;sách',
    'I’m reading a good book.|Я читаю гарну книгу.|Estoy leyendo un buen libro.|Ich lese ein gutes Buch.|Je lis un bon livre.',
    'lamp,glasses'],
  ['key', 'home', '/kiː/',
    'key;ключ;llave|la;chave|a;Schlüssel|der;clé|la;chiave|la;klucz;anahtar;钥匙||yàoshi;鍵||kagi;열쇠||yeolsoe;مفتاح||miftāḥ;चाबी||cābī;kunci;chìa khóa',
    'I can’t find my key.|Я не можу знайти свій ключ.|No encuentro mi llave.|Ich finde meinen Schlüssel nicht.|Je ne trouve pas ma clé.',
    'door,backpack'],
  ['plant', 'home', '/plænt/',
    'plant;рослина;planta|la;planta|a;Pflanze|die;plante|la;pianta|la;roślina;bitki;植物||zhíwù;植物||shokubutsu;식물||sikmul;نبتة||nabta;पौधा||paudhā;tanaman;cây cảnh',
    'Don’t forget to water the plant.|Не забудь полити рослину.|No olvides regar la planta.|Vergiss nicht, die Pflanze zu gießen.|N’oublie pas d’arroser la plante.',
    'window,flower'],
  ['mirror', 'home', '/ˈmɪrər/',
    'mirror;дзеркало;espejo|el;espelho|o;Spiegel|der;miroir|le;specchio|lo;lustro;ayna;镜子||jìngzi;鏡||kagami;거울||geoul;مرآة||mirʾā;आईना||āīnā;cermin;gương',
    'Look in the mirror.|Подивись у дзеркало.|Mírate en el espejo.|Schau in den Spiegel.|Regarde-toi dans le miroir.',
    'lamp,door'],
  ['pillow', 'home', '/ˈpɪloʊ/',
    'pillow;подушка;almohada|la;travesseiro|o;Kissen|das;oreiller|l’;cuscino|il;poduszka;yastık;枕头||zhěntou;枕||makura;베개||begae;وسادة||wisāda;तकिया||takiyā;bantal;gối',
    'This pillow is very soft.|Ця подушка дуже м’яка.|Esta almohada es muy suave.|Dieses Kissen ist sehr weich.|Cet oreiller est très doux.',
    'bed'],
  ['bicycle', 'street', '/ˈbaɪsɪkəl/',
    'bicycle;велосипед;bicicleta|la;bicicleta|a;Fahrrad|das;vélo|le;bicicletta|la;rower;bisiklet;自行车||zìxíngchē;自転車||jitensha;자전거||jajeongeo;دراجة||darrāja;साइकिल||sāikil;sepeda;xe đạp',
    'I go to work by bicycle.|Я їжджу на роботу велосипедом.|Voy al trabajo en bicicleta.|Ich fahre mit dem Fahrrad zur Arbeit.|Je vais au travail à vélo.',
    'car,bus'],
  ['car', 'street', '/kɑːr/',
    'car;машина;coche|el;carro|o;Auto|das;voiture|la;macchina|la;samochód;araba;汽车||qìchē;車||kuruma;자동차||jadongcha;سيارة||sayyāra;गाड़ी||gāṛī;mobil;xe hơi',
    'The car is parked outside.|Машина стоїть надворі.|El coche está aparcado fuera.|Das Auto parkt draußen.|La voiture est garée dehors.',
    'bus,bicycle'],
  ['tree', 'street', '/triː/',
    'tree;дерево;árbol|el;árvore|a;Baum|der;arbre|l’;albero|l’;drzewo;ağaç;树||shù;木||ki;나무||namu;شجرة||shajara;पेड़||peṛ;pohon;cây',
    'Let’s sit under the tree.|Посидьмо під деревом.|Sentémonos bajo el árbol.|Setzen wir uns unter den Baum.|Asseyons-nous sous l’arbre.',
    'flower,bench'],
  ['flower', 'street', '/ˈflaʊər/',
    'flower;квітка;flor|la;flor|a;Blume|die;fleur|la;fiore|il;kwiat;çiçek;花||huā;花||hana;꽃||kkot;زهرة||zahra;फूल||phūl;bunga;hoa',
    'This flower smells wonderful.|Ця квітка чудово пахне.|Esta flor huele de maravilla.|Diese Blume duftet wunderbar.|Cette fleur sent merveilleusement bon.',
    'tree,plant'],
  ['bench', 'street', '/bɛntʃ/',
    'bench;лавка;banco|el;banco|o;Bank|die;banc|le;panchina|la;ławka;bank;长椅||chángyǐ;ベンチ||benchi;벤치||benchi;مقعد||maqʿad;बेंच||beṃc;bangku;ghế đá',
    'We met on a bench in the park.|Ми зустрілися на лавці в парку.|Nos vimos en un banco del parque.|Wir trafen uns auf einer Bank im Park.|On s’est vus sur un banc du parc.',
    'tree'],
  ['umbrella', 'street', '/ʌmˈbrɛlə/',
    'umbrella;парасолька;paraguas|el;guarda-chuva|o;Regenschirm|der;parapluie|le;ombrello|l’;parasol;şemsiye;雨伞||yǔsǎn;傘||kasa;우산||usan;مظلة||miẓalla;छाता||chātā;payung;ô',
    'Take an umbrella, it’s raining.|Візьми парасольку, йде дощ.|Lleva un paraguas, está lloviendo.|Nimm einen Regenschirm mit, es regnet.|Prends un parapluie, il pleut.',
    'hat'],
  ['bus', 'street', '/bʌs/',
    'bus;автобус;autobús|el;ônibus|o;Bus|der;bus|le;autobus|l’;autobus;otobüs;公交车||gōngjiāochē;バス||basu;버스||beoseu;حافلة||ḥāfila;बस||bas;bus;xe buýt',
    'The bus comes every ten minutes.|Автобус ходить кожні десять хвилин.|El autobús pasa cada diez minutos.|Der Bus kommt alle zehn Minuten.|Le bus passe toutes les dix minutes.',
    'car,bicycle'],
  ['dog', 'street', '/dɒɡ/',
    'dog;собака;perro|el;cachorro|o;Hund|der;chien|le;cane|il;pies;köpek;狗||gǒu;犬||inu;개||gae;كلب||kalb;कुत्ता||kuttā;anjing;chó',
    'My dog loves long walks.|Мій собака любить довгі прогулянки.|A mi perro le encantan los paseos largos.|Mein Hund liebt lange Spaziergänge.|Mon chien adore les longues promenades.',
    'cat'],
  ['cat', 'home', '/kæt/',
    'cat;кіт;gato|el;gato|o;Katze|die;chat|le;gatto|il;kot;kedi;猫||māo;猫||neko;고양이||goyangi;قطة||qiṭṭa;बिल्ली||billī;kucing;mèo',
    'The cat is sleeping on the sofa.|Кіт спить на дивані.|El gato duerme en el sofá.|Die Katze schläft auf dem Sofa.|Le chat dort sur le canapé.',
    'dog,pillow'],
  ['shoes', 'personal', '/ʃuːz/',
    'shoes;взуття;zapatos|los;sapatos|os;Schuhe|die;chaussures|les;scarpe|le;buty;ayakkabı;鞋子||xiézi;靴||kutsu;신발||sinbal;حذاء||ḥidhāʾ;जूते||jūte;sepatu;giày',
    'Take off your shoes, please.|Зніми взуття, будь ласка.|Quítate los zapatos, por favor.|Zieh bitte die Schuhe aus.|Enlève tes chaussures, s’il te plaît.',
    'hat,backpack'],
  ['backpack', 'personal', '/ˈbækpæk/',
    'backpack;рюкзак;mochila|la;mochila|a;Rucksack|der;sac à dos|le;zaino|lo;plecak;sırt çantası;背包||bēibāo;リュック||ryukku;배낭||baenang;حقيبة ظهر||ḥaqībat ẓahr;बस्ता||bastā;ransel;ba lô',
    'My laptop is in the backpack.|Мій ноутбук у рюкзаку.|Mi portátil está en la mochila.|Mein Laptop ist im Rucksack.|Mon ordinateur est dans le sac à dos.',
    'laptop,bottle'],
  ['glasses', 'personal', '/ˈɡlæsɪz/',
    'glasses;окуляри;gafas|las;óculos|os;Brille|die;lunettes|les;occhiali|gli;okulary;gözlük;眼镜||yǎnjìng;眼鏡||megane;안경||angyeong;نظارة||naẓẓāra;चश्मा||caśmā;kacamata;kính',
    'I can’t read without my glasses.|Я не можу читати без окулярів.|No puedo leer sin mis gafas.|Ohne Brille kann ich nicht lesen.|Je ne peux pas lire sans mes lunettes.',
    'book'],
  ['phone', 'personal', '/foʊn/',
    'phone;телефон;teléfono|el;celular|o;Handy|das;téléphone|le;telefono|il;telefon;telefon;手机||shǒujī;スマホ||sumaho;휴대폰||hyudaepon;هاتف||hātif;फ़ोन||fon;ponsel;điện thoại',
    'My phone battery is low.|У мого телефона сідає батарея.|Mi teléfono tiene poca batería.|Mein Handy-Akku ist fast leer.|Mon téléphone n’a plus de batterie.',
    'laptop,watch'],
  ['laptop', 'personal', '/ˈlæptɒp/',
    'laptop;ноутбук;portátil|el;notebook|o;Laptop|der;ordinateur portable|l’;portatile|il;laptop;dizüstü bilgisayar;笔记本电脑||bǐjìběn diànnǎo;ノートパソコン||nōto pasokon;노트북||noteubuk;حاسوب محمول||ḥāsūb maḥmūl;लैपटॉप||laipṭŏp;laptop;máy tính xách tay',
    'I work on my laptop at home.|Я працюю на ноутбуці вдома.|Trabajo con mi portátil en casa.|Ich arbeite zu Hause am Laptop.|Je travaille sur mon ordinateur à la maison.',
    'phone,backpack'],
  ['hat', 'personal', '/hæt/',
    'hat;капелюх;sombrero|el;chapéu|o;Hut|der;chapeau|le;cappello|il;kapelusz;şapka;帽子||màozi;帽子||bōshi;모자||moja;قبعة||qubbaʿa;टोपी||ṭopī;topi;mũ',
    'Wear a hat, the sun is strong.|Одягни капелюх, сонце пече.|Ponte un sombrero, el sol es fuerte.|Setz einen Hut auf, die Sonne ist stark.|Mets un chapeau, le soleil tape.',
    'umbrella,glasses'],
  ['watch', 'personal', '/wɒtʃ/',
    'watch;наручний годинник;reloj de pulsera|el;relógio de pulso|o;Armbanduhr|die;montre|la;orologio da polso|l’;zegarek;kol saati;手表||shǒubiǎo;腕時計||udedokei;손목시계||sonmoksigye;ساعة يد||sāʿat yad;कलाई घड़ी||kalāī ghaṛī;jam tangan;đồng hồ đeo tay',
    'What time is it on your watch?|Котра година на твоєму годиннику?|¿Qué hora marca tu reloj?|Wie spät ist es auf deiner Uhr?|Quelle heure est-il à ta montre ?',
    'clock,phone'],
  ['fork', 'kitchen', '/fɔːrk/',
    'fork;виделка;tenedor|el;garfo|o;Gabel|die;fourchette|la;forchetta|la;widelec;çatal;叉子||chāzi;フォーク||fōku;포크||pokeu;شوكة||shawka;काँटा||kā̃ṭā;garpu;nĩa',
    'Can I have a fork, please?|Можна мені виделку?|¿Me das un tenedor, por favor?|Kann ich bitte eine Gabel haben?|Je peux avoir une fourchette, s’il te plaît ?',
    'knife,spoon,plate'],
  ['knife', 'kitchen', '/naɪf/',
    'knife;ніж;cuchillo|el;faca|a;Messer|das;couteau|le;coltello|il;nóż;bıçak;刀||dāo;ナイフ||naifu;칼||kal;سكين||sikkīn;चाकू||cākū;pisau;dao',
    'Be careful, the knife is sharp.|Обережно, ніж гострий.|Cuidado, el cuchillo está afilado.|Vorsicht, das Messer ist scharf.|Attention, le couteau est coupant.',
    'fork,bread'],
  ['bowl', 'kitchen', '/boʊl/',
    'bowl;миска;cuenco|el;tigela|a;Schüssel|die;bol|le;ciotola|la;miska;kase;碗||wǎn;お椀||owan;그릇||geureut;وعاء||wiʿāʾ;कटोरा||kaṭorā;mangkuk;bát',
    'Put the salad in a bowl.|Поклади салат у миску.|Pon la ensalada en un cuenco.|Tu den Salat in eine Schüssel.|Mets la salade dans un bol.',
    'spoon,plate'],
  ['glass', 'kitchen', '/ɡlæs/',
    'glass;склянка;vaso|el;copo|o;Glas|das;verre|le;bicchiere|il;szklanka;bardak;玻璃杯||bōlibēi;コップ||koppu;유리잔||yurijan;كأس||kaʾs;गिलास||gilās;gelas;ly',
    'A glass of water, please.|Склянку води, будь ласка.|Un vaso de agua, por favor.|Ein Glas Wasser, bitte.|Un verre d’eau, s’il vous plaît.',
    'bottle,cup'],
  ['orange', 'kitchen', '/ˈɒrɪndʒ/',
    'orange;апельсин;naranja|la;laranja|a;Orange|die;orange|l’;arancia|l’;pomarańcza;portakal;橙子||chéngzi;オレンジ||orenji;오렌지||orenji;برتقالة||burtuqāla;संतरा||santarā;jeruk;cam',
    'I peeled an orange for you.|Я почистив тобі апельсин.|Te pelé una naranja.|Ich habe dir eine Orange geschält.|Je t’ai épluché une orange.',
    'apple,banana'],
  ['carrot', 'kitchen', '/ˈkærət/',
    'carrot;морква;zanahoria|la;cenoura|a;Karotte|die;carotte|la;carota|la;marchewka;havuç;胡萝卜||húluóbo;にんじん||ninjin;당근||danggeun;جزرة||jazara;गाजर||gājar;wortel;cà rốt',
    'Add a carrot to the soup.|Додай моркву в суп.|Añade una zanahoria a la sopa.|Gib eine Karotte in die Suppe.|Ajoute une carotte à la soupe.',
    'orange,knife'],
  ['pizza', 'kitchen', '/ˈpiːtsə/',
    'pizza;піца;pizza|la;pizza|a;Pizza|die;pizza|la;pizza|la;pizza;pizza;披萨||pīsà;ピザ||piza;피자||pija;بيتزا||bītzā;पिज़्ज़ा||pizzā;pizza;bánh pizza',
    'Let’s order a pizza tonight.|Замовмо сьогодні піцу.|Pidamos una pizza esta noche.|Lass uns heute Abend Pizza bestellen.|Commandons une pizza ce soir.',
    'plate,knife'],
  ['cake', 'kitchen', '/keɪk/',
    'cake;торт;pastel|el;bolo|o;Kuchen|der;gâteau|le;torta|la;tort;pasta;蛋糕||dàngāo;ケーキ||kēki;케이크||keikeu;كعكة||kaʿka;केक||kek;kue;bánh ngọt',
    'I baked a cake for your birthday.|Я спекла торт на твій день народження.|Hice un pastel para tu cumpleaños.|Ich habe einen Kuchen zu deinem Geburtstag gebacken.|J’ai fait un gâteau pour ton anniversaire.',
    'plate,coffee'],
  ['sofa', 'home', '/ˈsoʊfə/',
    'sofa;диван;sofá|el;sofá|o;Sofa|das;canapé|le;divano|il;kanapa;kanepe;沙发||shāfā;ソファ||sofa;소파||sopa;أريكة||arīka;सोफ़ा||sofā;sofa;ghế sofa',
    'Let’s watch a film on the sofa.|Подивімося фільм на дивані.|Veamos una película en el sofá.|Lass uns auf dem Sofa einen Film schauen.|Regardons un film sur le canapé.',
    'pillow,tv,cat'],
  ['tv', 'home', '/ˌtiːˈviː/',
    'TV;телевізор;televisor|el;televisão|a;Fernseher|der;télévision|la;televisore|il;telewizor;televizyon;电视||diànshì;テレビ||terebi;텔레비전||tellebijeon;تلفاز||tilfāz;टीवी||ṭīvī;televisi;tivi',
    'Turn off the TV, please.|Вимкни телевізор, будь ласка.|Apaga el televisor, por favor.|Mach bitte den Fernseher aus.|Éteins la télévision, s’il te plaît.',
    'sofa,lamp'],
  ['mouse', 'personal', '/maʊs/',
    'mouse;мишка;ratón|el;mouse|o;Maus|die;souris|la;mouse|il;myszka;fare;鼠标||shǔbiāo;マウス||mausu;마우스||mauseu;فأرة||faʾra;माउस||māus;tetikus;chuột máy tính',
    'My mouse stopped working.|Моя мишка перестала працювати.|Mi ratón dejó de funcionar.|Meine Maus funktioniert nicht mehr.|Ma souris ne marche plus.',
    'keyboard,laptop'],
  ['keyboard', 'personal', '/ˈkiːbɔːrd/',
    'keyboard;клавіатура;teclado|el;teclado|o;Tastatur|die;clavier|le;tastiera|la;klawiatura;klavye;键盘||jiànpán;キーボード||kībōdo;키보드||kibodeu;لوحة مفاتيح||lawḥat mafātīḥ;कीबोर्ड||kībord;papan ketik;bàn phím',
    'This keyboard is very quiet.|Ця клавіатура дуже тиха.|Este teclado es muy silencioso.|Diese Tastatur ist sehr leise.|Ce clavier est très silencieux.',
    'mouse,laptop'],
  ['microwave', 'kitchen', '/ˈmaɪkrəweɪv/',
    'microwave;мікрохвильовка;microondas|el;micro-ondas|o;Mikrowelle|die;micro-ondes|le;microonde|il;mikrofalówka;mikrodalga;微波炉||wēibōlú;電子レンジ||denshi renji;전자레인지||jeonjareinji;ميكروويف||mīkrūwayf;माइक्रोवेव||māikrovev;microwave;lò vi sóng',
    'Heat the soup in the microwave.|Розігрій суп у мікрохвильовці.|Calienta la sopa en el microondas.|Wärm die Suppe in der Mikrowelle auf.|Réchauffe la soupe au micro-ondes.',
    'fridge,bowl'],
  ['fridge', 'kitchen', '/frɪdʒ/',
    'fridge;холодильник;nevera|la;geladeira|a;Kühlschrank|der;frigo|le;frigorifero|il;lodówka;buzdolabı;冰箱||bīngxiāng;冷蔵庫||reizōko;냉장고||naengjanggo;ثلاجة||thallāja;फ्रिज||frij;kulkas;tủ lạnh',
    'The milk is in the fridge.|Молоко в холодильнику.|La leche está en la nevera.|Die Milch ist im Kühlschrank.|Le lait est dans le frigo.',
    'microwave,egg'],
  ['sink', 'kitchen', '/sɪŋk/',
    'sink;раковина;fregadero|el;pia|a;Spüle|die;évier|l’;lavandino|il;zlew;lavabo;水槽||shuǐcáo;シンク||shinku;싱크대||singkeudae;مغسلة||maghsala;सिंक||siṅk;wastafel;bồn rửa',
    'Leave the dishes in the sink.|Залиш посуд у раковині.|Deja los platos en el fregadero.|Lass das Geschirr in der Spüle.|Laisse la vaisselle dans l’évier.',
    'plate,cup'],
  ['vase', 'home', '/veɪs/',
    'vase;ваза;jarrón|el;vaso|o;Vase|die;vase|le;vaso|il;wazon;vazo;花瓶||huāpíng;花瓶||kabin;꽃병||kkotbyeong;مزهرية||mazhariyya;फूलदान||phūldān;vas bunga;bình hoa',
    'Put the flowers in a vase.|Постав квіти у вазу.|Pon las flores en un jarrón.|Stell die Blumen in eine Vase.|Mets les fleurs dans un vase.',
    'flower,table'],
  ['scissors', 'home', '/ˈsɪzərz/',
    'scissors;ножиці;tijeras|las;tesoura|a;Schere|die;ciseaux|les;forbici|le;nożyczki;makas;剪刀||jiǎndāo;はさみ||hasami;가위||gawi;مقص||miqaṣṣ;कैंची||kaiñcī;gunting;kéo',
    'Where are the scissors?|Де ножиці?|¿Dónde están las tijeras?|Wo ist die Schere?|Où sont les ciseaux ?',
    'book,table'],
  ['toothbrush', 'home', '/ˈtuːθbrʌʃ/',
    'toothbrush;зубна щітка;cepillo de dientes|el;escova de dentes|a;Zahnbürste|die;brosse à dents|la;spazzolino|lo;szczoteczka do zębów;diş fırçası;牙刷||yáshuā;歯ブラシ||haburashi;칫솔||chissol;فرشاة أسنان||furshāt asnān;टूथब्रश||ṭūthbraś;sikat gigi;bàn chải đánh răng',
    'Don’t forget your toothbrush.|Не забудь зубну щітку.|No olvides tu cepillo de dientes.|Vergiss deine Zahnbürste nicht.|N’oublie pas ta brosse à dents.',
    'mirror,sink'],
  ['bag', 'personal', '/bæɡ/',
    'bag;сумка;bolso|el;bolsa|a;Tasche|die;sac|le;borsa|la;torebka;çanta;包||bāo;かばん||kaban;가방||gabang;حقيبة||ḥaqība;थैला||thailā;tas;túi',
    'My keys are in my bag.|Мої ключі в сумці.|Mis llaves están en el bolso.|Meine Schlüssel sind in der Tasche.|Mes clés sont dans mon sac.',
    'key,phone,backpack'],
  ['suitcase', 'personal', '/ˈsuːtkeɪs/',
    'suitcase;валіза;maleta|la;mala|a;Koffer|der;valise|la;valigia|la;walizka;bavul;行李箱||xínglixiāng;スーツケース||sūtsukēsu;여행가방||yeohaenggabang;حقيبة سفر||ḥaqībat safar;सूटकेस||sūṭkes;koper;va li',
    'I packed my suitcase last night.|Я спакувала валізу вчора ввечері.|Hice la maleta anoche.|Ich habe gestern Abend meinen Koffer gepackt.|J’ai fait ma valise hier soir.',
    'backpack,shoes'],
  ['ball', 'street', '/bɔːl/',
    'ball;м’яч;pelota|la;bola|a;Ball|der;ballon|le;palla|la;piłka;top;球||qiú;ボール||bōru;공||gong;كرة||kura;गेंद||gend;bola;quả bóng',
    'Throw me the ball!|Кинь мені м’яч!|¡Pásame la pelota!|Wirf mir den Ball zu!|Lance-moi le ballon !',
    'dog,bench'],
  ['bird', 'street', '/bɜːrd/',
    'bird;птах;pájaro|el;pássaro|o;Vogel|der;oiseau|l’;uccello|l’;ptak;kuş;鸟||niǎo;鳥||tori;새||sae;طائر||ṭāʾir;चिड़िया||ciṛiyā;burung;chim',
    'A bird is singing outside.|Надворі співає птах.|Un pájaro canta afuera.|Draußen singt ein Vogel.|Un oiseau chante dehors.',
    'tree,cat'],
];

const parseLabels = (s: string): Record<LangCode, Label> => {
  const parts = s.split(';');
  const out = {} as Record<LangCode, Label>;
  ORDER.forEach((code, i) => {
    const [word, article, roman] = (parts[i] ?? '').split('|');
    out[code] = { word, article: article || undefined, roman: roman || undefined };
  });
  return out;
};

const BASE: Concept[] = RAW.map(([id, place, ipa, labels, ex, related]) => {
  const [en, uk, es, de, fr] = ex.split('|');
  const [topic, emoji] = BASE_META[id] ?? (['home', ''] as [Topic, string]);
  return { id, place, topic, emoji, ipa, labels: parseLabels(labels), examples: { en, uk, es, de, fr }, related: related.split(',').filter(Boolean) };
});

const baseIds = new Set(BASE.map((c) => c.id));
const EXTRA: Concept[] = WORDS.filter(([id]) => !baseIds.has(id)).map(([id, topic, emoji, ipa, labels, ex, related]) => {
  const [en, uk, es, de, fr] = ex.split('|');
  return {
    id, topic: topic as Topic, place: TOPIC_PLACE[topic as Topic] ?? 'home', emoji, ipa,
    labels: parseLabels(labels), examples: { en, uk, es, de, fr }, related: related.split(',').filter(Boolean),
  };
});

export const CONCEPTS: Concept[] = [...BASE, ...EXTRA];
const BY_ID = new Map(CONCEPTS.map((c) => [c.id, c]));
// keep "related" links valid
CONCEPTS.forEach((c) => { c.related = c.related.filter((r) => BY_ID.has(r) && r !== c.id); });

export const conceptById = (id: string) => BY_ID.get(id);
export const conceptsInTopic = (t: Topic) => CONCEPTS.filter((c) => c.topic === t);

export const labelOf = (id: string, code: LangCode) => conceptById(id)?.labels[code];

/** Word with its article, as learners should memorise it ("das Fenster", "la fenêtre"). */
export const fullWord = (id: string, code: LangCode) => {
  const l = labelOf(id, code);
  if (!l) return id;
  if (!l.article) return l.word;
  if (l.article.endsWith('’')) return `${l.article}${l.word}`;
  return `${l.article} ${l.word}`;
};

export const PLACES: Place[] = ['kitchen', 'home', 'street', 'personal'];
