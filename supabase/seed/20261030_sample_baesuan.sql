-- 배수안(baesuan) 카드에 미니 홈페이지 샘플을 켠다. 사진·가격은 본인이 메이커에서 채운다. 여러 번 실행해도 안전하다.
update public.pods
   set components_json = jsonb_set(components_json, '{card,page}', $j$
     {"on": true,
      "title": "성주참외 배수안네",
      "intro": "경북 성주에서 직접 농사지은 참외를 보내 드려요.\n아침에 딴 참외를 당일 포장해서, 받으시는 날 가장 맛있을 때 도착하게 합니다.\n\n선물용·가정용 모두 가능하고, 10kg 이상은 따로 문의 주세요.",
      "gallery": [],
      "items": [
        {"name": "참외 3kg (가정용)", "price": "문의", "note": "10~13개 · 흠집 있음"},
        {"name": "참외 5kg (선물용)", "price": "문의", "note": "15~18개 · 선물 포장"},
        {"name": "참외 10kg (업소·단체)", "price": "문의", "note": "수량 상담"}
      ],
      "news": [
        {"date": "2026-10-24", "title": "미니홈 열었어요", "text": "명함에서 바로 들어올 수 있는 소개 페이지를 열었습니다. 주문·문의는 아래 버튼으로 남겨 주세요."}
      ],
      "address": "경북 성주군",
      "mapUrl": "",
      "hours": "매일 8:00~19:00 (수확기)",
      "reviews": []}
   $j$::jsonb, true)
 where slug = 'baesuan';
