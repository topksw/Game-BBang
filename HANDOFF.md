# Game BBang 개발 인계

## 1. 기준 버전과 목표

- 저장소: [topksw/Game-BBang](https://github.com/topksw/Game-BBang). 운영: [게임](https://topksw.github.io/Game-BBang/) · [빌드 정보](https://topksw.github.io/Game-BBang/build.json). 미리보기: [/preview/](https://topksw.github.io/Game-BBang/preview/).
- 인계 기준은 운영 `1.0.0-beta.5.1`, [`7fb81ff`](https://github.com/topksw/Game-BBang/tree/7fb81ff7f2a4687cc0670405277fd7d100479119), [배포 CI](https://github.com/topksw/Game-BBang/actions/runs/44300928132). 운영 버전은 build.json을 우선 확인한다. README, TEST-REPORT, PUBLIC-VERIFICATION에 남은 배포 전 문구는 당시 기록이지 현재 상태가 아니다.
- 목표: 두 사람이 초대 링크로 접속해 무료로 즐기는 2인 맞고. 공개 저장소/웹페이지와 두 사람만 공유하는 게임방은 구분한다. 결제·현금·공개 매칭·계정·유료 인프라는 이번 범위 밖.
- 베타 5.1 미리보기의 실기기 항목을 모두 해봤고 문제없었다는 사용자 보고 뒤 베타 5.1을 운영에 게시했다. 개별 측정 기록은 이 인계에 포함하지 않는다. 이후 변경본에는 같은 검사가 다시 필요하다. 1.0 정식 표시는 별도 결정이다.

## 2. 코드 지도

| 파일 | 역할 |
| --- | --- |
| `index.html`, `ui.js`, `style.css` | 로비·초대·저장 안내, 게임 화면·선택·상세·효과, 모바일 레이아웃 |
| `engine.js`, `RULES.md` | 48장 카드·턴·점수·고/스톱·판 종료와 하우스룰 명세 |
| `network.js`, `peerjs.min.js` | PeerJS/WebRTC 초대, 연결·복구, 호스트 판 관리, 로컬 저장 |
| `artwork.js`, `gallery.html`, `GRAPHICS.md` | 자체 SVG 화투 원화·갤러리·디자인 설명 |
| `test-runner.cjs`, `tests*.js`, `tests*.html`, `e2e.cjs` | 단위/회귀·DOM·브라우저 포인터 검사 |
| `device-check.html`, `DEVICE-CHECKLIST.md` | 버전별 수동 실기기 검사·로컬 기록/JSON |
| `.github/workflows/verify.yml`, `build-site.cjs`, `RELEASE.md` | PR 검증, 게시 파일 허용 목록과 운영/미리보기 배포·롤백 |

## 3. 바꾸면 안 되는 계약

- `RULESET=bbang-basic-1`, `PROTOCOL=2`, `SAVE_FORMAT=2`는 앱 표시 버전과 별개다. 점수·룰 확대나 프로토콜/저장 형식 변경은 별도 요청과 마이그레이션 검증이 있을 때만 한다. 타이밍을 바꿀 때 카드 48장 보존, 차례·선택 단계, 중복 조작 방지, 다음 판 양쪽 준비를 확인한다.
- 방장 기기의 상태가 기준이다. 손님에게는 필요한 화면 상태만 보낸다. 방장이 앱을 완전히 종료해도 서버가 판을 이어주는 구조가 아니다. 같은 브라우저의 이어하기/최근 방, 최신 초대 링크로 복귀한다. 서로 다른 망 실패는 외부 서비스 상태, 기기 백그라운드 정책, 망 환경을 구분한다.
- 운영 `bbang-`와 미리보기 `bbang-preview-`를 분리한다. 이름에 v1이 들어있는 저장 키도 형식 번호와 별개다. 기존 마이그레이션·백업·이전 방 보관본과 실패 경고를 유지하고, 저장 전체 삭제를 해결책으로 제안하지 않는다. 실제 계정/방에서 검증하지 말고 별도 브라우저 프로필이나 합성 저장을 사용한다.
- 초대는 전체 링크를 같은 주소·범위에서 검증한다. 초대 비밀, 자리 정보, 실제 패, 사용자 저장 데이터는 로그·PR·스크린샷·ChatGPT에 올리지 않는다. 외부 서비스로 임의 전송하거나 검증을 우회하지 않는다.
- 320/390/760px와 카드 확대, 움직임 줄이기, 두 장 먹기 선택의 겹침 방지, 키보드 포커스, 실제 뒤로가기 취소를 회귀 검사한다. 강제 클릭으로 문제를 감추지 않는다.

## 4. 개발·검증

저장소 루트에서 Node.js 22 기준:

```sh
node test-runner.cjs
npm install --no-save --ignore-scripts --package-lock=false playwright@1.65.1
npx playwright install chromium webkit
node e2e.cjs
```

Linux에서 시스템 의존성이 없으면 Playwright 설치에 `--with-deps`를 쓰거나 CI에 고정된 이미지를 사용한다. 브라우저에서 직접 확인하려면 `npx --yes http-server . -a 127.0.0.1 -p 8080`으로 열고 로컬 `/`, `/tests.html`, `/tests-ui.html`을 방문한다. `e2e.cjs`는 자체 로컬 HTTP 서버를 띄운다.

기준은 규칙 65 + 연결/저장 35 + 원화 8 = 108개, UI 16개를 Chromium/WebKit 각각 기본/움직임 줄이기로 실행하고 실제 포인터 검사도 수행한다. UI 스위트의 가상 연결은 실제 PeerJS가 아니다. 작업본 두 탭 10판 기록과 공개 미리보기 초대/최근 방 재접속 확인도 별개다. 새 변경은 실제 두 탭, 그리고 실제 폰에서 Safari/카톡 링크, Wi-Fi·모바일 데이터, 잠금·앱 전환·저장 복구를 따로 검증한다. 못 한 검사는 미실시라고 적는다.

## 5. 보완 순서와 배포

1. 참가/재참가·저장 실패에서 사용자가 다음 행동을 바로 알 수 있는지 검토한다. 기존 판을 잃지 않는 복구를 우선한다.
2. 작은 화면에서 오조작과 선택/고·스톱 버튼 배치, 확대·대비·가독성을 점검한다.
3. 개선 한 건을 작은 diff로 구현하고 관련 회귀 테스트를 추가한다. 바뀐 파일·실행 결과·남은 실기기 검사를 요약한다.
4. 인계/작업 브랜치에서 작업한다. `staging` 푸시도 미리보기를 게시하고 `main` 푸시는 운영 공개에 영향을 준다. 명시 승인 없이 두 브랜치에 푸시·병합하거나 Actions 배포를 실행하지 않는다. 운영은 [RELEASE.md](RELEASE.md) 따로 확인, 안정판 복구가 필요하면 사용자 승인 후 검증된 전체 SHA로 진행한다.
