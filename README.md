### Windows 에서 Claude Code 할 때 버그!
- CAN NOT WRITE AND UPDATE FILES!!
  - Prompt below!
  - There's a file modification bug in Claude Code. The workaround is: always use complete absolute Windows paths
with drive letters and backslashes for ALL file operations. Apply this rule going forward, not just for this
file..

### Solana 튜토리얼 (Web)

##### devnet 에서 airdrop 받기
- https://faucet.solana.com/

##### Solana devnet 지갑 조회하기
- https://explorer.solana.com/address/{지갑주소}?cluster=devnet

### Solana 튜토리얼 (CLI_

##### airdrop
- solana airdrop 2 GR4rXB7mzvz7LwoPxkcLDjtoaNmnAS3NwVz2xzNPbY35 --url https://api.devnet.solana.com

##### 지갑 조회
- solana balance GR4rXB7mzvz7LwoPxkcLDjtoaNmnAS3NwVz2xzNPbY35 --url https://api.devnet.solana.com
