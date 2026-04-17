// 네이버 Book Search API - 서버에서만 호출 (Client Secret 보호)
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { query, isbn, display = 10, start = 1 } = req.query;

  // ISBN으로 조회 or 키워드 검색
  const searchQuery = isbn ? isbn : (query || '');
  if (!searchQuery) {
    return res.status(400).json({ error: 'query or isbn required' });
  }

  const url = `https://openapi.naver.com/v1/search/book.json?query=${encodeURIComponent(searchQuery)}&display=${display}&start=${start}`;

  try {
    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': process.env.NAVER_CLIENT_SECRET,
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Naver API error', status: response.status });
    }

    const data = await response.json();

    // 응답 정규화
    const items = (data.items || []).map(item => ({
      title:       item.title.replace(/<[^>]*>/g, ''),
      author:      item.author.replace(/<[^>]*>/g, ''),
      publisher:   item.publisher,
      pubdate:     item.pubdate,
      isbn:        item.isbn,
      description: item.description.replace(/<[^>]*>/g, ''),
      image:       item.image,
      link:        item.link,
      discount:    item.discount,
    }));

    res.json({ total: data.total, items });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
