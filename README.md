## 🪟 Windows 에서 Claude Code 할 때 버그!

### Write & Update 가 안된다? 아래 프롬프트를 입력한다!
  - There's a file modification bug in Claude Code. The workaround is: always use complete absolute Windows paths
with drive letters and backslashes for ALL file operations. Apply this rule going forward, not just for this
file..

## 🪙 Solana 튜토리얼

### 에어드롭
- WEB: https://faucet.solana.com/ 접속하여 GitHib 로그인하고 지갑주소 입력
- CLI: solana airdrop 2 {지갑주소} --url https://api.devnet.solana.com

### 지갑 조회
- WEB: https://explorer.solana.com/address/{지갑주소}?cluster=devnet
- CLI: solana balance {지갑주소} --url https://api.devnet.solana.com

## 투두리스트
- 입금
- 출금
- 내부송금
- 보안구조(고도화 단계)
  - AES256 + KMS(로컬이면 간단히 AES key로)
  - MFA
  - 출금요청시 대기 상태 저장(withdrawal_queue)

## 궁금증
- usdt 도 입금, 출금, 내부송금 가능한지?
- jupiter api 는 무엇이고 왜 해야 해?
- SPL 토큰 형태라는 것이 정확히 무슨 말이야? 
- SPL 토큰 프로그램을 다뤄야 한다는 것이 무슨 뜻이야?
- USDT Mint 주소는 고정 값이야? Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
- 같은 서비스 내에서 사용자 간 송금이 왜 언체인 전송이 필요하지 않아? 사용자간 지갑 주소가 다 다른데?
  - private key 를 누가 관리하느냐가 관건..
  - 개인마다 지갑이 있고, 비밀키를 가지게 하느냐. 서비스 소수의 지갑을 관리하고 내부 장부로 사용자의 잔액을 관리하느냐..
  - 그렇다면 리닷페이같은 서비스를 만드려면 어떤 방향으로 해야 하지?
- solanaj 는 아직 완전한 spl 토큰 기능 지원이 부족하다면, java 사용을 추천하지 않는다는 말이야? 그렇다면 어떤 언어를 추천해?

