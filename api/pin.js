// 저장해 둔 순위를 내준다. /p/<이름표> 화면이 이걸 부른다.
//
// 저장소를 Private 로 둔 이유: 여기 담기는 건 남의 지원서 전문이다.
// 공개 저장소면 그 파일이 인터넷에 그대로 노출된 주소를 갖는다. Private 이면
// 반드시 이 함수를 거쳐야 하고, 검색엔진에도 잡히지 않는다.

import { get } from '@vercel/blob';

export default async function handler(req, res) {
  const id = String(req.query.id || '');
  if (!/^[A-Za-z0-9_-]{4,64}$/.test(id)) {
    return res.status(400).json({ error: '이름표가 이상합니다.' });
  }

  try {
    const r = await get(`p/${id}.json`, { access: 'private' });
    if (!r || r.statusCode !== 200) {
      return res.status(404).json({ error: '이 순위를 찾지 못했습니다.' });
    }
    // 이름표가 곧 내용이라 한 번 만들어진 것은 절대 안 바뀐다. 마음껏 캐시한다.
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', 'private, max-age=31536000, immutable');
    const buf = Buffer.from(await new Response(r.stream).arrayBuffer());
    return res.status(200).send(buf);
  } catch (e) {
    return res.status(404).json({ error: '이 순위를 찾지 못했습니다.' });
  }
}
