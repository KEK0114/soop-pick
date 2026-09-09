// 고정된 순위를 저장하고 짧은 주소를 내준다.
//
// 주소에 결과를 통째로 담으면 2만 자가 되기도 한다. 그건 사람이 주고받기에
// 너무 길다. 그래서 그 덩어리를 여기 저장하고, 이름표만 돌려준다.
//
// 이름표는 **내용으로 짓는다**(내용의 해시). 그래서 같은 결과를 두 번 저장해도
// 주소가 하나다 — 실수로 두 번 눌렀다고 링크가 둘로 갈리지 않는다.

import { put } from '@vercel/blob';
import { createHash } from 'node:crypto';

const MAX = 400 * 1024;          // 400KB. 82명 글이 25KB 였으니 넉넉하다.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('allow', 'POST');
    return res.status(405).json({ error: 'POST 로 보내 주세요.' });
  }

  const body = typeof req.body === 'string' ? req.body
             : Buffer.isBuffer(req.body) ? req.body.toString('utf8') : '';
  if (!body || body.length > MAX) {
    return res.status(413).json({ error: '내용이 없거나 너무 큽니다.' });
  }

  // 우리 화면이 만든 것인지만 확인한다. 남의 저장소로 쓰이지 않게.
  let obj;
  try { obj = JSON.parse(body); } catch { return res.status(400).json({ error: '읽을 수 없는 내용입니다.' }); }
  const ok = obj && obj.v === 1
    && typeof obj.b === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(obj.b)
    && /^[0-9]{1,20}$/.test(String(obj.o))
    && Array.isArray(obj.p) && obj.p.length > 0 && obj.p.length <= 5000;
  if (!ok) return res.status(400).json({ error: '이 화면이 만든 결과가 아닙니다.' });

  const id = createHash('sha256').update(body).digest('base64url').slice(0, 10);

  try {
    const blob = await put(`p/${id}.json`, body, {
      access: 'private',      // 지원서 전문이 들어간다. 공개 주소를 만들지 않는다.
      addRandomSuffix: false,
      allowOverwrite: true,          // 같은 내용이면 같은 이름이라 덮어써도 같은 것이다
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 31536000,  // 한 번 만든 결과는 안 바뀐다. 1년 캐시.
    });
    return res.status(200).json({ id });
  } catch (e) {
    return res.status(500).json({ error: '저장하지 못했습니다: ' + (e && e.message) });
  }
}
