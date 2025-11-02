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
