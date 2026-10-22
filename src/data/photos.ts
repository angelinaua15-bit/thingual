/**
 * Real photos from Unsplash (free licence: https://unsplash.com/license).
 * Each entry: concept id, photo path, photographer, place label, lat, lng, author language.
 * Places are city level only (the app never stores exact coordinates).
 */
import { emojiUrl } from './emoji';
import { conceptById, TOPIC_EMOJI } from './concepts';
export type PhotoCredit = {
  id: string;
  concept: string;
  path: string;
  author: string;
  place?: string;
  lat?: number;
  lng?: number;
  lang?: string;
};

export const unsplash = (path: string, w = 800, h?: number) =>
  `https://images.unsplash.com/${path}?auto=format&fit=crop&w=${w}${h ? `&h=${h}` : ''}&q=75`;

type Row = [string, string, string, string?, number?, number?, string?];

const ROWS: Row[] = [
  // window (Daily Drop of the day — many places)
  ['window', 'photo-1527352774566-e4916e36c645', 'Nicolas Solerieu', 'San Luis Obispo, USA', 35.28, -120.66, 'en'],
  ['window', 'photo-1773635916213-23fd9a6c69cc', 'Ivett M', 'São Paulo, Brasil', -23.55, -46.63, 'pt'],
  ['window', 'photo-1509644851169-2acc08aa25b5', 'Rob Wingate', 'Leamington Spa, UK', 52.29, -1.54, 'en'],
  ['window', 'photo-1768942454665-43daa18bd262', 'moniek van rosse', 'Gothenburg, Sweden', 57.71, 11.97, 'en'],
  ['window', 'photo-1501045337096-542a73dafa4f', 'R Mo', 'Queenstown, New Zealand', -45.03, 168.66, 'en'],
  ['window', 'photo-1762957044542-583a86b753a3', 'Daniel J. Schwarz', 'Salzburg, Austria', 47.8, 13.04, 'de'],
  ['window', 'photo-1563693998336-93c10e5d8f91', 'Amel Majanovic', 'Wien, Österreich', 48.21, 16.37, 'de'],
  ['window', 'photo-1786625323565-8fdb43ef7aba', 'Alex Grejt', 'Giverny, France', 49.08, 1.53, 'fr'],
  ['window', 'photo-1543251698-10f13f004b0f', 'Annie Spratt', 'New Forest, UK', 50.87, -1.57, 'en'],
  ['window', 'photo-1775649136157-08fd098c269d', 'Ben Elliott', 'Sheffield, UK', 53.38, -1.47, 'en'],
  ['window', 'photo-1496092607007-ca127e0b6a10', 'Nathan Fertig', 'Phoenix, USA', 33.45, -112.07, 'en'],
  ['window', 'photo-1531876137992-22b6ce5221f1', 'Cosmic Timetraveler', 'Santorini, Greece', 36.39, 25.46, 'en'],
  ['window', 'photo-1613324061338-19d4528a5be9', 'Laura Cleffmann', 'Bochum, Deutschland', 51.48, 7.22, 'de'],
  ['window', 'photo-1551524163-d00af9f12253', 'Sebastian Staines', 'Cape Town, South Africa', -33.92, 18.42, 'en'],
  ['window', 'photo-1523191339508-68905a77d5e7', 'Gabriel Tenan'],
  // kitchen
  ['cup', 'photo-1570784332176-fdd73da66f03', 'Samantha Ram', 'Wellington, New Zealand', -41.29, 174.78, 'en'],
  ['cup', 'photo-1595434091143-b375ced5fe5c', 'L.D.I.A'],
  ['cup', 'photo-1533776992670-a72f4c28235e', 'Pablo Merchán Montes', 'Medellín, Colombia', 6.24, -75.58, 'es'],
  ['plate', 'photo-1587334207810-4915c4e40c67', 'Mockup Graphics'],
  ['plate', 'photo-1582379492269-199bcdc53cba', 'an_vision', 'Kaohsiung, Taiwan', 22.63, 120.3, 'zh'],
  ['plate', 'photo-1591632288574-a387f820a1ca', 'Mariana Beltrán', 'Bogotá, Colombia', 4.71, -74.07, 'es'],
  ['spoon', 'photo-1588867729565-b593e81f7357', 'Raul Angel', 'Guatemala City', 14.63, -90.51, 'es'],
  ['spoon', 'photo-1671414780994-e8721dccfa93', 'Zhang liven', 'Hangzhou, China', 30.27, 120.15, 'zh'],
  ['spoon', 'photo-1619367300933-376d8c5cd5f9', 'Anna Kumpan'],
  ['bread', 'photo-1509440159596-0249088772ff', 'Wesual Click', 'Graz, Österreich', 47.07, 15.44, 'de'],
  ['bread', 'photo-1598373182133-52452f7691ef', 'Charles Chen', 'Yunlin, Taiwan', 23.7, 120.43, 'zh'],
  ['bread', 'photo-1767065888377-e5ffb4e39645', 'Diego Arenas de Rodrigo', 'Lima, Perú', -12.05, -77.04, 'es'],
  ['apple', 'photo-1568702846914-96b305d2aaeb', 'an_vision', 'Kaohsiung, Taiwan', 22.62, 120.31, 'zh'],
  ['apple', 'photo-1630563451961-ac2ff27616ab', 'Tobi', 'Kuala Lumpur, Malaysia', 3.14, 101.69, 'id'],
  ['apple', 'photo-1619546813926-a78fa6372cd2', 'Amit Lahav', 'Tel Aviv', 32.08, 34.78, 'en'],
  ['banana', 'photo-1528825871115-3581a5387919', 'charlesdeluvio', 'Montréal, Canada', 45.5, -73.57, 'fr'],
  ['banana', 'photo-1587132137056-bfbf0166836e', 'Mockup Graphics'],
  ['banana', 'photo-1593280443077-ae46e0100ad1', 'Surendran MP', 'Kerala, India', 10.0, 76.3, 'hi'],
  ['egg', 'photo-1498654077810-12c21d4d6dc3', 'Jakub Kapusnak', 'Praha, Czechia', 50.08, 14.44, 'en'],
  ['egg', 'photo-1607690424560-35d967d6ad7c', 'Jasmin Egger', 'Zürich, Schweiz', 47.37, 8.54, 'de'],
  ['egg', 'photo-1691480158362-d958b907dc35', 'personalgraphic.com'],
  ['teapot', 'photo-1639428133787-b580d8c27f96', 'Maja Vujic'],
  ['teapot', 'photo-1683558654439-8b9986cbf1dd', 'AMAL MK'],
  ['teapot', 'photo-1629440400842-9108c0ccf336', 'jay huang'],
  ['bottle', 'photo-1602143407151-7111542de6e8', 'Joan Tran', 'Melbourne, Australia', -37.81, 144.96, 'en'],
  ['bottle', 'photo-1616118132534-381148898bb4', 'charlesdeluvio', 'Montréal, Canada', 45.51, -73.55, 'fr'],
  ['bottle', 'photo-1591704951890-0862b2e98acb', 'Bobby Donald'],
  ['coffee', 'photo-1509042239860-f550ce710b93', 'Nathan Dumlao', 'Los Angeles, USA', 34.05, -118.24, 'en'],
  ['coffee', 'photo-1511920170033-f8396924c348', 'Nathan Dumlao', 'Los Angeles, USA', 34.06, -118.25, 'en'],
  ['coffee', 'photo-1760175445000-0e01e193d1cd', 'nameless 3791'],
  // home
  ['chair', 'photo-1580480055273-228ff5388ef8', 'SCOPIC LTD'],
  ['chair', 'photo-1598300042247-d088f8ab3a91', 'Sam Moghadam', 'Tehran, Iran', 35.69, 51.39, 'en'],
  ['chair', 'photo-1549497538-303791108f95', 'Allec Gomes', 'Rio de Janeiro, Brasil', -22.91, -43.17, 'pt'],
  ['table', 'photo-1565791380713-1756b9a05343', 'Hannah Busing', 'Decatur, USA', 34.61, -86.98, 'en'],
  ['table', 'photo-1543936177-12e24c26776a', 'Suhyeon Choi', 'Seoul, South Korea', 37.57, 126.98, 'ko'],
  ['table', 'photo-1594125674956-61a9b49c8ecc', 'Yolk CoWorking', 'Kraków, Polska', 50.06, 19.94, 'pl'],
  ['door', 'photo-1546728682-0b16cf85b8de', 'Samuel McGarrigle', 'Derry, Northern Ireland', 55.0, -7.32, 'en'],
  ['door', 'photo-1779372371052-b2b3f32154c6', 'Jonathan Borba', 'Recife, Brasil', -8.05, -34.88, 'pt'],
  ['door', 'photo-1765201808749-40a5001f1c73', 'Bernhard', 'München, Deutschland', 48.14, 11.58, 'de'],
  ['bed', 'photo-1505693416388-ac5ce068fe85', 'Quilia', 'Las Vegas, USA', 36.17, -115.14, 'en'],
  ['bed', 'photo-1615874959474-d609969a20ed', 'Spacejoy', 'Santa Monica, USA', 34.02, -118.49, 'en'],
  ['bed', 'photo-1601276174812-63280a55656e', 'Liz Vo', 'San Francisco, USA', 37.77, -122.42, 'en'],
  ['lamp', 'photo-1507473885765-e6ed057f782c', 'Jonny Caspari', 'Berlin, Deutschland', 52.52, 13.4, 'de'],
  ['lamp', 'photo-1517991104123-1d56a6e81ed9', 'Joel Henry', 'Sydney, Australia', -33.87, 151.21, 'en'],
  ['lamp', 'photo-1621177555630-b861919c864f', 'Emilio Garcia', 'Madrid, España', 40.42, -3.7, 'es'],
  ['clock', 'photo-1541480601022-2308c0f02487', 'insung yoon', 'Gunsan, South Korea', 35.97, 126.74, 'ko'],
  ['clock', 'photo-1563861826100-9cb868fdbe1c', 'Ocean Ng'],
  ['clock', 'photo-1616198814651-e71f960c3180', 'Akram Huseyn', 'Baku, Azerbaijan', 40.41, 49.87, 'tr'],
  ['book', 'photo-1543002588-bfa74002ed7e', 'Studio Media', 'Vancouver, Canada', 49.28, -123.12, 'en'],
  ['book', 'photo-1513185041617-8ab03f83d6c5', 'Rey Seven', 'Mumbai, India', 19.08, 72.88, 'hi'],
  ['book', 'photo-1766250423719-4041f462bbb5', 'Jasmin Ne'],
  ['key', 'photo-1584985429926-08867327d3a6', 'Everyday basics', 'Wien, Österreich', 48.2, 16.36, 'de'],
  ['key', 'photo-1609770231080-e321deccc34c', 'Amol Tyagi', 'Frankfurt, Deutschland', 50.11, 8.68, 'de'],
  ['key', 'photo-1643804926339-e94f0a655185', 'Filip Szalbot'],
  ['plant', 'photo-1604762524889-3e2fcc145683', 'Annie Spratt', 'New Forest, UK', 50.86, -1.6, 'en'],
  ['plant', 'photo-1477554193778-9562c28588c0', 'Scott Webb', 'London, Canada', 42.98, -81.25, 'en'],
  ['plant', 'photo-1592150621744-aca64f48394a', 'vadim kaipov'],
  ['mirror', 'photo-1595455967759-5f1356993e53', 'Elena Kloppenburg', 'Milano, Italia', 45.46, 9.19, 'it'],
  ['mirror', 'photo-1585033120874-0300a04ded70', 'Roger Bradshaw', 'Bristol, UK', 51.45, -2.59, 'en'],
  ['mirror', 'photo-1617228206053-477863025d9c', 'Cat Han', 'Los Angeles, USA', 34.04, -118.26, 'en'],
  ['pillow', 'photo-1629949009765-40fc74c9ec21', 'Mediamodifier', 'Tallinn, Estonia', 59.44, 24.75, 'en'],
  ['pillow', 'photo-1584100936595-c0654b55a2e2', 'Jude Infantini', 'Lake Worth, USA', 26.62, -80.06, 'en'],
  ['pillow', 'photo-1600414428640-f78a67c2aa3b', 'the blowup', 'London, UK', 51.51, -0.13, 'en'],
  // street
  ['bicycle', 'photo-1532298229144-0ec0c57515c7', 'Mikkel Bech', 'Aarhus, Denmark', 56.16, 10.2, 'en'],
  ['bicycle', 'photo-1485965120184-e220f721d03e', 'Robert Bye'],
  ['bicycle', 'photo-1507035895480-2b3156c31fc8', 'Tiffany Nutt', 'Marquette, USA', 46.54, -87.4, 'en'],
  ['car', 'photo-1494976388531-d1058494cdd8', 'Joey Banks', 'Columbus, USA', 39.96, -83.0, 'en'],
  ['car', 'photo-1492144534655-ae79c964c9d7', 'Peter Broomfield', 'Baltimore, USA', 39.29, -76.61, 'en'],
  ['car', 'photo-1568605117036-5fe5e7bab0b7', 'Erik Mclean', "St. John's, Canada", 47.56, -52.71, 'en'],
  ['tree', 'photo-1502082553048-f009c37129b9', 'niko photos'],
  ['tree', 'photo-1777741444968-f01e42eb738b', 'Ruedi von Erlach', 'Langnau, Schweiz', 46.94, 7.79, 'de'],
  ['tree', 'photo-1774047194781-dc73a08e11a6', 'Everson Vansoski', 'Belo Horizonte, Brasil', -19.92, -43.94, 'pt'],
  ['flower', 'photo-1471899236350-e3016bf1e69e', 'Andrew Small', 'Brighton, UK', 50.82, -0.14, 'en'],
  ['flower', 'photo-1606041008023-472dfb5e530f', 'AARN GIRI', 'Jaipur, India', 26.91, 75.79, 'hi'],
  ['flower', 'photo-1525310072745-f49212b5ac6d', 'Han Chenxu', 'Shanghai, China', 31.23, 121.47, 'zh'],
  ['bench', 'photo-1573493334464-21388936965a', 'Metin Ozer', 'Reading, UK', 51.45, -0.97, 'en'],
  ['bench', 'photo-1445937888010-cc262f556033', 'Will Paterson'],
  ['bench', 'photo-1506899686410-4670690fccef', 'Aaron Burden', 'Baltimore, USA', 39.3, -76.62, 'en'],
  ['umbrella', 'photo-1514882651048-f09572b0233e', 'Anh Nguyen', 'Hà Nội, Việt Nam', 21.03, 105.85, 'vi'],
  ['umbrella', 'photo-1632973541997-971a2eb8331d', 'Jody Antonio'],
  ['umbrella', 'photo-1604560353366-28e44ad06afe', 'Maria Cappelli'],
  ['bus', 'photo-1569448096483-1114dddb646d', 'Valentyn Chernetskyi', 'Warszawa, Polska', 52.23, 21.01, 'pl'],
  ['bus', 'photo-1564694202883-46e7448c1b26', 'Teddy O'],
  ['bus', 'photo-1632276536839-84cad7fd03b0', 'Egor Litvinov'],
  ['dog', 'photo-1543466835-00a7907e9de1', 'Milli'],
  ['dog', 'photo-1561037404-61cd46aa615b', 'Victor G', 'Poznań, Polska', 52.41, 16.93, 'pl'],
  ['dog', 'photo-1530281700549-e82e7bf110d6', 'Oscar Sutton', 'Manchester, UK', 53.48, -2.24, 'en'],
  ['cat', 'photo-1514888286974-6c03e2ca1dba', 'Manja Vitolic', 'Wiesbaden, Deutschland', 50.08, 8.24, 'de'],
  ['cat', 'photo-1592194996308-7b43878e84a6', 'Alvan Nee', 'Shanghai, China', 31.22, 121.48, 'zh'],
  ['cat', 'photo-1574144611937-0df059b5ef3e', 'Loan'],
  // personal
  ['shoes', 'photo-1560769629-975ec94e6a86', 'Irene Kredenets'],
  ['shoes', 'photo-1656164753657-8ff832063a71', 'HamZa NOUASRIA', 'Rabat, Morocco', 34.02, -6.84, 'ar'],
  ['shoes', 'photo-1605523741177-cd660595c2cf', 'Ján Vlačuha', 'Bratislava, Slovakia', 48.15, 17.11, 'en'],
  ['backpack', 'photo-1553062407-98eeb64c6a62', 'Sun Lingyan', 'Beijing, China', 39.9, 116.4, 'zh'],
  ['backpack', 'photo-1622560480605-d83c853bc5c3', 'Wiser by the Mile', 'Chennai, India', 13.08, 80.27, 'hi'],
  ['backpack', 'photo-1622560480654-d96214fdc887', 'Wiser by the Mile'],
  ['glasses', 'photo-1614715838608-dd527c46231d', 'Jocelyn Morales', 'Ciudad de México', 19.43, -99.13, 'es'],
  ['glasses', 'photo-1556306510-31ca015374b0', 'Claudio Schwarz', 'Zürich, Schweiz', 47.38, 8.55, 'de'],
  ['glasses', 'photo-1591076482161-42ce6da69f67', 'Angus Gray', 'Lismore, Australia', -28.81, 153.28, 'en'],
  ['phone', 'photo-1511707171634-5f897ff02aa9', 'Rahul Chakraborty', 'Bengaluru, India', 12.97, 77.59, 'hi'],
  ['phone', 'photo-1580910051074-3eb694886505', 'Oscar Nord', 'Stockholm, Sweden', 59.33, 18.07, 'en'],
  ['phone', 'photo-1634403665481-74948d815f03', 'Matteo Vella', 'Falcade, Italia', 46.36, 11.87, 'it'],
  ['laptop', 'photo-1496181133206-80ce9b88a853', 'Kari Shea', 'Grand Rapids, USA', 42.96, -85.67, 'en'],
  ['laptop', 'photo-1541807084-5c52b6b3adef', 'Howard Bouchevereau', 'Lyon, France', 45.76, 4.84, 'fr'],
  ['laptop', 'photo-1531297484001-80022131f5a1', 'Ales Nesetril', 'Praha, Czechia', 50.09, 14.42, 'en'],
  ['hat', 'photo-1521369909029-2afed882baee', 'Yang Deng'],
  ['hat', 'photo-1595642527925-4d41cb781653', 'Michael C', 'Dundas, Canada', 43.27, -79.95, 'en'],
  ['hat', 'photo-1645266729222-17cd32e06fd0', 'sonu kumar'],
  ['watch', 'photo-1523170335258-f5ed11844a49', 'John Torcasio', 'Brisbane, Australia', -27.47, 153.03, 'en'],
  ['watch', 'photo-1542496658-e33a6d0d50f6', 'Fabian Heimann', 'Hamburg, Deutschland', 53.55, 9.99, 'de'],
  ['watch', 'photo-1620625515032-6ed0c1790c75', 'Yash Parashar'],
  // added for on-device detection classes
  ['fork', 'photo-1569702824812-351205c9cde5', 'Matt Popovich', 'Honolulu, HI'],
  ['fork', 'photo-1581652973557-5d04ba3cc54c', 'an_vision', 'Kaohsiung, Taiwan'],
  ['knife', 'photo-1614362705324-8da11fd16754', 'Marios Gkortsilas', 'Greece'],
  ['knife', 'photo-1593618229012-8aaad1cfefc3', 'Savernake Knives', 'Marlborough, UK'],
  ['bowl', 'photo-1510035618584-c442b241abe7', 'TAN Erica'],
  ['bowl', 'photo-1761830476467-0ff86dbcc75d', 'Liu T. Corriveau', 'Québec, Canada'],
  ['glass', 'photo-1548839140-29a749e1cf4d', 'KOBU Agency', 'Faro, Portugal'],
  ['glass', 'photo-1534616042650-80f5c9b61f09', 'manu schwendener', 'Basel'],
  ['orange', 'photo-1557800636-894a64c1696f', 'Mae Mu', 'Edmonton, Canada'],
  ['orange', 'photo-1547514701-42782101795e', 'Xiaolong Wong', 'Linyi, China'],
  ['carrot', 'photo-1598170845058-32b9d6a5da37', 'K8', 'Finland'],
  ['carrot', 'photo-1589927986089-35812388d1f4', 'Armando Arauz', 'Toronto, Canada'],
  ['pizza', 'photo-1513104890138-7c749659a591', 'Ivan Torres', 'Manila, Philippines'],
  ['pizza', 'photo-1574071318508-1cdbab80d002', 'Aurélien Lemasson-Théobald'],
  ['cake', 'photo-1588195538326-c5b1e9f80a1b', 'American Heritage Chocolate'],
  ['cake', 'photo-1621303837174-89787a7d4729', 'Katie Rosario', 'Los Angeles, USA'],
  ['sofa', 'photo-1555041469-a586c61ea9bc', 'Phillip Goldsberry', 'Phoenix, USA'],
  ['sofa', 'photo-1567016432779-094069958ea5', 'Inside Weather'],
  ['tv', 'photo-1509281373149-e957c6296406', 'Ajeet Mestry', 'Mumbai'],
  ['tv', 'photo-1567690187548-f07b1d7bf5a9', 'Dario', 'Bern'],
  ['mouse', 'photo-1527864550417-7fd91fc51a46', 'Oscar Ivan Esquivel Arteaga', 'Colombia'],
  ['mouse', 'photo-1527814050087-3793815479db', 'Frankie', 'Nevada, USA'],
  ['keyboard', 'photo-1587829741301-dc798b83add3', 'Clay Banks', 'New York'],
  ['keyboard', 'photo-1574012716378-0ca6f4c18c08', 'Alexander Sinn'],
  ['microwave', 'photo-1585659722983-3a675dabf23d', 'Erik Mclean', 'St. John\'s, Canada'],
  ['microwave', 'photo-1608384156808-418b5c079968', 'Vlad Zaytsev'],
  ['fridge', 'photo-1536353284924-9220c464e262', 'nrd', 'Colombia'],
  ['fridge', 'photo-1630459065645-549fe5a56db4', 'Erik Mclean', 'St. John\'s, Canada'],
  ['sink', 'photo-1609210884848-2d530cfb2a07', 'Callum Hill', 'New Zealand'],
  ['sink', 'photo-1775359924006-557dba8c862b', 'Franco Debartolo', 'Toronto, Canada'],
  ['vase', 'photo-1617111490936-07b47eafdcd4', 'Ananthu Selvam'],
  ['vase', 'photo-1584280768642-b471c02b218c', 'Rikonavt'],
  ['scissors', 'photo-1503792501406-2c40da09e1e2', 'Matt Artz', 'California, USA'],
  ['scissors', 'photo-1625249306438-f425af43ef59', 'Alex Gruber', 'Vienna'],
  ['toothbrush', 'photo-1520013573795-38516d2661e4', 'Alex Padurariu', 'Romania'],
  ['toothbrush', 'photo-1607613009820-a29f7bb81c04', 'The Humble Co.', 'Stockholm, Sweden'],
  ['bag', 'photo-1584917865442-de89df76afd3', 'Arno Senoner', 'Vienna'],
  ['bag', 'photo-1598532163257-ae3c6b2524b6', 'Irene Kredenets'],
  ['suitcase', 'photo-1670888664952-efff442ec0d2', 'American Green Travel', 'Los Angeles, USA'],
  ['suitcase', 'photo-1718702662411-11d9672eb179', 'my random photo'],
  ['ball', 'photo-1579952363873-27f3bade9f55', 'Connor Coyne', 'Boston, USA'],
  ['ball', 'photo-1575361204480-aadea25e6e68', 'Wesley Tingey', 'Las Vegas, USA'],
  ['bird', 'photo-1552728089-57bdde30beb3', 'Zdeněk Macháček', 'Czech Republic'],
  ['bird', 'photo-1555169062-013468b47731', 'Kevin Mueller', 'Germany'],
];

export const PHOTOS: PhotoCredit[] = ROWS.map(([concept, path, author, place, lat, lng, lang], i) => ({
  id: `p${i}`,
  concept,
  path,
  author,
  place,
  lat,
  lng,
  lang,
}));

export const photosFor = (concept: string) => PHOTOS.filter((p) => p.concept === concept);
/** Real photo when we have one, otherwise the 3D illustration of the word. */
/** Photo URL → illustration to show if the photo can't load (offline, blocked CDN). */
export const PHOTO_FALLBACK = new Map<string, string>();
export const coverFor = (concept: string, w = 600) => {
  const p = PHOTOS.find((x) => x.concept === concept);
  const c = conceptById(concept);
  const emoji = c ? emojiUrl(c.emoji || TOPIC_EMOJI[c.topic][1]) : undefined;
  if (p) {
    const url = unsplash(p.path, w);
    if (emoji) PHOTO_FALLBACK.set(url, emoji);
    return url;
  }
  return emoji;
};

/** Backgrounds for onboarding and empty states. */
export const SCENES = {
  street: unsplash('photo-1449824913935-59a10b8d2000', 1200),
  streetNY: unsplash('photo-1617121346253-43ef95179ac9', 1200),
  streetSeattle: unsplash('photo-1546636889-ba9fdd63583e', 1200),
  room: unsplash('photo-1622429420355-5677170f4fad', 1200),
  roomGdansk: unsplash('photo-1703783010857-9bd7a7b97c50', 1200),
  roomWarsaw: unsplash('photo-1741887845899-b837e46b4d7e', 1200),
  travel: unsplash('photo-1501785888041-af3ef285b470', 1200),
  travelMountains: unsplash('photo-1469474968028-56623f02e42e', 1200),
  travelLake: unsplash('photo-1476514525535-07fb3b4ae5f1', 1200),
};
