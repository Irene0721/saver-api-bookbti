// Vercel Serverless Function — 알라딘 API 프록시
// CORS 허용: 토스 미니앱 도메인

const https = require('https');

const ALLOWED_ORIGINS = [
  'https://book-mbti.apps.tossmini.com',
  'https://book-mbti.private-apps.tossmini.com',
  'http://localhost:3000',
];

const TTB_KEY = process.env.ALADIN_TTB_KEY; // Vercel 환경변수로 설정

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

module.exports = async (req, res) => {
  // CORS 헤더
  const origin = req.headers.origin || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (!TTB_KEY) { res.status(500).json({ error: 'TTB_KEY not configured' }); return; }

  const { type, isbn, query, queryType, categoryId, maxResults } = req.query;

  let apiUrl = '';

  if (type === 'lookup' && isbn) {
    // 개별 책 조회 (표지 이미지, 평점, 판매지수)
    apiUrl = `https://www.aladin.co.kr/ttb/api/ItemLookUp.aspx` +
      `?ttbkey=${TTB_KEY}&itemIdType=ISBN13&ItemId=${isbn}` +
      `&output=js&Cover=Big&Version=20131101`;

  } else if (type === 'search' && query) {
    // 책 검색 (취향 기반 추천용)
    apiUrl = `https://www.aladin.co.kr/ttb/api/ItemSearch.aspx` +
      `?ttbkey=${TTB_KEY}&Query=${encodeURIComponent(query)}` +
      `&QueryType=Keyword&MaxResults=${maxResults||10}` +
      `&SearchTarget=Book&output=js&Cover=Big&Version=20131101` +
      (categoryId ? `&CategoryId=${categoryId}` : '');

  } else if (type === 'list') {
    // 리스트 조회 (베스트셀러, 신간 등)
    apiUrl = `https://www.aladin.co.kr/ttb/api/ItemList.aspx` +
      `?ttbkey=${TTB_KEY}&QueryType=${queryType||'Bestseller'}` +
      `&MaxResults=${maxResults||10}&SearchTarget=Book` +
      `&output=js&Cover=Big&Version=20131101` +
      (categoryId ? `&CategoryId=${categoryId}` : '');

  } else {
    res.status(400).json({ error: 'Invalid type parameter' }); return;
  }

  try {
    let data = await httpsGet(apiUrl);
    // 알라딘 JS 응답에서 세미콜론 제거 후 JSON 파싱
    data = data.replace(/;$/, '').trim();
    const json = JSON.parse(data);
    res.status(200).json(json);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
