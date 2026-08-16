export interface RoadEponym {
  name: string
  summary: string
  url: string
  sourceLabel: string
}

interface RoadEponymRecord extends RoadEponym {
  roadNames: string[]
}

// This is deliberately curated rather than inferred from name-like words. Many
// concession-era streets were named after places, institutions, or people whose
// identity is ambiguous; only confirmed, useful matches belong here.
const roadEponymRecords: RoadEponymRecord[] = [
  {
    roadNames: ['Avenue Joffre'],
    name: 'Joseph Joffre',
    summary: '法国元帅，第一次世界大战初期的法军总司令；霞飞路以其姓氏命名。',
    url: 'https://en.wikipedia.org/wiki/Joseph_Joffre',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Avenue Foch'],
    name: 'Ferdinand Foch',
    summary: '法国元帅，第一次世界大战后期的协约国联军最高统帅。',
    url: 'https://en.wikipedia.org/wiki/Ferdinand_Foch',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Avenue Dubail'],
    name: 'Augustin Dubail',
    summary: '法国陆军将领，第一次世界大战期间曾指挥第一集团军，并任巴黎军事总督。',
    url: 'https://en.wikipedia.org/wiki/Auguste_Dubail',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Avenue Haig'],
    name: 'Douglas Haig',
    summary: '英国陆军元帅，1915—1918 年任英国远征军总司令。',
    url: 'https://en.wikipedia.org/wiki/Douglas_Haig,_1st_Earl_Haig',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Avenue Petain'],
    name: 'Philippe Pétain',
    summary: '法国元帅，以凡尔登战役闻名；第二次世界大战期间后来成为维希法国元首。',
    url: 'https://en.wikipedia.org/wiki/Philippe_P%C3%A9tain',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Avenue Edouard VII / Edward VII Road'],
    name: 'Edward VII',
    summary: '英国国王（1901—1910 年在位），维多利亚女王之子。',
    url: 'https://en.wikipedia.org/wiki/Edward_VII',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Avenue du Roi Albert'],
    name: 'Albert I of Belgium',
    summary: '比利时国王（1909—1934 年在位），第一次世界大战期间统率比利时军队。',
    url: 'https://en.wikipedia.org/wiki/Albert_I_of_Belgium',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Route Lafayette'],
    name: 'Gilbert du Motier, Marquis de Lafayette',
    summary: '法国军官与政治人物，参加过美国独立战争和法国大革命。',
    url: 'https://en.wikipedia.org/wiki/Gilbert_du_Motier,_Marquis_de_Lafayette',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Rue Marco Polo'],
    name: 'Marco Polo',
    summary: '威尼斯商人与旅行家，其亚洲旅行叙述在欧洲广为流传。',
    url: 'https://en.wikipedia.org/wiki/Marco_Polo',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Route Cardinal Mercier'],
    name: 'Désiré-Joseph Mercier',
    summary: '比利时天主教枢机及梅赫伦总主教，以第一次世界大战期间反对德军占领而闻名。',
    url: 'https://en.wikipedia.org/wiki/D%C3%A9sir%C3%A9-Joseph_Mercier',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Rue Paul Beau'],
    name: 'Paul Beau',
    summary: '法国外交官，曾任驻华公使及法属印度支那总督。',
    url: 'https://zh.wikipedia.org/wiki/%E9%B2%8D%E6%B8%A5',
    sourceLabel: 'Wikipedia · 中文',
  },
  {
    roadNames: ['Rue Baron Gros'],
    name: 'Jean-Baptiste-Louis Gros',
    summary: '法国外交官、参议员与早期摄影家，曾作为全权代表参与对华外交。',
    url: 'https://en.wikipedia.org/wiki/Jean-Baptiste-Louis_Gros',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Boulevard de Montigny'],
    name: 'Charles de Montigny',
    summary: '法国外交官、首任法国驻上海领事，并于 1849 年参与建立上海法租界。',
    url: 'https://en.wikipedia.org/wiki/Charles_de_Montigny',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Route Vallon'],
    name: 'René Vallon',
    summary: '法国早期飞行员，1911 年在江湾完成中国首次动力飞机飞行，后于上海坠机身亡。',
    url: 'https://en.wikipedia.org/wiki/Ren%C3%A9_Vallon',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Rue Massenet'],
    name: 'Jules Massenet',
    summary: '法国作曲家，以歌剧《曼侬》《维特》等作品闻名。',
    url: 'https://en.wikipedia.org/wiki/Jules_Massenet',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Gordon Road'],
    name: 'Charles George Gordon',
    summary: '英国陆军军官，曾在中国指挥常胜军与太平军作战，亦称“中国戈登”。',
    url: 'https://en.wikipedia.org/wiki/Charles_George_Gordon',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Hart Road'],
    name: 'Sir Robert Hart',
    summary: '英国籍官员，长期担任中国海关总税务司。',
    url: 'https://en.wikipedia.org/wiki/Sir_Robert_Hart,_1st_Baronet',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Seymour Road'],
    name: 'Edward Hobart Seymour',
    summary: '英国皇家海军元帅，曾任中国舰队司令，并在义和团运动期间率领西摩尔远征。',
    url: 'https://en.wikipedia.org/wiki/Edward_Seymour_(Royal_Navy_officer)',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Ward Road'],
    name: 'Frederick Townsend Ward',
    summary: '美国军人，常胜军的组织者与首任统领，曾在上海一带与太平军作战。',
    url: 'https://en.wikipedia.org/wiki/Frederick_Townsend_Ward',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Yates Road'],
    name: 'Matthew Tyson Yates',
    summary: '美国南方浸信会传教士，1847 年来到上海并长期在此传教与办学。',
    url: 'https://en.wikipedia.org/wiki/Matthew_Tyson_Yates',
    sourceLabel: 'Wikipedia · 英文',
  },
  {
    roadNames: ['Lincoln Avenue'],
    name: 'Abraham Lincoln',
    summary: '美国第 16 任总统，领导美国度过内战并推动废除奴隶制。',
    url: 'https://en.wikipedia.org/wiki/Abraham_Lincoln',
    sourceLabel: 'Wikipedia · 英文',
  },
]

const roadEponymIndex = new Map<string, RoadEponym>(
  roadEponymRecords.flatMap(({ roadNames, ...eponym }) =>
    roadNames.map((roadName) => [roadName, eponym] as const),
  ),
)

export function getRoadEponym(historicalName: string): RoadEponym | undefined {
  return roadEponymIndex.get(historicalName)
}

