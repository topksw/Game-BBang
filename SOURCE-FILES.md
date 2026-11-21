# 소스 전달 안내

1. GitHub의 [`handoff/chatgpt` 브랜치](https://github.com/topksw/Game-BBang/tree/handoff/chatgpt)에서 **Code → Download ZIP**으로 전체 소스를 받습니다. 이 ZIP에 인계서와 원본 게임·테스트·워크플로가 함께 들어 있습니다. 인계 문서만 추가한 브랜치이므로 소스를 중복으로 커밋하지 않습니다.
2. ChatGPT에 ZIP을 첨부하고 [CHATGPT-REQUEST.md](CHATGPT-REQUEST.md) 내용을 붙여넣습니다. ZIP을 못 읽는 환경이면 [HANDOFF.md](HANDOFF.md), `RULES.md`, `index.html`, `style.css`, `engine.js`, `network.js`, `ui.js`, `artwork.js`, 테스트 및 워크플로를 개별 첨부합니다. 게임 실행에는 `peerjs.min.js`, 이미지/아이콘 등 의존 파일을 포함한 전체 ZIP을 사용하세요.
3. 소스만 비교할 때는 [운영 기준 스냅샷](https://github.com/topksw/Game-BBang/tree/7fb81ff7f2a4687cc0670405277fd7d100479119)을 이용하세요. `node_modules`, 브라우저 저장, 검사 개인 기록, 실행 중인 초대 URL, 로그·토큰·실제 손패는 넘기지 않습니다.
